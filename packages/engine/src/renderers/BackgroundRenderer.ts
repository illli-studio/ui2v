import { BaseRenderer } from './base/BaseRenderer';
import { RendererType, type IRenderer, type RendererConfig, type RendererCapabilities } from './base/IRenderer';
import type { TemplateLayer, RenderContext } from '../types';

interface BackgroundProperties {
    color?: string;
    imageUrl?: string;
    gradient?: string;
}

export class BackgroundRenderer extends BaseRenderer implements IRenderer {
    readonly type = RendererType.Background;
    readonly capabilities: RendererCapabilities = {
        supportedLayerTypes: ['background'],
        supportsWebGL: false,
        supportsOffscreenCanvas: true,
        maxTextureSize: 0,
        supportsShaders: false,
        supportsBatchRendering: false
    };

    private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

    private static readonly GRADIENT_PRESETS: Record<string, string[]> = {
        'deep_space': ['#000000', '#0a0a20', '#1a1a40'],
        'ocean': ['#001f3f', '#0074D9', '#7FDBFF'],
        'sunset': ['#FF4136', '#FF851B', '#FFDC00'],
        'forest': ['#001f3f', '#2ECC40', '#01FF70']
    };

    constructor() {
        super();
    }

    async initialize(config: RendererConfig): Promise<void> {
        await super.initialize(config);
        this.ctx = config.canvas.getContext('2d');
    }

    render(layer: TemplateLayer, context: RenderContext, time: number): void {
        if (!this.ctx) return;
        const properties = layer.properties as any;

        this.ctx.save();

        if (properties.backgroundType === 'gradient' || properties.backgroundGradientPreset) {
            const preset = properties.backgroundGradientPreset || 'deep_space';
            const colors = BackgroundRenderer.GRADIENT_PRESETS[preset] || ['#000000', '#333333'];

            const gradient = this.ctx.createLinearGradient(0, 0, 0, context.height);
            colors.forEach((color, index) => {
                gradient.addColorStop(index / (colors.length - 1), color);
            });

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, context.width, context.height);
        } else if (properties.color) {
            this.ctx.fillStyle = properties.color;
            this.ctx.fillRect(0, 0, context.width, context.height);
        }

        this.ctx.restore();
    }

    dispose(): void {
        this.ctx = null;
    }
}
