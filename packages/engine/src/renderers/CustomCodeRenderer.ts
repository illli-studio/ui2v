import { BaseRenderer } from './base/BaseRenderer';
import { RendererType, type IRenderer, type RendererConfig, type RendererCapabilities } from './base/IRenderer';
import type { TemplateLayer, RenderContext } from '../types';
import { LayerSDK, BaseLayer } from '../sdk/LayerSDK';
import { CodeSanitizer } from '../sandbox/CodeSanitizer';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {
    createEntrypointProbe,
    errorToDiagnostic,
    normalizeEntrypoint,
    prepareCustomCode,
    type CustomCodeDiagnostic,
    type CustomCodeRuntimeReport
} from '../sandbox/CustomCodeRuntime';

interface CustomCodeProperties {
    language?: string;
    code?: string;
    params?: Record<string, any>;
}

export class CustomCodeRenderer extends BaseRenderer implements IRenderer {
    readonly type = RendererType.Custom;
    readonly capabilities: RendererCapabilities = {
        supportedLayerTypes: ['custom-code'],
        supportsWebGL: true,
        supportsOffscreenCanvas: true,
        maxTextureSize: 0,
        supportsShaders: true,
        supportsBatchRendering: false
    };

    private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
    private libraries: Record<string, any> = {};
    private runningInstances: Map<string, any> = new Map();
    private runtimeReports: Map<string, CustomCodeRuntimeReport> = new Map();
    private assetBaseUrl?: string;
    private assetBaseDir?: string;

    constructor() {
        super();
    }

    private offscreenCanvas: OffscreenCanvas | null = null;
    private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
    private lastWidth = 0;
    private lastHeight = 0;

    private iconCache: Map<string, string> = new Map();
    private svgImageCache: Map<string, HTMLImageElement> = new Map();
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private assetCache: Map<string, any> = new Map();

    async initialize(config: RendererConfig): Promise<void> {
        await super.initialize(config);
        this.canvas = config.canvas;
        // @ts-ignore
        this.ctx = this.canvas.getContext('2d') as any;
        this.libraries = config.libraries || {};
        this.assetBaseUrl = config.assetBaseUrl;
        this.assetBaseDir = config.assetBaseDir;

        // Add roundRect polyfill if not supported
        this.addCanvasPolyfills();
        
        // Add D3.js v4/v5 compatibility layer for v7+
        this.addD3Polyfills();

        if (this.libraries['canvas2d']) {
            (this.libraries as any).canvas = this.libraries['canvas2d'];
            (this.libraries as any).context2d = this.libraries['canvas2d'];
        }
    }

    /**
     */
    private async loadIcon(iconName: string): Promise<string> {
        if (this.iconCache.has(iconName)) {
            return this.iconCache.get(iconName)!;
        }

        try {
            const [prefix, name] = iconName.split(':');
            if (!prefix || !name) {
                throw new Error(`Invalid icon name format: ${iconName}. Expected "prefix:name" (e.g., "mdi:home")`);
            }

            const response = await fetch(`https://api.iconify.design/${prefix}/${name}.svg`);
            if (!response.ok) {
                console.warn(`[CustomCodeRenderer] Icon not found: ${iconName} (${response.status}), using placeholder`);
                // Return a simple placeholder SVG so init() can continue and timeline still runs
                const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">?</text></svg>`;
                this.iconCache.set(iconName, placeholder);
                return placeholder;
            }

            const svgString = await response.text();
            this.iconCache.set(iconName, svgString);
            return svgString;
        } catch (error) {
            console.error(`[CustomCodeRenderer] Failed to load icon ${iconName}:`, error);
            // Return placeholder instead of throwing — a missing icon should not break the whole animation
            const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            this.iconCache.set(iconName, placeholder);
            return placeholder;
        }
    }

