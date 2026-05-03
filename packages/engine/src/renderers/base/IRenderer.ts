/**
 * 渲染器统一接口
 * 所有渲染器必须实现此接口
 */

import type { TemplateLayer, RenderContext } from '../../types';

export enum RendererType {
  Canvas2D = 'canvas2d',
  Konva = 'konva',
  PaperJS = 'paperjs',
  ThreeJS = 'threejs',
  Lottie = 'lottie',
  Video = 'video',
  Custom = 'custom',
  PosterStatic = 'poster-static',
  Group = 'group',
  Matter = 'matter',
  Fabric = 'fabric',
  Rough = 'rough',
  Pixi = 'pixi',
  Anime = 'anime',
  P5 = 'p5',
  D3 = 'd3',
  Background = 'background',
  Iconify = 'iconify'
}

export interface RendererCapabilities {
  supportedLayerTypes: string[];
  supportsWebGL: boolean;
  supportsOffscreenCanvas: boolean;
  maxTextureSize: number;
  supportsShaders: boolean;
  supportsBatchRendering: boolean;
}

export interface RendererConfig {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  pixelRatio?: number;
  enableCache?: boolean;
  libraries?: Record<string, any>;  // v2.1: 提供所有已加载的动画库
}

export interface IRenderer {
  readonly type: RendererType;
  readonly capabilities: RendererCapabilities;

  /**
   * 初始化渲染器
   */
  initialize(config: RendererConfig): Promise<void>;

  /**
   * 渲染单个图层
   * @param layer 图层配置
   * @param context 渲染上下文
   * @param time 当前时间（秒）
   */
  render(layer: TemplateLayer, context: RenderContext, time: number): void | Promise<void>;

  /**
   * 批量渲染多个图层（性能优化）
   */
  renderBatch?(layers: TemplateLayer[], context: RenderContext, timestamp: number): void;

  /**
   * 预加载资源
   */
  preload?(layer: TemplateLayer): Promise<void>;

  /**
   * 检查是否支持该图层类型
   */
  supports(layerType: string): boolean;

  /**
   * 重置渲染器状态
   */
  reset?(): void;

  /**
   * 清理资源
   */
  dispose(): void;
}



