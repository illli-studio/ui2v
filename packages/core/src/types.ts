/**
 * Core types for ui2v
 */

export type ResolutionPreset = '1080p' | '720p' | '4K' | '9:16' | '1:1';

export interface Resolution {
  width: number;
  height: number;
}

export interface AnimationProject {
  id: string;
  version?: string;
  mode: 'template' | 'code';
  duration: number;
  fps: number;
  resolution: Resolution | ResolutionPreset | string;
  template?: TemplateConfig;
  code?: CodeConfig;
  assets?: ProjectAssets;
  variables?: Record<string, any>;
  isPoster?: boolean;
}

export interface TemplateConfig {
  background?: BackgroundConfig;
  layers: Layer[];
}

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image' | 'video';
  value: string;
  opacity?: number;
}

export interface Layer {
  id: string;
  type: LayerType;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  startTime?: number;
  duration?: number;
  zIndex?: number;
  opacity?: number;
  blendMode?: string;
  transform?: Transform;
  animation?: AnimationConfig;
  [key: string]: any;
}

export type LayerType = 
  | 'text'
  | 'image'
  | 'video'
  | 'shape'
  | 'group'
  | 'html'
  | 'canvas'
  | 'custom-code'
  | 'three'
  | 'poster-static';

export interface Transform {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  skewX?: number;
  skewY?: number;
  originX?: number;
  originY?: number;
}

export interface AnimationConfig {
  in?: AnimationEffect;
  out?: AnimationEffect;
  timeline?: TimelineAnimation[];
}

export interface AnimationEffect {
  type: string;
  duration: number;
  delay?: number;
  easing?: string;
  properties?: Record<string, any>;
}

export interface TimelineAnimation {
  time: number;
  duration: number;
  properties: Record<string, any>;
  easing?: string;
}

export interface CodeConfig {
  html: string;
  css?: string;
  javascript?: string;
  libraries?: string[];
}

export interface ProjectAssets {
  images?: AssetReference[];
  videos?: AssetReference[];
  audio?: AssetReference[];
  fonts?: FontReference[];
}

export interface AssetReference {
  id: string;
  url: string;
  name?: string;
  type?: string;
}

export interface FontReference {
  family: string;
  url?: string;
  weights?: number[];
  styles?: string[];
}

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'prores' | 'png' | 'jpg' | 'live';
  quality: 'low' | 'medium' | 'high' | 'ultra' | 'cinema';
  fps?: number;
  width?: number;
  height?: number;
  codec?: 'avc' | 'hevc' | 'vp9';
  imageScale?: number;
  oversample?: boolean;
}

export interface RenderProgress {
  phase: 'rendering' | 'encoding' | 'finalizing' | 'complete';
  progress: number;
  currentFrame: number;
  totalFrames: number;
  fps?: number;
  estimatedTimeRemaining?: number;
}

export const RESOLUTIONS: Record<ResolutionPreset, Resolution> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '4K': { width: 3840, height: 2160 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

export const DEFAULT_FPS = 60;

export const SUPPORTED_LIBRARIES = [
  'gsap',
  'animejs',
  'three',
  'd3',
  'fabric',
  'pixi',
  'p5',
  'matter',
  'cannon',
  'chart',
  'lottie',
] as const;

export type SupportedLibrary = typeof SUPPORTED_LIBRARIES[number];
