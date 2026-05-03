/**
 * 渲染器基类
 * 提供通用功能实现
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
    // 子类可以重写此方法
  }

  abstract dispose(): void;

  /**
   * 检查是否已初始化
   */
  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(`${this.type} 渲染器未初始化`);
    }
  }
}



