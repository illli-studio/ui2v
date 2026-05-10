/**
 * Core rendering types for ui2v.
 */

export type AnimationMode = 'template';

export interface AnimationProject {
  id: string;
  title?: string;
  description?: string;
  name?: string;
  mode: AnimationMode;
  template?: TemplateConfig;
  code?: CodeConfig;
  duration: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  backgroundColor?: string;
  assetBaseUrl?: string;
  assetBaseDir?: string;
  __assetBaseUrl?: string;
  __assetBaseDir?: string;
}

export interface TemplateConfig {
  layers: TemplateLayer[];
  animations?: Animation[];
  duration?: number;
}

export type LayerType =
  | 'custom-code'
  | 'poster-static'
  | 'image-layer'
  | 'video-layer'
  | 'audio-layer'
  | 'static-text'
  | 'static-image'
  | 'static-shape'
  | 'static-gradient';

export interface TemplateLayer {
  id: string;
  type: LayerType | string;
  name?: string;
  zIndex?: number;
  startTime?: number;
  endTime?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  properties?: LayerProperties;
  animations?: Animation[];
}

export type AnimationLayer = TemplateLayer;

export interface LayerProperties {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  width?: number;
  height?: number;
  /** Primary media source for image-layer, video-layer, and audio-layer. */
  src?: string;
  /**
   * Optional still frame for video-layer. Export uses this as a visual fallback
   * if the browser has not decoded the requested video frame yet.
   */
  posterSrc?: string;
  fitMode?: 'contain' | 'cover' | 'stretch';
  muted?: boolean;
  volume?: number;
  loop?: boolean;
  trimStart?: number;
  trimEnd?: number;
  fadeIn?: number;
  fadeOut?: number;
  code?: string;
  dependencies?: string[];
  _cachedBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  _lastBoundsDetection?: number;
  [key: string]: any;
}

export interface AnimationTemplate {
  id: number;
  name: string;
  category?: string;
  projectData: any;
}

export interface AnimationKeyframe {
  id: string;
  timestamp: number;
  properties: any;
  easing?: string;
}

export interface AnimationAsset {
  id: number;
  name: string;
  type: 'svg' | 'image' | 'audio' | 'video' | 'lottie' | string;
  filePath: string;
  thumbnailPath?: string;
  metadata?: any;
  createdAt?: Date;
}

export interface Animation {
  id?: string;
  type?: string;
  property?: string;
  from?: number | string;
  to?: number | string;
  duration: number;
  delay?: number;
  startTime?: number;
  easing?: string;
  loop?: boolean;
  yoyo?: boolean;
  keyframes?: Keyframe[];
}

export interface Keyframe {
  at: number;
  [property: string]: number | string;
}

export interface CodeConfig {
  language: 'typescript' | 'javascript';
  source: string;
  dependencies: string[];
}

export interface AnimationContext {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface AnimationInstance {
  init?: () => void;
  animate: (timestamp: number) => void;
  dispose?: () => void;
}

export interface CustomCodeRendererInstance {
  init?: () => void;
  render: (time: number, context: RenderContext) => void;
  dispose?: () => void;
}

export interface RenderContext {
  mainCanvas: HTMLCanvasElement | OffscreenCanvas;
  mainContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
  /**
   * Local layer time in seconds. For a layer with startTime=10, this is 0
   * at project time 10. Custom-code render(time, context) receives this value.
   */
  time: number;
  /** Absolute project timeline time in seconds. */
  absoluteTime?: number;
  /** Layer start time on the project timeline in seconds. */
  layerStartTime?: number;
  /** Layer end time on the project timeline in seconds. */
  layerEndTime?: number;
  /** Layer duration in seconds. */
  duration?: number;
  /** Layer-local progress clamped to 0..1. */
  progress?: number;
  /** Current frame based on local layer time and fps. */
  frame?: number;
  /** Render frame rate. */
  fps?: number;
  isExporting?: boolean;
  assetBaseUrl?: string;
  assetBaseDir?: string;
  libraries?: Record<string, any>;
  container?: HTMLElement;
  loadIcon?: (iconName: string) => Promise<string>;
  drawSVG?: (svgString: string, x: number, y: number, width: number, height: number) => void;
}

export interface RenderPipelineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  enableCache?: boolean;
  enableWorkers?: boolean;
  maxWorkers?: number;
  pixelRatio?: number;
}

export interface ExportOptions {
  format: 'mp4';
  quality: 'low' | 'medium' | 'high' | 'ultra' | 'cinema';
  fps?: number;
  width?: number;
  height?: number;
  renderScale?: number;
}

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  renderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export class CodeExecutionError extends Error {
  constructor(cause: Error | unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Code execution failed: ${message}`);
    this.name = 'CodeExecutionError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RendererError extends Error {
  constructor(message: string, public rendererType?: string) {
    super(message);
    this.name = 'RendererError';
  }
}
