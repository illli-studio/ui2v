/**
 */

import type { IRenderer, RendererType, RendererCapabilities, RendererConfig } from './IRenderer';
import type { TemplateLayer, RenderContext } from '../../types';

export abstract class BaseRenderer implements IRenderer {
  abstract readonly type: RendererType;
  abstract readonly capabilities: RendererCapabilities;

  protected config: RendererConfig | null = null;
  protected initialized = false;

  async initialize(config: RendererConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  abstract render(layer: TemplateLayer, context: RenderContext, time: number): void;

  supports(layerType: string): boolean {
    return this.capabilities.supportedLayerTypes.includes(layerType);
  }

  reset(): void {
  }

  abstract dispose(): void;

  /**
   */
  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(`${this.type} renderer is not initialized`);
    }
  }
}



