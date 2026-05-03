import { BaseRenderer } from './base/BaseRenderer';
import { RendererType, type IRenderer, type RendererConfig, type RendererCapabilities } from './base/IRenderer';
import type { TemplateLayer, RenderContext } from '../types';
import { CustomCodeRenderer } from './CustomCodeRenderer';

export class PosterStaticRenderer extends BaseRenderer implements IRenderer {
  readonly type = RendererType.PosterStatic;
  readonly capabilities: RendererCapabilities = {
    supportedLayerTypes: ['poster-static'],
    supportsWebGL: true,
    supportsOffscreenCanvas: true,
    maxTextureSize: 0,
    supportsShaders: true,
    supportsBatchRendering: false
  };

  private readonly delegate = new CustomCodeRenderer();

  async initialize(config: RendererConfig): Promise<void> {
    await super.initialize(config);
    await this.delegate.initialize(config);
  }

  render(layer: TemplateLayer, context: RenderContext, time: number): void | Promise<void> {
    if (context.isExporting) {
      // Preserve existing export behavior (do not force static time).
      return this.delegate.render(layer, context, time);
    }

    const staticContext: RenderContext = {
      ...context,
      time: 0
    };

    return this.delegate.render(layer, staticContext, 0);
  }

  supports(layerType: string): boolean {
    return layerType === 'poster-static';
  }

  reset(): void {
    this.delegate.reset?.();
  }

  dispose(): void {
    this.delegate.dispose();
  }
}
