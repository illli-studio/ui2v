/**
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
  libraries?: Record<string, any>;
  assetBaseUrl?: string;
  assetBaseDir?: string;
}

export interface IRenderer {
  readonly type: RendererType;
  readonly capabilities: RendererCapabilities;

  /**
   */
  initialize(config: RendererConfig): Promise<void>;

  /**
   */
  render(layer: TemplateLayer, context: RenderContext, time: number): void | Promise<void>;

  /**
   */
  renderBatch?(layers: TemplateLayer[], context: RenderContext, timestamp: number): void;

  /**
   */
  preload?(layer: TemplateLayer): Promise<void>;

  /**
   */
  supports(layerType: string): boolean;

  /**
   */
  reset?(): void;

  /**
   */
  dispose(): void;
}


