/**
 */

import type { TemplateConfig, TemplateLayer, LayerProperties, RenderContext } from '../types';
import { RendererFactory } from '../renderers/RendererFactory';
import { getLibraryManager, type LibraryManager } from '../sandbox/LibraryManager';

export class TemplateRenderer {
  private mainCanvas: HTMLCanvasElement | OffscreenCanvas;
  private offscreenCanvas: HTMLCanvasElement | OffscreenCanvas;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private config: TemplateConfig | null = null;
  private container?: HTMLElement;

  private rendererFactory: RendererFactory;
  private isExporting = false;
  private renderScale = 1;

  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private libraryManager: LibraryManager;

  private layerCache: Map<string, {
    canvas: OffscreenCanvas;
    lastRenderTime: number;
    isDynamic: boolean;
  }> = new Map();

  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, container?: HTMLElement) {
    this.mainCanvas = canvas;
    this.container = container;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width || 1920;
    this.offscreenCanvas.height = canvas.height || 1080;

    this.canvas = this.offscreenCanvas;
    this.ctx = this.offscreenCanvas.getContext('2d')!;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context for TemplateRenderer');
    }


    this.rendererFactory = new RendererFactory();
    this.libraryManager = getLibraryManager();
  }

  setExportMode(isExporting: boolean): void {
    this.isExporting = isExporting;
  }

  setRenderScale(scale: number): void {
    const clamped = Math.max(0.25, Math.min(4, scale));
    this.renderScale = clamped;
  }

  async preloadDependencies(dependencies: string[]): Promise<void> {
    await this.libraryManager.preloadDependencies(dependencies);
    await this.rendererFactory.initialize({
      canvas: this.offscreenCanvas,
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
      libraries: this.libraryManager.getAllLibraries()
    });
  }

  /**
   */
  async updateCanvasSize(width: number, height: number): Promise<void> {
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;

      try {
        await this.rendererFactory.initialize({
          canvas: this.offscreenCanvas,
          width: this.offscreenCanvas.width,
          height: this.offscreenCanvas.height,
          libraries: this.libraryManager.getAllLibraries()
        });
      } catch (err) {
        console.error('Failed to reinitialize renderers:', err);
      }
    }
  }

  /**
   * Preload animation libraries used by the template.
   */
  async load(config: TemplateConfig): Promise<void> {
    if (!config.layers || config.layers.length === 0) {
      console.error('[TemplateRenderer] Config has no layers.');
      throw new Error('Template config must have at least one layer');
    }

    this.config = config;

    if (this.mainCanvas.width > 0 && this.mainCanvas.height > 0) {
      await this.updateCanvasSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    await this.libraryManager.preloadDependencies(this.collectLayerDependencies(config.layers));

    await this.rendererFactory.initialize({
      canvas: this.offscreenCanvas,
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
      libraries: this.libraryManager.getAllLibraries()
    });

    const layerTypes = new Set(config.layers.map(l => l.type));
    const loadPromises = Array.from(layerTypes).map(type =>
      this.rendererFactory.getRendererForLayerType(type)
    );
    await Promise.all(loadPromises);

    await this.preloadResources(config.layers);
  }

  /**
   */
  async updateConfig(config: TemplateConfig): Promise<void> {
    this.config = config;
  }

  /**
   */
  private isLayerDynamic(layer: TemplateLayer): boolean {
    if (layer.type === 'poster-static') {
      return false;
    }

    if (layer.animations && layer.animations.length > 0) {
      return true;
    }

    if (layer.type === 'custom-code') {
      const code = (layer.properties as any)?.code || (layer as any).code || '';

      if (/\banime\b/.test(code) || /\bgsap\b/.test(code) || /\bTWEEN\b/.test(code)) {
        return true;
      }

      if (/\binit\s*\(/.test(code)) {
        return true;
      }

      const codeWithoutComments = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      const timePattern = /\b(timestamp|frame|Date\.now|performance\.now|Math\.sin|Math\.cos)\b|\btime\b|\bt\s*[*+\-/%]|[*+\-/%]\s*t\b/;
      return timePattern.test(codeWithoutComments);
    }

    return false;
  }

  /**
   */
  private getLayerCache(layerId: string, width: number, height: number): OffscreenCanvas {
    let cache = this.layerCache.get(layerId);

    if (!cache || cache.canvas.width !== width || cache.canvas.height !== height) {
      const canvas = new OffscreenCanvas(width, height);
      cache = {
        canvas,
        lastRenderTime: -1,
        isDynamic: false
      };
      this.layerCache.set(layerId, cache);
    }

    return cache.canvas;
  }

  /**
   */
  async render(time: number): Promise<void> {
    if (!this.config) {
      console.error('[TemplateRenderer] No config loaded!');
      throw new Error('Template config is not loaded. Call load() first.');
    }

    if (this.offscreenCanvas.width === 0 || this.offscreenCanvas.height === 0) {
      console.error('[TemplateRenderer] Offscreen canvas has invalid dimensions (0x0).');
      if (this.mainCanvas.width > 0 && this.mainCanvas.height > 0) {
        this.updateCanvasSize(this.mainCanvas.width, this.mainCanvas.height).catch(err => {
          console.error('Failed to update canvas size:', err);
        });
      }
      return;
    }

    // Clear offscreen canvas with black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sortedLayers = this.sortLayersByZIndex(this.config.layers);

    const visibleLayers = sortedLayers.filter(layer => this.isLayerVisible(layer, time));

    for (const layer of visibleLayers) {
      await this.renderLayerWithCache(layer, time);
    }
  }

  /**
   */
  private async renderLayerWithCache(layer: TemplateLayer, time: number): Promise<void> {
    const cache = this.layerCache.get(layer.id);
    const isDynamic = this.isLayerDynamic(layer);

    const needsRerender = !cache ||
      cache.lastRenderTime === -1 ||
      (isDynamic && cache.lastRenderTime !== time);

    if (needsRerender) {
      this.cacheMisses++;

      const cacheCanvas = this.getLayerCache(
        layer.id,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height
      );
      const cacheCtx = cacheCanvas.getContext('2d')!;

      cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
      cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
      if (this.renderScale !== 1) {
        cacheCtx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
      }

      const runtimeLocalTime = (layer.properties as any)?.__runtimeLocalTime;
      const relativeTime = typeof runtimeLocalTime === 'number'
        ? runtimeLocalTime
        : Math.max(0, time - (layer.startTime || 0));

      const logicalWidth = cacheCanvas.width / this.renderScale;
      const logicalHeight = cacheCanvas.height / this.renderScale;
      const cacheRenderContext: RenderContext = {
        mainCanvas: cacheCanvas,
        mainContext: cacheCtx,
        width: logicalWidth,
        height: logicalHeight,
        pixelRatio: ((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) * this.renderScale,
        time: relativeTime,
        isExporting: this.isExporting,
        container: this.container
      };

      await this.renderLayer(layer, time, cacheRenderContext);

      const cacheEntry = this.layerCache.get(layer.id)!;
      cacheEntry.lastRenderTime = time;
      cacheEntry.isDynamic = isDynamic;
    } else {
      this.cacheHits++;
    }

    const cacheCanvas = this.layerCache.get(layer.id)!.canvas;
    const props = layer.properties as any;

    const opacity = props?.opacity ?? layer.opacity ?? 1;
    const hasOpacity = opacity !== 1;

    if (hasOpacity) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      this.ctx.drawImage(cacheCanvas as any, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(cacheCanvas as any, 0, 0);
    }
  }

  /**
   */
  private async renderLayer(layer: TemplateLayer, time: number, context?: RenderContext): Promise<void> {
    let renderer = this.rendererFactory.getRendererForLayerTypeSync(layer.type);

    if (!renderer) {
      console.warn(`Renderer not loaded for layer type: ${layer.type}, attempting async load...`);
      this.rendererFactory.getRendererForLayerType(layer.type).then(r => {
        void r;
      });
      return;
    }

    try {
      const renderContext: RenderContext = context || (() => {
        const runtimeLocalTime = (layer.properties as any)?.__runtimeLocalTime;
        const relativeTime = typeof runtimeLocalTime === 'number'
          ? runtimeLocalTime
          : Math.max(0, time - (layer.startTime || 0));
        return {
          mainCanvas: this.offscreenCanvas,
          mainContext: this.ctx,
          width: this.offscreenCanvas.width,
          height: this.offscreenCanvas.height,
          pixelRatio: (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
          time: relativeTime,
          isExporting: this.isExporting,
          container: this.container
        };
      })();

      const targetCtx = renderContext.mainContext;

      targetCtx.save();
      try {
        await renderer.render(layer, renderContext, time);
      } finally {
        targetCtx.restore();
      }
    } catch (error) {
      console.error(`Renderer failed for layer "${layer.name}" (${layer.type}):`, error);
    }
  }

  /**
   */
  private applyTransform(props: LayerProperties): void {
    // 3. scale

    this.ctx.translate(props.x || 0, props.y || 0);

    if (props.rotation) {
      this.ctx.rotate((props.rotation * Math.PI) / 180);
    }

    if (props.scaleX !== undefined || props.scaleY !== undefined) {
      this.ctx.scale(props.scaleX || 1, props.scaleY || 1);
    }

  }

  /**
   */
  private getPropertiesAtTime(layer: TemplateLayer, time: number): LayerProperties {
    const props = { ...layer.properties };

    if (layer.animations && layer.animations.length > 0) {
      for (const animation of layer.animations) {
        const duration = animation.duration;
        const delay = animation.delay || 0;
        const animationStartTime = animation.startTime ?? (delay + (layer.startTime || 0));

        const localTime = time - animationStartTime;

        if (localTime < 0) {
          if (animation.property && animation.from !== undefined) {
            props[animation.property] = animation.from;
          }
          continue;
        }

        if (localTime > duration) {
          if (animation.property && animation.to !== undefined) {
            props[animation.property] = animation.to;
          }
          continue;
        }

        const progress = localTime / duration;
        const easedProgress = this.applyEasing(progress, animation.easing || 'linear');

        if (animation.property && animation.from !== undefined && animation.to !== undefined) {
          props[animation.property] = this.interpolate(
            animation.from,
            animation.to,
            easedProgress
          );
        }

        if (animation.keyframes && animation.property) {
          this.applyKeyframes(props, animation.keyframes, easedProgress, animation.property);
        }
      }
    }

    return props;
  }

  /**
   */
  private interpolate(from: number | string, to: number | string, progress: number): number | string {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * progress;
    }
    return progress < 0.5 ? from : to;
  }

  /**
   */
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  /**
   */
  private applyKeyframes(props: LayerProperties, keyframes: any[], progress: number, targetProperty: string): void {
    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];

      if (progress >= current.at && progress <= next.at) {
        const localProgress = (progress - current.at) / (next.at - current.at);

        if (typeof current.value === 'number' && typeof next.value === 'number') {
          const interpolatedValue = this.interpolate(current.value, next.value, localProgress);
          (props as any)[targetProperty] = interpolatedValue;
        }

        break;
      }
    }
  }

  /**
   */
  private isLayerVisible(layer: TemplateLayer, time: number): boolean {
    if (layer.visible === false) return false;

    const startTime = layer.startTime || 0;
    const endTime = layer.endTime !== undefined ? layer.endTime : Infinity;

    return time >= startTime && time <= endTime;
  }

  /**
   */
  private sortLayersByZIndex(layers: TemplateLayer[]): TemplateLayer[] {
    return [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }

  /**
   * (Simplified: Custom-code renderer handles its own loading)
   */
  private async preloadResources(layers: TemplateLayer[]): Promise<void> {
    // Legacy image preloading removed. 
    // CustomCodeRenderer handles its own dependencies via LibraryManager.
    return Promise.resolve();
  }

  /**
   */
  private async loadImage(url: string): Promise<void> {
    if (this.loadedImages.has(url)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages.set(url, img);
        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      if (url.startsWith("http://") || url.startsWith("https://")) {
        img.src = url;
      } else if (url.startsWith("file://")) {
        img.src = url;
      } else if (url.startsWith("/") || /^[a-zA-Z]:\\/.test(url)) {
        // Unix: /path/to/file
        // Windows: C:\path\to\file
        img.src = `file://${url}`;
      } else if (url.startsWith("data:")) {
        // Data URL (base64)
        img.src = url;
      } else {
        img.src = url;
      }
    });
  }

  private collectLayerDependencies(layers: TemplateLayer[]): string[] {
    const dependencies = new Set<string>();

    for (const layer of layers) {
      const layerDependencies = [
        ...this.readDependencyList((layer as any).dependencies),
        ...this.readDependencyList(layer.properties?.dependencies),
      ];

      for (const dependency of layerDependencies) {
        dependencies.add(dependency);
      }
    }

    return Array.from(dependencies);
  }

  private readDependencyList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  getCanvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.offscreenCanvas;
  }

  /**
   */
  getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   */
  private parseLinearGradient(gradientStr: string, props: LayerProperties): CanvasGradient | null {
    try {
      const colorStopsMatch = gradientStr.match(/linear-gradient\([^,]+,\s*(.+)\)/);
      if (!colorStopsMatch) return null;

      const colorStopsStr = colorStopsMatch[1];
      const stops = colorStopsStr.split(',').map(s => s.trim());

      const angleMatch = gradientStr.match(/(\d+)deg/);
      const angle = angleMatch ? parseInt(angleMatch[1]) : 180;

      const width = props.width || 100;
      const height = props.height || 100;

      let x0 = 0, y0 = 0, x1 = 0, y1 = height;

      if (angle === 0) {
        y0 = height; y1 = 0;
      } else if (angle === 90) {
        x0 = 0; x1 = width; y0 = 0; y1 = 0;
      } else if (angle === 135) {
        x0 = 0; y0 = 0; x1 = width; y1 = height;
      } else if (angle === 180) {
        y0 = 0; y1 = height;
      }

      const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);

      stops.forEach(stop => {
        const parts = stop.trim().match(/([#\w(),]+)\s+(\d+)%/);
        if (parts) {
          const color = parts[1];
          const position = parseInt(parts[2]) / 100;
          gradient.addColorStop(position, color);
        }
      });

      return gradient;
    } catch (error) {
      // console.error('Failed to parse gradient:', error);
      return null;
    }
  }

  /**
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  /**
   */
  reset(): void {
    this.rendererFactory.resetAll();
    this.layerCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   */
  dispose(): void {
    this.rendererFactory.dispose();
    this.loadedImages.clear();
    this.layerCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.config = null;
    this.ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }
}

