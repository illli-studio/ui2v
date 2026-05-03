import type { TemplateLayer, RenderContext } from '../types';

/**
 * LayerSDK
 */
export class LayerSDK {
    private _layer: TemplateLayer;
    private _context: RenderContext;

    constructor(layer: TemplateLayer, context: RenderContext) {
        this._layer = layer;
        this._context = context;
    }

    /**
     */
    public update(layer: TemplateLayer, context: RenderContext) {
        this._layer = layer;
        this._context = context;
    }

    /**
     */
    public getLayer(): TemplateLayer {
        return this._layer;
    }

    /**
     */
    public getProperties(): any {
        return this._layer.properties;
    }

    /**
     */
    public getProperty(key: string): any {
        return (this._layer.properties as any)[key];
    }

    /**
     */
    public getContext(): RenderContext {
        return this._context;
    }

    /**
     */
    public getCanvasContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
        return this._context.mainContext;
    }

    /**
     */
    public getLibraries(): Record<string, any> {
        return this._context.libraries || {};
    }

    /**
     */
    public getLibrary(name: string): any {
        return (this._context.libraries || {})[name.toLowerCase()];
    }

    /**
     */
    public getTimestamp(): number {
        return performance.now();
    }
}

/**
 */
export abstract class BaseLayer {
    protected sdk: LayerSDK;

    constructor(sdk: LayerSDK) {
        this.sdk = sdk;
    }

    /**
     */
    init(context: RenderContext): void { }

    /**
     */
    abstract render(time: number, context: RenderContext): void;

    /**
     */
    dispose(): void { }
}