    /**
     */
    private async drawSVG(
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        svgString: string,
        x: number,
        y: number,
        width: number,
        height: number
    ): Promise<void> {
        try {
            const cacheKey = `${this.hashString(svgString)}_${width}_${height}`;

            let img = this.svgImageCache.get(cacheKey);

            if (!img) {
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);

                img = new Image();
                img.width = width;
                img.height = height;

                await new Promise<void>((resolve, reject) => {
                    img!.onload = () => resolve();
                    img!.onerror = () => reject(new Error('Failed to load SVG image'));
                    img!.src = url;
                });

                URL.revokeObjectURL(url);

                this.svgImageCache.set(cacheKey, img);
            }

            ctx.drawImage(img, x, y, width, height);
        } catch (error) {
            console.error('[CustomCodeRenderer] Failed to draw SVG:', error);
            throw error;
        }
    }

    private hashString(input: string): string {
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    }

    /**
     * Load image helper exposed to custom-code runtime as context.loadImage(src).
     * This keeps compatibility with AI-generated snippets that expect an async loader.
     */
    private async loadImage(src: string): Promise<HTMLImageElement> {
        if (!src || typeof src !== 'string') {
            throw new Error('loadImage requires a non-empty src string');
        }

        const resolvedSrc = resolveMediaUrl(src, this.assetBaseUrl, this.assetBaseDir);
        const cached = this.imageCache.get(resolvedSrc);
        if (cached) {
            // Return immediately if already loaded.
            if (cached.complete && cached.naturalWidth > 0) {
                return cached;
            }
            // Wait if the same image is still loading.
            await new Promise<void>((resolve, reject) => {
                cached.onload = () => resolve();
                cached.onerror = () => reject(new Error(`Failed to load image: ${resolvedSrc}`));
            });
            return cached;
        }

        const img = new Image();
        img.decoding = 'async';
        img.crossOrigin = 'anonymous';
        this.imageCache.set(resolvedSrc, img);

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => {
                this.imageCache.delete(resolvedSrc);
                reject(new Error(`Failed to load image: ${resolvedSrc}`));
            };
            img.src = resolvedSrc;
        });

        return img;
    }

    private createAssetAccessor(assetMap: Record<string, any>) {
        const get = (id: string) => this.resolveAsset(id, assetMap);
        return {
            map: assetMap,
            get,
            image: async (id: string) => {
                const asset = get(id);
                if (!asset?.src) {
                    throw new Error(`Runtime asset not found: ${id}`);
                }
                return this.loadImage(asset.src);
            },
            src: (id: string) => {
                const assetSrc = get(id)?.src;
                return typeof assetSrc === 'string' ? resolveMediaUrl(assetSrc, this.assetBaseUrl, this.assetBaseDir) : assetSrc;
            },
        };
    }

    private resolveAsset(id: string, assetMap?: Record<string, any>) {
        const map = assetMap ?? this.cachedCompatibleContext.assetMap ?? {};
        if (!id || typeof id !== 'string') {
            return undefined;
        }
        if (this.assetCache.has(id)) {
            return this.assetCache.get(id);
        }
        const asset = map[id];
        const normalized = typeof asset === 'string'
            ? { src: asset }
            : asset && typeof asset === 'object'
                ? asset
                : undefined;
        if (normalized?.src && typeof normalized.src === 'string') {
            normalized.src = resolveMediaUrl(normalized.src, this.assetBaseUrl, this.assetBaseDir);
        }
        if (normalized) {
            this.assetCache.set(id, normalized);
        }
        return normalized;
    }

    private addCanvasPolyfills() {
        // Enhanced polyfill for roundRect with better array handling
        const roundRectImpl = function (this: any, x: number, y: number, w: number, h: number, r: number | number[]) {
            // Normalize radius to always use first value if array is provided
            let radius: number;
            if (Array.isArray(r)) {
                // Use first non-zero value, or first value if all are zero
                radius = r.find(val => val > 0) || r[0] || 0;
                console.warn('[CustomCodeRenderer] roundRect received array parameter, using first value:', radius);
            } else {
                radius = r || 0;
            }

            // Clamp radius to valid range
            const maxRadius = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
            radius = Math.min(Math.abs(radius), maxRadius);

            this.beginPath();
            this.moveTo(x + radius, y);
            this.lineTo(x + w - radius, y);
            this.arcTo(x + w, y, x + w, y + radius, radius);
            this.lineTo(x + w, y + h - radius);
            this.arcTo(x + w, y + h, x + w - radius, y + h, radius);
            this.lineTo(x + radius, y + h);
            this.arcTo(x, y + h, x, y + h - radius, radius);
            this.lineTo(x, y + radius);
            this.arcTo(x, y, x + radius, y, radius);
            this.closePath();
            return this;
        };

        // Polyfill for ctx.close() -> ctx.closePath() (common AI-generated code mistake)
        const closeImpl = function (this: any) {
            return this.closePath();
        };

        // Add polyfill for CanvasRenderingContext2D
        if (typeof CanvasRenderingContext2D !== 'undefined') {
            if (!CanvasRenderingContext2D.prototype.roundRect) {
                CanvasRenderingContext2D.prototype.roundRect = roundRectImpl;
            }
            if (!(CanvasRenderingContext2D.prototype as any).close) {
                (CanvasRenderingContext2D.prototype as any).close = closeImpl;
            }
        }

        // Add polyfill for OffscreenCanvasRenderingContext2D
        if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
            if (!(OffscreenCanvasRenderingContext2D.prototype as any).roundRect) {
                (OffscreenCanvasRenderingContext2D.prototype as any).roundRect = roundRectImpl;
            }
            if (!(OffscreenCanvasRenderingContext2D.prototype as any).close) {
                (OffscreenCanvasRenderingContext2D.prototype as any).close = closeImpl;
            }
        }
    }

    private addD3Polyfills() {
        const d3Lib = this.libraries['d3'];
        if (!d3Lib || !d3Lib.instance) return;

        const d3Instance = d3Lib.instance;
        
        // Add d3.voronoi() compatibility for D3 v7+ (uses Delaunay now)
        if (!d3Instance.voronoi && d3Instance.Delaunay) {
            d3Instance.voronoi = function() {
                let x = (d: any) => d[0];
                let y = (d: any) => d[1];
                let extent: [[number, number], [number, number]] | null = null;

                const voronoi: any = {
                    x: function(accessor: (d: any) => number) {
                        x = accessor;
                        return voronoi;
                    },
                    y: function(accessor: (d: any) => number) {
                        y = accessor;
                        return voronoi;
                    },
                    extent: function(bounds: [[number, number], [number, number]]) {
                        extent = bounds;
                        return voronoi;
                    },
                    polygons: function(data: any[]) {
                        const points = data.map((d: any) => [x(d), y(d)]);
                        const delaunay = d3Instance.Delaunay.from(points);
                        
                        // Use extent if provided, otherwise compute bounds
                        let xmin = extent ? extent[0][0] : Math.min(...points.map((p: number[]) => p[0]));
                        let ymin = extent ? extent[0][1] : Math.min(...points.map((p: number[]) => p[1]));
                        let xmax = extent ? extent[1][0] : Math.max(...points.map((p: number[]) => p[0]));
                        let ymax = extent ? extent[1][1] : Math.max(...points.map((p: number[]) => p[1]));
                        
                        const voronoiDiagram = delaunay.voronoi([xmin, ymin, xmax, ymax]);
                        
                        // Convert to old format: array of polygons (array of [x,y] points)
                        const polygons = [];
                        for (let i = 0; i < points.length; i++) {
                            const cell = voronoiDiagram.cellPolygon(i);
                            if (cell) {
                                polygons.push(cell);
                            }
                        }
                        return polygons;
                    },
                    triangles: function(data: any[]) {
                        const points = data.map((d: any) => [x(d), y(d)]);
                        const delaunay = d3Instance.Delaunay.from(points);
                        return Array.from(delaunay.trianglePolygons());
                    },
                    links: function(data: any[]) {
                        const points = data.map((d: any) => [x(d), y(d)]);
                        const delaunay = d3Instance.Delaunay.from(points);
                        const links = [];
                        for (const [i, j] of delaunay.edges()) {
                            links.push({
                                source: data[i],
                                target: data[j]
                            });
                        }
                        return links;
                    }
                };

                return voronoi;
            };
            
            // Update the library instance reference to ensure the polyfill is available
            this.libraries['d3'].instance = d3Instance;
        }
    }

    private setupOffscreen(width: number, height: number) {
        if (!this.offscreenCanvas || this.lastWidth !== width || this.lastHeight !== height) {
            this.offscreenCanvas = new OffscreenCanvas(width, height);
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            this.lastWidth = width;
            this.lastHeight = height;
        }
    }

    // Cache compatible context to reduce GC
    private cachedCompatibleContext: any = {
        ctx: null,
        canvas: null,
        width: 0,
        height: 0,
        libraries: null,
        mainContext: null,
        mainCanvas: null,
        container: null,
        div: null,
        loadImage: null
    };

    // Reference to the active context proxy (updated every render)
    // This allows helper functions to access context.loadIcon/drawSVG globally
    private activeContextRef: any = null;

    // [PERF] Cached Proxy singleton for activeContext - avoids creating new Proxy every frame
    private cachedActiveContextProxy: any = null;
    // [PERF] Cache for bound canvas context methods to avoid .bind() per property access
    private lastBoundCtx: any = null;
    private boundMethodCache: Map<string | symbol, Function> = new Map();

    getCustomCodeReport(layerId: string): CustomCodeRuntimeReport | undefined {
        return this.runtimeReports.get(layerId);
    }

    getCustomCodeReports(): CustomCodeRuntimeReport[] {
        return Array.from(this.runtimeReports.values());
    }

    async render(layer: TemplateLayer, context: RenderContext, time: number): Promise<void> {
        if (!this.ctx) {
            console.error('[CustomCodeRenderer] No main context available');
            return;
        }
        const properties = (layer.properties as any) || {};
        
        let code = properties.code || (layer as any).code;

        if (!code) {
            console.warn(`[CustomCodeRenderer] No code for layer ${layer.id}`);
            return;
        }

        const preparedCode = prepareCustomCode(String(code));
        if (preparedCode.source !== code) {
            properties.code = preparedCode.source;
            code = preparedCode.source;
        }
        if (!this.libraries['anime'] && /\banime\b|\banimate\s*\(|\bcreateTimeline\s*\(|\bstagger\s*\(/.test(String(code))) {
            console.warn('[CustomCodeRenderer] anime.js is referenced by custom code but was not preloaded. Add "anime" to dependencies for deterministic rendering.');
        }
        this.recordRuntimeReport(layer, preparedCode, {
            dependencies: Array.isArray((properties as any).dependencies) ? (properties as any).dependencies : ((layer as any).dependencies ?? []),
        });

        const targetCtx = context.mainContext;
        const width = context.width || 1920;
        const height = context.height || 1080;

        let instance = this.runningInstances.get(layer.id);

        // [OPTIMIZATION] Reuse context object
        this.cachedCompatibleContext.ctx = targetCtx;
        this.cachedCompatibleContext.canvas = context.mainCanvas;
        this.cachedCompatibleContext.width = width;
        this.cachedCompatibleContext.height = height;
        this.cachedCompatibleContext.libraries = this.libraries;
        this.cachedCompatibleContext.libs = this.libraries;
        this.cachedCompatibleContext.mainContext = targetCtx;
        this.cachedCompatibleContext.mainCanvas = context.mainCanvas;
        this.cachedCompatibleContext.container = context.container;
        this.cachedCompatibleContext.div = context.container;
        this.cachedCompatibleContext.loadImage = (src: string) => this.loadImage(src);
        this.cachedCompatibleContext.asset = (id: string) => this.resolveAsset(id);
        this.cachedCompatibleContext.assets = this.createAssetAccessor(properties.__runtimeAssets ?? {});

        this.cachedCompatibleContext.loadIcon = (iconName: string) => this.loadIcon(iconName);
        // Support multiple call signatures for drawSVG.
        // Format 1: drawSVG(ctx, svgString, x, y, w, h)
        // Format 2: drawSVG(ctx, svgString, { size, color, x, y })
        this.cachedCompatibleContext.drawSVG = (ctx: any, svgString: string, arg3: any, arg4?: any, arg5?: any, arg6?: any) => {
            // Detect call signature based on argument types
            if (typeof arg3 === 'object' && arg3 !== null && !Array.isArray(arg3)) {
                // Options format: drawSVG(ctx, svgString, { size, color, x?, y? })
                const options = arg3;
                const size = options.size || 24;
                const color = options.color;
                const x = options.x ?? 0;
                const y = options.y ?? 0;

                // Apply color transformation if specified
                let processedSvg = svgString;
                if (color && svgString.includes('currentColor')) {
                    processedSvg = svgString.replace(/currentColor/gi, color);
                }

                return this.drawSVG(ctx, processedSvg, x - size/2, y - size/2, size, size);
            } else {
                // Legacy format: drawSVG(svgString, x, y, w, h) or drawSVG(ctx, svgString, x, y, w, h)
                // If first arg is a context, use it; otherwise use targetCtx
                if (typeof svgString === 'number') {
                    // Called as drawSVG(svgString, x, y, w, h) - shift args
                    return this.drawSVG(targetCtx, ctx as any, svgString as any, arg3, arg4, arg5);
                }
                // Called as drawSVG(ctx, svgString, x, y, w, h)
                return this.drawSVG(ctx, svgString, arg3, arg4, arg5, arg6);
            }
        };

        const compatibleContext = this.cachedCompatibleContext;

        // Keep the custom-code contract explicit: context.time and the
        // render(time, context) argument are layer-local seconds. Absolute
        // project time is available separately for timeline-aware code.
        compatibleContext.time = context.time;
        compatibleContext.localTime = properties.__runtimeLocalTime ?? context.time;
        compatibleContext.t = compatibleContext.localTime;
        compatibleContext.absoluteTime = context.absoluteTime ?? context.time;
        compatibleContext.globalTime = compatibleContext.absoluteTime;
        compatibleContext.projectTime = compatibleContext.absoluteTime;
        compatibleContext.layerStartTime = context.layerStartTime ?? (layer.startTime || 0);
        compatibleContext.layerEndTime = context.layerEndTime ?? layer.endTime;
        compatibleContext.ctx = targetCtx;
        compatibleContext.canvas = context.mainCanvas;
        compatibleContext.mainContext = targetCtx;
        compatibleContext.mainCanvas = context.mainCanvas;
        compatibleContext.container = context.container; // Sync container
        compatibleContext.div = context.container;       // Sync div
        compatibleContext.realMainContext = context.mainContext; // Allow escape hatch
        const layerDuration = typeof context.duration === 'number'
            ? context.duration
            : layer.endTime !== undefined && layer.startTime !== undefined
                ? layer.endTime - layer.startTime
                : undefined;

        compatibleContext.params = properties.params || {};
        compatibleContext.props = properties;
        compatibleContext.properties = properties;
        compatibleContext.theme = properties.__runtimeTheme ?? {};
        compatibleContext.data = properties.__runtimeDatasets ?? {};
        compatibleContext.datasets = properties.__runtimeDatasets ?? {};
        compatibleContext.assetMap = properties.__runtimeAssets ?? {};
        compatibleContext.assets = this.createAssetAccessor(properties.__runtimeAssets ?? {});
        compatibleContext.asset = (id: string) => this.resolveAsset(id);
        compatibleContext.motion = createMotionPresets();
        compatibleContext.camera = properties.__runtimeCamera ?? { x: 0, y: 0, zoom: 1, rotation: 0 };
        compatibleContext.transition = properties.__runtimeTransition;
        compatibleContext.captions = {
            active: properties.__runtimeNarration ?? [],
            current: Array.isArray(properties.__runtimeNarration) ? properties.__runtimeNarration[0] : undefined,
        };
        compatibleContext.narration = compatibleContext.captions;
        compatibleContext.audio = { markers: properties.__runtimeAudioMarkers ?? [] };
        compatibleContext.composition = properties.__runtimeComposition;
        compatibleContext.duration = properties.__runtimeDuration ?? layerDuration;
        compatibleContext.segment = properties.__runtimeSegmentId || properties.__runtimeActiveSegmentId;
        compatibleContext.segmentTime = properties.__runtimeSegmentLocalTime ?? compatibleContext.localTime;
        compatibleContext.segmentProgress = properties.__runtimeSegmentProgress;
        compatibleContext.segmentData = properties.__runtimeSegmentData;
        compatibleContext.progress = typeof context.progress === 'number'
            ? context.progress
            : typeof compatibleContext.duration === 'number' && compatibleContext.duration > 0
            ? Math.max(0, Math.min(1, compatibleContext.localTime / compatibleContext.duration))
            : 0;
        if (typeof compatibleContext.segmentProgress === 'number') {
            compatibleContext.progress = compatibleContext.segmentProgress;
        }
        compatibleContext.fps = context.fps || properties.__runtimeFps || 60;
        compatibleContext.frame = typeof context.frame === 'number'
            ? context.frame
            : Math.floor((context.time || 0) * compatibleContext.fps);
        compatibleContext.route = properties.__runtimeAdapter || properties.__runtimeRenderer;
        compatibleContext.worldMatrix = properties.__runtimeWorldMatrix;

        // [PERF] Reuse cached Proxy singleton (created once, reads from mutated cachedCompatibleContext)
        if (!this.cachedActiveContextProxy) {
            const self = this;
            this.cachedActiveContextProxy = new Proxy(this.cachedCompatibleContext, {
                get: (target, prop) => {
                    // 1. Check target first
                    if (prop in target && (target[prop] !== null && target[prop] !== undefined)) {
                        return target[prop];
                    }

                    // 2. Map aliases
                    if (prop === 'context2d') return target.ctx;

                    // 3. Fallback to canvas context for direct method calls
                    const mainCtx = target.mainContext || target.ctx;
                    if (mainCtx) {
                        try {
                            const val = (mainCtx as any)[prop];
                            if (val !== undefined) {
                                if (typeof val === 'function') {
                                    // Cache bound methods; invalidate when context object changes
                                    if (mainCtx !== self.lastBoundCtx) {
                                        self.boundMethodCache.clear();
                                        self.lastBoundCtx = mainCtx;
                                    }
                                    let bound = self.boundMethodCache.get(prop);
                                    if (!bound) {
                                        const created = val.bind(mainCtx) as Function;
                                        self.boundMethodCache.set(prop, created);
                                        bound = created;
                                    }
                                    return bound;
                                }
                                return val;
                            }
                        } catch (e) { }
                    }
                    return undefined;
                }
            });
        }
        const activeContext = this.cachedActiveContextProxy;
        // Update global context reference so helper functions can access it
        this.activeContextRef = activeContext;

        if (!instance || instance.code !== code) {
            instance = this.createInstance(code, layer, context, activeContext);

            if (instance) {
                this.runningInstances.set(layer.id, instance);
            } else {
                console.error(`[CustomCodeRenderer] Failed to create instance for layer ${layer.id}`);
                return;
            }
        }

        if (instance && instance.exports) {
            // Run init if present and not run yet
            if (instance.exports.init && !instance.initialized) {
                // Mark as initialized BEFORE awaiting to prevent re-entry on subsequent frames
                // while init is still running (e.g. awaiting loadIcon)
                instance.initialized = true;
                try {
                    const initResult = instance.exports.init(activeContext);
                    // Await async init so that loadIcon / timeline setup completes
                    // before the first render call
                    if (initResult && typeof initResult.then === 'function') {
                        instance.initReady = false;
                        instance.initPromise = initResult
                            .catch((e: any) => {
                                console.error(`[CustomCodeRenderer] \u274C Async init error in layer ${layer.id}:`, e);
                                this.appendRuntimeDiagnostic(layer.id, errorToDiagnostic('init', e, {
                                    time: context.time,
                                    frame: compatibleContext.frame,
                                }));
                            })
                            .finally(() => {
                                instance.initReady = true;
                            });
                    } else {
                        instance.initReady = true;
                    }
                } catch (e) {
                    console.error(`[CustomCodeRenderer] \u274C Init error in layer ${layer.id}:`, e);
                    this.appendRuntimeDiagnostic(layer.id, errorToDiagnostic('init', e, {
                        time: context.time,
                        frame: compatibleContext.frame,
                    }));
                    instance.initReady = true;
                }
            }

            (activeContext as any).initPending = instance.initReady === false;
            (activeContext as any).initReady = instance.initReady !== false;

            if (instance.exports.render) {
                let contextSaved = false;
                try {
                    if (instance.sdk) {
                        instance.sdk.update(layer, context);
                    }

                    const runtimeWorldMatrix = properties.__runtimeWorldMatrix;
                    const hasRuntimeMatrix = runtimeWorldMatrix &&
                        typeof runtimeWorldMatrix.a === 'number' &&
                        typeof runtimeWorldMatrix.b === 'number' &&
                        typeof runtimeWorldMatrix.c === 'number' &&
                        typeof runtimeWorldMatrix.d === 'number' &&
                        typeof runtimeWorldMatrix.e === 'number' &&
                        typeof runtimeWorldMatrix.f === 'number';

                    const hasTransform = hasRuntimeMatrix ||
                        (properties.scaleX !== undefined && properties.scaleX !== 1) ||
                        (properties.scaleY !== undefined && properties.scaleY !== 1) ||
                        (properties.rotation !== undefined && properties.rotation !== 0) ||
                        (properties.x !== undefined && properties.x !== 0) ||
                        (properties.y !== undefined && properties.y !== 0);

                    if (hasTransform) {
                        targetCtx.save();
                        contextSaved = true;
                        
                        if (hasRuntimeMatrix) {
                            targetCtx.transform(
                                runtimeWorldMatrix.a,
                                runtimeWorldMatrix.b,
                                runtimeWorldMatrix.c,
                                runtimeWorldMatrix.d,
                                runtimeWorldMatrix.e,
                                runtimeWorldMatrix.f
                            );
                        } else {
                            if (properties.x || properties.y) {
                                targetCtx.translate(properties.x || 0, properties.y || 0);
                            }

                            if (properties.rotation) {
                            targetCtx.rotate((properties.rotation * Math.PI) / 180);
                            }
                        }
                        
                        if (!hasRuntimeMatrix && (properties.scaleX !== undefined || properties.scaleY !== undefined)) {
                            targetCtx.scale(
                                properties.scaleX !== undefined ? properties.scaleX : 1,
                                properties.scaleY !== undefined ? properties.scaleY : 1
                            );
                        }
                    }
                    
                    const relativeTimeInSeconds = context.time;

                    // Render to target context (may be cache canvas)
                    const renderResult = instance.exports.render(relativeTimeInSeconds, activeContext);
                    if (renderResult && typeof renderResult.then === 'function') {
                        await renderResult;
                    }
                    this.markRuntimeRendered(layer.id, context.time);
                    
                    if (contextSaved) {
                        targetCtx.restore();
                        contextSaved = false;
                    }
                } catch (e) {
                    console.error(`[CustomCodeRenderer] Render error in layer ${layer.id}:`, e);
                    this.appendRuntimeDiagnostic(layer.id, errorToDiagnostic('render', e, {
                        time: context.time,
                        frame: compatibleContext.frame,
                    }));
                    if (contextSaved) {
                        try { targetCtx.restore(); } catch (restoreError) { }
                    }
                    if (context.isExporting) {
                        throw e;
                    }
                }
            }
        }

    }

    private createInstance(code: string, layer: TemplateLayer, context: RenderContext, activeContext: any) {
        const layerId = layer.id;
        try {
            const sdk = new LayerSDK(layer, context);

            class BoundLayer extends BaseLayer {
                constructor() {
                    super(sdk);
                }
                render(time: number, context: RenderContext): void { }
            }
            (sdk as any).Layer = BoundLayer;
            (sdk as any).CanvasLayer = BoundLayer;

            // Helper to unwrap library instance from LibraryManager info objects
            const unwrap = (lib: any) => (lib && lib.instance) ? lib.instance : lib;

            const sandbox: Record<string, any> = {
                lottie: unwrap(this.libraries['lottie']),
                paper: unwrap(this.libraries['paper']),
                math: unwrap(this.libraries['math']),
                katex: unwrap(this.libraries['katex']),
                emotion: unwrap(this.libraries['emotion']),
                iconify: unwrap(this.libraries['iconify']),
                // [FIX] Standard naming for locals
                THREE: unwrap(this.libraries['THREE']),
                anime: unwrap(this.libraries['anime']),
                // anime.js v4 named exports — available directly in sandbox
                animate: unwrap(this.libraries['anime'])?.animate,
                createTimeline: unwrap(this.libraries['anime'])?.createTimeline,
                createAnimatable: unwrap(this.libraries['anime'])?.createAnimatable,
                createTimer: unwrap(this.libraries['anime'])?.createTimer,
                createSpring: unwrap(this.libraries['anime'])?.createSpring,
                stagger: unwrap(this.libraries['anime'])?.stagger,
                utils: unwrap(this.libraries['anime'])?.utils,
                svg: unwrap(this.libraries['anime'])?.svg,
                eases: unwrap(this.libraries['anime'])?.eases,
                engine: unwrap(this.libraries['anime'])?.engine,
                Matter: unwrap(this.libraries['Matter']),
                PIXI: unwrap(this.libraries['PIXI']),
                p5: unwrap(this.libraries['p5']),
                d3: unwrap(this.libraries['d3']),
                gsap: unwrap(this.libraries['gsap']),
                fabric: unwrap(this.libraries['fabric']),
                rough: unwrap(this.libraries['rough']),
                TWEEN: unwrap(this.libraries['TWEEN']),
                Globe: unwrap(this.libraries['Globe']),
                tsParticles: unwrap(this.libraries['tsParticles']),
                CANNON: unwrap(this.libraries['CANNON']),
                POSTPROCESSING: unwrap(this.libraries['POSTPROCESSING']),
                opentype: unwrap(this.libraries['opentype']),
                simplex: unwrap(this.libraries['simplex']),
                html2canvas: unwrap(this.libraries['html2canvas']),
                mediabunny: unwrap(this.libraries['mediabunny']),
                canvas2d: unwrap(this.libraries['canvas2d']),
                SimplexNoise: (() => {
                    const simplexLib = unwrap(this.libraries['simplex']);
                    if (!simplexLib) return undefined;
                    const createNoise2D = simplexLib.createNoise2D;
                    const createNoise3D = simplexLib.createNoise3D;
                    const createNoise4D = simplexLib.createNoise4D;
                    if (typeof createNoise2D !== 'function') return undefined;
                    class SimplexNoiseCompat {
                        private _n2: any;
                        private _n3: any;
                        private _n4: any;
                        constructor(_seed?: any) {
                            this._n2 = createNoise2D();
                            this._n3 = typeof createNoise3D === 'function' ? createNoise3D() : null;
                            this._n4 = typeof createNoise4D === 'function' ? createNoise4D() : null;
                        }
                        noise2D(x: number, y: number): number {
                            return this._n2(x, y);
                        }
                        noise3D(x: number, y: number, z: number): number {
                            if (!this._n3) return this._n2(x + z * 0.17, y + z * 0.31);
                            return this._n3(x, y, z);
                        }
                        noise4D(x: number, y: number, z: number, w: number): number {
                            if (!this._n4) return this.noise3D(x + w * 0.13, y + w * 0.29, z + w * 0.37);
                            return this._n4(x, y, z, w);
                        }
                    }
                    return SimplexNoiseCompat;
                })(),
                SplitType: unwrap(this.libraries['SplitType']),
                // [FIX] Expose ctx and canvas globally for compatibility with generated code
                // Some codes try to access ctx directly at top level "const ctx = context.mainContext" (failed attempt) or just "ctx.fillStyle"
                ctx: this.ctx,
                canvas: this.canvas,
                width: context.width || 1920,
                height: context.height || 1080,
                w: context.width || 1920,
                h: context.height || 1080,
                W: context.width || 1920,  // Uppercase aliases for width/height
                H: context.height || 1080,
                time: 0,
                t: 0,
                frame: 0,
                fps: 60,
                progress: 0,
                params: (layer.properties as any)?.params || {},
                props: layer.properties || {},
                properties: layer.properties || {},
                theme: (layer.properties as any)?.__runtimeTheme || {},
                data: (layer.properties as any)?.__runtimeDatasets || {},
                datasets: (layer.properties as any)?.__runtimeDatasets || {},
                assets: this.createAssetAccessor((layer.properties as any)?.__runtimeAssets || {}),
                asset: (id: string) => this.resolveAsset(id),
                motion: createMotionPresets(),
                camera: (layer.properties as any)?.__runtimeCamera || { x: 0, y: 0, zoom: 1, rotation: 0 },
                transition: (layer.properties as any)?.__runtimeTransition,
                captions: { active: (layer.properties as any)?.__runtimeNarration || [] },
                narration: { active: (layer.properties as any)?.__runtimeNarration || [] },
                audio: { markers: (layer.properties as any)?.__runtimeAudioMarkers || [] },
                composition: (layer.properties as any)?.__runtimeComposition,
                libs: this.libraries,
                container: context.container,
                div: context.container,
                // [NEW] Expose context globally so helper functions can access loadIcon/drawSVG
                context: activeContext,
                console: {
                    log: (...args: any[]) => console.log(`[Layer:${layerId}]`, ...args),
                    error: (...args: any[]) => console.error(`[Layer:${layerId}]`, ...args)
                },
                module: { exports: {} },
                exports: {},
                // [FIX] Provide dispose placeholder for user code that may reference it
                dispose: undefined as any,
                require: (id: string) => {
                    const lowId = id.toLowerCase();
                    const lib = (() => {
                        // Aliases for better compatibility
                        if (lowId === 'three' || lowId === 'threejs') return this.libraries['THREE'];
                        if (lowId === 'animejs' || lowId === 'anime') return this.libraries['anime'];
                        if (lowId === 'matter-js' || lowId === 'matter') return this.libraries['Matter'];
                        if (lowId === 'pixi.js' || lowId === 'pixi') return this.libraries['PIXI'];
                        if (lowId === 'p5' || lowId === 'p5js') return this.libraries['p5'];
                        if (lowId === 'd3') return this.libraries['d3'];
                        if (lowId === 'gsap') return this.libraries['gsap'];
                        if (lowId === 'fabric' || lowId === 'fabric.js') return this.libraries['fabric'];
                        if (lowId === 'roughjs' || lowId === 'rough') return this.libraries['rough'];
                        if (lowId === 'lottie-web' || lowId === 'lottie') return this.libraries['lottie'];
                        if (lowId === 'tween' || lowId === 'tween.js') return this.libraries['TWEEN'];
                        if (lowId === 'paper' || lowId === 'paperjs') return this.libraries['paper'];
                        if (lowId === 'mathjs' || lowId === 'math') return this.libraries['math'];
                        if (lowId === 'katex') return this.libraries['katex'];
                        if (lowId === 'emotion' || lowId === '@emotion/css') return this.libraries['emotion'];
                        if (lowId === 'iconify' || lowId === 'iconify-icon' || lowId === '@iconify/iconify') return this.libraries['iconify'];
                        if (lowId === 'globe.gl' || lowId === 'globe') return this.libraries['Globe'];
                        if (lowId === 'tsparticles' || lowId === 'tsparticles-engine') return this.libraries['tsParticles'];
                        if (lowId === 'cannon-es' || lowId === 'cannon') return this.libraries['CANNON'];
                        if (lowId === 'postprocessing') return this.libraries['POSTPROCESSING'];
                        if (lowId === 'opentype.js' || lowId === 'opentype') return this.libraries['opentype'];
                        if (lowId === 'simplex-noise') return this.libraries['simplex'];
                        if (lowId === 'split-type') return this.libraries['SplitType'];
                        if (lowId === 'html2canvas') return this.libraries['html2canvas'];
                        if (lowId === 'mediabunny') return this.libraries['mediabunny'];
                        if (lowId === 'canvas2d' || lowId === 'canvas' || lowId === 'context2d') return this.libraries['canvas2d'];
                        if (lowId === 'layer-sdk') return sdk;
                        return null;
                    })();

                    if (lib) return lib;
                    console.warn(`[CustomCodeRenderer] Library "${id}" not found for layer ${layerId}.`);
                    throw new Error(`Dynamic require of "${id}" is not supported. Please use the core animation libraries or "layer-sdk".`);
                }
            };

            // [FIX] Define a master scope object that includes all libraries and core globals
            const globalScope: any = { ...sandbox };

            // Explicitly map common library names to globalScope for window.Lib access
            globalScope.THREE = unwrap(this.libraries['THREE']);
            globalScope.anime = unwrap(this.libraries['anime']);
            // anime.js v4 named exports as globals
            const animeV4 = unwrap(this.libraries['anime']);
            if (animeV4) {
                globalScope.animate = animeV4.animate;
                globalScope.createTimeline = animeV4.createTimeline;
                globalScope.createAnimatable = animeV4.createAnimatable;
                globalScope.createTimer = animeV4.createTimer;
                globalScope.createSpring = animeV4.createSpring;
                globalScope.stagger = animeV4.stagger;
                globalScope.utils = animeV4.utils;
                globalScope.svg = animeV4.svg;
                globalScope.eases = animeV4.eases;
                globalScope.engine = animeV4.engine;
            }
            globalScope.Matter = unwrap(this.libraries['Matter']);
            globalScope.PIXI = unwrap(this.libraries['PIXI']);
            globalScope.p5 = unwrap(this.libraries['p5']);
            globalScope.d3 = unwrap(this.libraries['d3']);
            globalScope.gsap = unwrap(this.libraries['gsap']);
            globalScope.Globe = unwrap(this.libraries['Globe']);
            globalScope.tsParticles = unwrap(this.libraries['tsParticles']);
            globalScope.CANNON = unwrap(this.libraries['CANNON']);
            globalScope.POSTPROCESSING = unwrap(this.libraries['POSTPROCESSING']);
            globalScope.opentype = unwrap(this.libraries['opentype']);
            globalScope.simplex = unwrap(this.libraries['simplex']);
            globalScope.html2canvas = unwrap(this.libraries['html2canvas']);
            globalScope.mediabunny = unwrap(this.libraries['mediabunny']);
            globalScope.canvas2d = unwrap(this.libraries['canvas2d']);
            globalScope.SimplexNoise = sandbox.SimplexNoise;
            globalScope.SplitType = unwrap(this.libraries['SplitType']);
            globalScope.fabric = unwrap(this.libraries['fabric']);
            globalScope.rough = unwrap(this.libraries['rough']);
            globalScope.lottie = unwrap(this.libraries['lottie']);
            globalScope.TWEEN = unwrap(this.libraries['TWEEN']);
            globalScope.paper = unwrap(this.libraries['paper']);
            globalScope.math = unwrap(this.libraries['math']);
            globalScope.katex = unwrap(this.libraries['katex']);
            globalScope.emotion = unwrap(this.libraries['emotion']);
            globalScope.iconify = unwrap(this.libraries['iconify']);

            // [FIX] Provide a stub for NodeList since it might be referenced by GSAP or other libraries looking for DOM elements
            if (typeof NodeList === 'undefined') {
                globalScope.NodeList = class NodeList { };
            } else {
                globalScope.NodeList = NodeList;
            }

            // [FIX] Create Proxy to handle window.SomeLib access correctly and keep core globals DYNAMIC
            // [PERF] Cache bound window methods to avoid .bind() per access
            const windowBindCache = new Map<string | symbol, Function>();
            const windowProxy = new Proxy(globalScope, {
                get: (target, prop) => {
                    // [DYNAMIC] Catch-all for core variables that change every frame or need shadowing
                    if (prop === 'ctx' || prop === 'context2d') return this.cachedCompatibleContext.ctx;
                    if (prop === 'canvas') return this.cachedCompatibleContext.canvas;
                    if (prop === 'width' || prop === 'w' || prop === 'W') return this.lastWidth;
                    if (prop === 'height' || prop === 'h' || prop === 'H') return this.lastHeight;
                    if (prop === 'container' || prop === 'div') return this.cachedCompatibleContext.container;
                    if (prop === 'time' || prop === 't') return this.cachedCompatibleContext.localTime ?? this.cachedCompatibleContext.time;
                    if (prop === 'frame') return this.cachedCompatibleContext.frame;
                    if (prop === 'fps') return this.cachedCompatibleContext.fps;
                    if (prop === 'progress') return this.cachedCompatibleContext.progress;
                    if (prop === 'params') return this.cachedCompatibleContext.params;
                    if (prop === 'props' || prop === 'properties') return this.cachedCompatibleContext.properties;
                    if (prop === 'theme') return this.cachedCompatibleContext.theme;
                    if (prop === 'data' || prop === 'datasets') return this.cachedCompatibleContext.data;
                    if (prop === 'assets') return this.cachedCompatibleContext.assets;
                    if (prop === 'asset') return this.cachedCompatibleContext.asset;
                    if (prop === 'motion') return this.cachedCompatibleContext.motion;
                    if (prop === 'camera') return this.cachedCompatibleContext.camera;
                    if (prop === 'transition') return this.cachedCompatibleContext.transition;
                    if (prop === 'captions' || prop === 'narration') return this.cachedCompatibleContext.captions;
                    if (prop === 'audio') return this.cachedCompatibleContext.audio;
                    if (prop === 'composition') return this.cachedCompatibleContext.composition;
                    if (prop === 'libs') return this.cachedCompatibleContext.libs || this.cachedCompatibleContext.libraries;
                    if (prop === 'segment') return this.cachedCompatibleContext.segment;
                    if (prop === 'segmentTime') return this.cachedCompatibleContext.segmentTime;
                    if (prop === 'segmentProgress') return this.cachedCompatibleContext.segmentProgress;
                    if (prop === 'segmentData') return this.cachedCompatibleContext.segmentData;
                    // [NEW] Return the active context proxy so helper functions can access loadIcon/drawSVG
                    if (prop === 'context') return this.activeContextRef;

                    if (prop in target) return target[prop as string];

                    // Fallback to real window for standard APIs (setTimeout, etc.)
                    const val = (window as any)[prop as string];
                    if (typeof val === 'function' && !val.prototype) {
                        let bound = windowBindCache.get(prop);
                        if (!bound) {
                            const created = val.bind(window) as Function;
                            windowBindCache.set(prop, created);
                            bound = created;
                        }
                        return bound;
                    }
                    return val;
                },
                set: (target, prop, value) => {
                    target[prop as string] = value;
                    return true;
                }
            });

            // Point all common global names to the proxy
            sandbox.window = windowProxy;
            sandbox.global = windowProxy;
            sandbox.self = windowProxy;
            sandbox.globalThis = windowProxy;

            let factoryFunction: Function;
            let sandboxKeys = Object.keys(sandbox);

            // Sanitize AI-generated code (normalize unicode, fix quotes, transpile ESM, fix roundRect, etc.)
            const preparedCode = prepareCustomCode(code);
            const sanitizedCode = preparedCode.sanitized;
            CodeSanitizer.warnMonospaceFont(sanitizedCode);

            // [CRITICAL FIX] Avoid using template literals ${sanitizedCode} because it will 
            // intermittently interpolate ${} inside the AI code at compile time!
            // Use direct concatenation instead.
            const factoryBody =
                "'use strict';\n" +
                sanitizedCode +
                "\n\n" +
                createEntrypointProbe();

            // [FIX] Retry compilation if variables conflict with user code constraints
            while (true) {
                try {
                    factoryFunction = new Function(...sandboxKeys, factoryBody);
                    break;
                } catch (e: any) {
                    if (e instanceof SyntaxError) {
                        // Handle collision by removing the conflicting key
                        const match = e.message.match(/Identifier '(\w+)' has already been declared/);
                        if (match) {
                            const conflictKey = match[1];
                            console.warn(`[CustomCodeRenderer] Removing conflicting sandbox key: ${conflictKey} for layer ${layerId}`);
                            sandboxKeys = sandboxKeys.filter(k => k !== conflictKey);
                            continue;
                        }

                        console.error(`[CustomCodeRenderer] Syntax error during compilation for layer ${layerId}:`, e.message);
                    }
                    throw e;
                }
            }

            const sandboxValues = sandboxKeys.map(k => sandbox[k]);
            const result = normalizeEntrypoint(factoryFunction(...sandboxValues));

            if (!result) {
                throw new Error('Code execution failed');
            }
            this.updateRuntimeReport(layerId, {
                entrypoint: result.type,
                diagnostics: [{
                    stage: 'entrypoint',
                    level: 'info',
                    message: `Detected ${result.type} custom-code entrypoint`,
                }],
            });

            let exports: any;

            if (result.type === 'factory') {
                const container = context.container || context.mainCanvas || this.canvas;
                const factoryExports = result.value(container, activeContext);

                if (!factoryExports) {
                    throw new Error('factory createRenderer returned null/undefined');
                }

                exports = {
                    init: factoryExports.init ? (ctx: RenderContext) => {
                        return factoryExports.init(ctx);
                    } : undefined,
                    render: (time: number, ctx: RenderContext) => {
                        if (factoryExports.update) {
                            factoryExports.update(time);
                        } else if (factoryExports.render) {
                            factoryExports.render(time, ctx);
                        }

                        if (container instanceof HTMLElement) {
                            const userCanvas = container.querySelector('canvas');
                            if (userCanvas && userCanvas !== (ctx.mainCanvas || this.canvas)) {
                                // @ts-ignore
                                ctx.mainContext.drawImage(userCanvas, 0, 0, ctx.width, ctx.height);
                            }
                        }
                    },
                    dispose: () => {
                        if (factoryExports.destroy) {
                            try { factoryExports.destroy(); } catch (e) { }
                        }
                        if (factoryExports.dispose) {
                            try { factoryExports.dispose(); } catch (e) { }
                        }
                    }
                };
            } else if (result.type === 'class') {
                const LayerClass = result.value;
                const instance = new LayerClass();

                exports = {
                    init: (ctx: RenderContext) => {
                        if (instance.init) {
                            instance.init({
                                ...ctx,
                                width: ctx.width,
                                height: ctx.height
                            });
                        }
                    },
                    render: (timestamp: number, ctx: RenderContext) => {
                        if (instance.draw) {
                            const frame = Math.floor(timestamp / (1000 / 60));
                            instance.draw(ctx.mainContext, frame, {
                                ...ctx,
                                width: ctx.width,
                                height: ctx.height
                            });
                        } else if (instance.render) {
                            instance.render(timestamp, ctx);
                        }
                    },
                    dispose: () => {
                        if (instance.dispose) instance.dispose();
                    }
                };
            } else if (result.type === 'object') {
                const objectExports = result.value || {};

                exports = {
                    init: objectExports.init || objectExports.setup ? (ctx: RenderContext) => {
                        const initFn = objectExports.init || objectExports.setup;
                        return initFn.call(objectExports, activeContext, ctx);
                    } : undefined,
                    render: (time: number, ctx: RenderContext) => {
                        const renderFn = objectExports.render || objectExports.draw || objectExports.update || objectExports.animate;
                        if (!renderFn) return;

                        if (renderFn === objectExports.draw) {
                            return renderFn.call(objectExports, ctx.mainContext, time, activeContext);
                        }

                        return renderFn.call(objectExports, time, activeContext);
                    },
                    dispose: () => {
                        const disposeFn = objectExports.dispose || objectExports.destroy || objectExports.cleanup;
                        if (disposeFn) disposeFn.call(objectExports);
                    }
                };
            } else if (result.type === 'render-function') {
                const renderFn = result.value;
                exports = {
                    render: (time: number, ctx: RenderContext) => {
                        return renderFn(time, activeContext, ctx.mainContext);
                    },
                    dispose: () => {
                        // Standalone render functions do not own resources by default.
                    }
                };
            } else if (result.type === 'script') {
                // [OPTIMIZATION] Simple Script Mode directly executes code in render loop
                // Pre-compile function and values to avoid O(N) lookup per frame
                const scriptFunc = new Function(...sandboxKeys, `'use strict';\n${sanitizedCode}`);

                // Match indices of dynamic props for fast updates
                const dynamicIndices = {
                    ctx: sandboxKeys.indexOf('ctx'),
                    canvas: sandboxKeys.indexOf('canvas'),
                    width: sandboxKeys.indexOf('width'),
                    height: sandboxKeys.indexOf('height'),
                    w: sandboxKeys.indexOf('w'),
                    h: sandboxKeys.indexOf('h'),
                    time: sandboxKeys.indexOf('time'),
                    t: sandboxKeys.indexOf('t'),
                    frame: sandboxKeys.indexOf('frame'),
                    fps: sandboxKeys.indexOf('fps'),
                    progress: sandboxKeys.indexOf('progress'),
                    params: sandboxKeys.indexOf('params'),
                    props: sandboxKeys.indexOf('props'),
                    properties: sandboxKeys.indexOf('properties')
                };

                // Create a reusable values array initialized with static libraries
                const cachedValues = [...sandboxValues];

                exports = {
                    render: (timestamp: number, ctx: RenderContext) => {
                        const { width, height } = ctx; // Extract width and height from ctx
                        const targetCtx = ctx.mainContext;

                        // Fast update only dynamic values
                        if (dynamicIndices.ctx !== -1) cachedValues[dynamicIndices.ctx] = targetCtx;
                        if (dynamicIndices.canvas !== -1) cachedValues[dynamicIndices.canvas] = ctx.mainCanvas;
                        if (dynamicIndices.width !== -1) cachedValues[dynamicIndices.width] = width;
                        if (dynamicIndices.height !== -1) cachedValues[dynamicIndices.height] = height;
                        if (dynamicIndices.w !== -1) cachedValues[dynamicIndices.w] = width;
                        if (dynamicIndices.h !== -1) cachedValues[dynamicIndices.h] = height;
                        if (dynamicIndices.time !== -1) cachedValues[dynamicIndices.time] = activeContext.localTime ?? ctx.time;
                        if (dynamicIndices.t !== -1) cachedValues[dynamicIndices.t] = activeContext.localTime ?? ctx.time;
                        if (dynamicIndices.frame !== -1) cachedValues[dynamicIndices.frame] = activeContext.frame ?? Math.floor(timestamp * 60);
                        if (dynamicIndices.fps !== -1) cachedValues[dynamicIndices.fps] = activeContext.fps ?? 60;
                        if (dynamicIndices.progress !== -1) cachedValues[dynamicIndices.progress] = activeContext.progress ?? 0;
                        if (dynamicIndices.params !== -1) cachedValues[dynamicIndices.params] = activeContext.params ?? {};
                        if (dynamicIndices.props !== -1) cachedValues[dynamicIndices.props] = activeContext.props ?? {};
                        if (dynamicIndices.properties !== -1) cachedValues[dynamicIndices.properties] = activeContext.properties ?? {};

                        try {
                            scriptFunc(...cachedValues);
                        } catch (e) {
                            console.error(`[CustomCodeRenderer] Simple script error in layer ${layerId}:`, e);
                            this.appendRuntimeDiagnostic(layerId, errorToDiagnostic('render', e, {
                                time: ctx.time,
                                frame: activeContext.frame,
                            }));
                            if (ctx.isExporting) {
                                throw e;
                            }
                        }
                    },
                    dispose: () => {
                        // Simple scripts don't have cleanup, but provide empty dispose for consistency
                    }
                };
            }

            const instanceObj: any = {
                code,
                exports,
                sdk,
                initialized: false,
                initReady: true, // set to false during async init, true when sync or no init
            };
            this.runningInstances.set(layerId, instanceObj);
            return instanceObj;
        } catch (e) {
            console.error(`[CustomCodeRenderer] Failed to compile code for layer ${layerId}:`, e);
            this.appendRuntimeDiagnostic(layerId, errorToDiagnostic('compile', e));
            return null;
        }
    }

    private recordRuntimeReport(
        layer: TemplateLayer,
        preparedCode: ReturnType<typeof prepareCustomCode>,
        options: { dependencies?: string[] } = {}
    ): void {
        const existing = this.runtimeReports.get(layer.id);
        const segmentId = (layer.properties as any)?.__runtimeSegmentId || (layer.properties as any)?.__runtimeActiveSegmentId;
        const diagnostics = [
            ...preparedCode.diagnostics,
            ...(existing?.diagnostics.filter(item => item.level === 'error') ?? []),
        ];

        this.runtimeReports.set(layer.id, {
            layerId: layer.id,
            segmentId,
            entrypoint: existing?.entrypoint,
            sourceLength: preparedCode.source.length,
            sanitizedLength: preparedCode.sanitized.length,
            sanitizedChanged: preparedCode.changed,
            codePreview: preparedCode.preview,
            dependencies: Array.from(new Set((options.dependencies ?? []).filter(item => typeof item === 'string'))).sort(),
            diagnostics,
            lastCompiledAt: existing?.lastCompiledAt ?? Date.now(),
            lastRenderedAt: existing?.lastRenderedAt,
            lastError: existing?.lastError,
        });
    }

    private updateRuntimeReport(layerId: string, patch: Partial<CustomCodeRuntimeReport> & { diagnostics?: CustomCodeDiagnostic[] }): void {
        const existing = this.runtimeReports.get(layerId);
        if (!existing) {
            return;
        }

        this.runtimeReports.set(layerId, {
            ...existing,
            ...patch,
            diagnostics: [
                ...existing.diagnostics,
                ...(patch.diagnostics ?? []),
            ],
            lastCompiledAt: Date.now(),
        });
    }

    private appendRuntimeDiagnostic(layerId: string, diagnostic: CustomCodeDiagnostic): void {
        const existing = this.runtimeReports.get(layerId);
        if (!existing) {
            return;
        }

        this.runtimeReports.set(layerId, {
            ...existing,
            diagnostics: [...existing.diagnostics, diagnostic],
            lastError: diagnostic.level === 'error' ? diagnostic.message : existing.lastError,
        });
    }

    private markRuntimeRendered(layerId: string, time: number): void {
        const existing = this.runtimeReports.get(layerId);
        if (!existing) {
            return;
        }

        this.runtimeReports.set(layerId, {
            ...existing,
            lastRenderedAt: time,
        });
    }


    /**
     */
    reset(): void {
        this.runningInstances.forEach(instance => {
            if (instance.exports && instance.exports.dispose) {
                try { instance.exports.dispose(); } catch (e) { }
            }
        });
        this.runningInstances.clear();
        this.runtimeReports.clear();
        this.imageCache.clear();
        this.assetCache.clear();
        this.boundMethodCache.clear();
        this.lastBoundCtx = null;
    }

    dispose(): void {
        this.runningInstances.forEach(instance => {
            if (instance.exports && instance.exports.dispose) {
                try { instance.exports.dispose(); } catch (e) { }
            }
        });
        this.runningInstances.clear();
        this.runtimeReports.clear();

        this.iconCache.clear();
        this.svgImageCache.clear();
        this.imageCache.clear();

        this.cachedActiveContextProxy = null;
        this.boundMethodCache.clear();
        this.lastBoundCtx = null;

        this.canvas = null;
        this.ctx = null;
    }
}

function createMotionPresets() {
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
    const easeInOutCubic = (p: number) => {
        const x = clamp(p);
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    const easeOutBack = (p: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const x = clamp(p) - 1;
        return 1 + c3 * x * x * x + c1 * x * x;
    };
    return {
        clamp,
        linear: clamp,
        easeOutCubic,
        easeInOutCubic,
        easeOutBack,
        springIn: (p: number) => easeOutBack(p),
        stagger: (index: number, progress: number, delay = 0.06, span = 0.55) => clamp((progress - index * delay) / span),
        wipe: (progress: number, direction = 'left') => ({ progress: clamp(progress), direction }),
        counter: (from: number, to: number, progress: number) => Math.round(from + (to - from) * easeOutCubic(progress)),
        pulse: (time: number, amount = 0.08, speed = 2) => 1 + Math.sin(time * Math.PI * 2 * speed) * amount,
        scanline: (time: number, height: number, speed = 0.35) => ((time * speed) % 1) * height,
        shake: (time: number, progress = 1, amount = 8) => ({
            x: Math.sin(time * 91.7) * amount * progress,
            y: Math.cos(time * 73.3) * amount * progress,
        }),
    };
}
