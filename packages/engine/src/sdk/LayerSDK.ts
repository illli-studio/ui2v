import type { TemplateLayer, RenderContext } from '../types';

/**
 * LayerSDK
 * 提供给开发者在 custom-code 和 threejs 图层中调用的官方 SDK
 */
export class LayerSDK {
    private _layer: TemplateLayer;
    private _context: RenderContext;

    constructor(layer: TemplateLayer, context: RenderContext) {
        this._layer = layer;
        this._context = context;
    }

    /**
     * 更新最新的图层状态和渲染上下文
     */
    public update(layer: TemplateLayer, context: RenderContext) {
        this._layer = layer;
        this._context = context;
    }

    /**
     * 获取当前图层对象
     */
    public getLayer(): TemplateLayer {
        return this._layer;
    }

    /**
     * 获取当前图层的所有属性
     */
    public getProperties(): any {
        return this._layer.properties;
    }

    /**
     * 获取单项图层属性
     */
    public getProperty(key: string): any {
        return (this._layer.properties as any)[key];
    }

    /**
     * 获取当前的渲染上下文（Canvas, Width, Height 等）
     */
    public getContext(): RenderContext {
        return this._context;
    }

    /**
     * 获取主 Canvas 2D 上下文
     */
    public getCanvasContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
        return this._context.mainContext;
    }

    /**
     * 获取所有已加载的动画库 (THREE, anime, Matter 等)
     */
    public getLibraries(): Record<string, any> {
        return this._context.libraries || {};
    }

    /**
     * 获取指定名称的库
     */
    public getLibrary(name: string): any {
        return (this._context.libraries || {})[name.toLowerCase()];
    }

    /**
     * 获取系统高精度时间戳（毫秒）
     * ⚠️ 注意：返回的是 performance.now() 毫秒值，不是动画秒时间。
     * 动画当前时间应从 render(time, context) 的 time 参数读取（单位：秒）。
     */
    public getTimestamp(): number {
        return performance.now();
    }
}

/**
 * 基础图层类，供 custom-code 继承
 */
export abstract class BaseLayer {
    protected sdk: LayerSDK;

    constructor(sdk: LayerSDK) {
        this.sdk = sdk;
    }

    /**
     * 初始化 (可选)
     */
    init(context: RenderContext): void { }

    /**
     * 渲染每一帧 (必须实现)
     * @param time 当前时间（秒）
     * @param context 渲染上下文
     */
    abstract render(time: number, context: RenderContext): void;

    /**
     * 销毁 (可选)
     */
    dispose(): void { }
}
