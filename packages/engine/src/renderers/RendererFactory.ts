
import type { IRenderer, RendererConfig } from './base/IRenderer';
import { CustomCodeRenderer } from './CustomCodeRenderer';
import { PosterStaticRenderer } from './PosterStaticRenderer';
import { MediaLayerRenderer } from './MediaLayerRenderer';
import type { LayerType } from '../types';

export class RendererFactory {
  private renderers: Map<string, IRenderer> = new Map();
  private config: RendererConfig | null = null;
  private loadingRenderers: Map<string, Promise<IRenderer>> = new Map();

  async initialize(config: RendererConfig): Promise<void> {
    this.config = config;

    await this.loadRenderer('custom-code');
  }

  private async loadRenderer(rendererKey: string): Promise<IRenderer> {
    if (this.renderers.has(rendererKey)) {
      return this.renderers.get(rendererKey)!;
    }

    if (this.loadingRenderers.has(rendererKey)) {
      return await this.loadingRenderers.get(rendererKey)!;
    }

    const loadPromise = this.createRenderer(rendererKey);
    this.loadingRenderers.set(rendererKey, loadPromise);

    try {
      const renderer = await loadPromise;
      this.renderers.set(rendererKey, renderer);
      return renderer;
    } finally {
      this.loadingRenderers.delete(rendererKey);
    }
  }

  private async createRenderer(rendererKey: string): Promise<IRenderer> {
    if (!this.config) {
      throw new Error('RendererFactory not initialized');
    }

    let renderer: IRenderer;

    switch (rendererKey) {
      case 'custom-code':
        renderer = new CustomCodeRenderer();
        break;
      case 'poster-static':
        renderer = new PosterStaticRenderer();
        break;
      case 'media':
        renderer = new MediaLayerRenderer();
        break;
      default:
        console.warn(`[RendererFactory] Unknown renderer type '${rendererKey}', using CustomCodeRenderer.`);
        renderer = new CustomCodeRenderer();
        break;
    }

    await renderer.initialize(this.config);
    return renderer;
  }

  private static readonly LAYER_MAPPING: Record<string, string> = {
    'custom-code': 'custom-code',
    'poster-static': 'poster-static',
    'image-layer': 'media',
    'video-layer': 'media',
    'audio-layer': 'media'
  };

  getRendererForLayerTypeSync(layerType: string): IRenderer | null {
    const rendererKey = RendererFactory.LAYER_MAPPING[layerType] || 'custom-code';
    return this.renderers.get(rendererKey) || null;
  }

  async getRendererForLayerType(layerType: LayerType | string): Promise<IRenderer | null> {
    let rendererKey = RendererFactory.LAYER_MAPPING[layerType];

    if (!rendererKey) {
      console.warn(`[RendererFactory] Legacy/Unknown layer type ${layerType}, defaulting to custom-code`);
      rendererKey = 'custom-code';
    }

    try {
      const renderer = await this.loadRenderer(rendererKey);
      return renderer;
    } catch (error) {
      console.error(`[RendererFactory] Failed to load renderer ${rendererKey}:`, error);
      return null;
    }
  }

  getAllRenderers(): IRenderer[] {
    return Array.from(this.renderers.values());
  }

  getSupportedRenderers(layerType: LayerType | string): IRenderer[] {
    const supported: IRenderer[] = [];
    for (const renderer of this.renderers.values()) {
      if (renderer.supports(layerType as LayerType)) {
        supported.push(renderer);
      }
    }
    return supported;
  }

  resetAll(): void {
    for (const renderer of this.renderers.values()) {
      renderer.reset?.();
    }
  }

  dispose(): void {
    for (const renderer of this.renderers.values()) {
      renderer.dispose();
    }
    this.renderers.clear();
  }
}
