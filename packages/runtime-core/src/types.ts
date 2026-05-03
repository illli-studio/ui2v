import type { AnimationProject } from '@ui2v/core';

export interface RuntimeResolution {
  width: number;
  height: number;
}

export interface RuntimeTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
  originX: number;
  originY: number;
}

export interface RuntimeMatrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface RuntimeTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RuntimeKeyframe {
  at: number;
  value?: unknown;
  properties?: Record<string, unknown>;
  easing?: string;
}

export interface RuntimeMotionTrack {
  id?: string;
  property: string;
  from?: unknown;
  to?: unknown;
  startTime: number;
  duration: number;
  easing: string;
  loop: boolean;
  yoyo: boolean;
  keyframes?: RuntimeKeyframe[];
}

export interface RuntimeMarker {
  id: string;
  time: number;
  label?: string;
  data?: Record<string, unknown>;
}

export interface RuntimeSegment {
  id: string;
  startTime: number;
  endTime: number;
  label?: string;
  dependencies?: string[];
  nodeIds?: string[];
  data?: Record<string, unknown>;
  transition?: RuntimeTransition;
  camera?: RuntimeCameraShot;
}

export interface RuntimeProjectSegment {
  id: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  label?: string;
  dependencies?: string[];
  data?: Record<string, unknown>;
  transition?: RuntimeTransition;
  camera?: RuntimeCameraShot;
  layers?: RuntimeProjectNode[];
  nodes?: RuntimeProjectNode[];
  children?: RuntimeProjectNode[];
  code?: string;
  customCode?: string;
  properties?: Record<string, unknown>;
}

export interface SceneNode {
  id: string;
  type: string;
  name?: string;
  parentId?: string;
  children: string[];
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode?: string;
  timing: RuntimeTiming;
  transform: RuntimeTransform;
  properties: Record<string, unknown>;
  dependencies: string[];
  motion: RuntimeMotionTrack[];
  source?: unknown;
}

export interface RuntimeProjectNode {
  id: string;
  type: string;
  name?: string;
  children?: RuntimeProjectNode[];
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  transform?: Partial<RuntimeTransform>;
  properties?: Record<string, unknown>;
  motion?: RuntimeMotionTrack[];
  animations?: RuntimeMotionTrack[];
}

export interface RuntimeProject {
  id: string;
  name?: string;
  version?: string;
  schema: 'uiv-runtime';
  duration: number;
  fps: number;
  resolution: RuntimeResolution;
  backgroundColor?: string;
  variables?: Record<string, unknown>;
  theme?: RuntimeTheme;
  datasets?: Record<string, unknown>;
  assets?: Record<string, RuntimeAssetSource | string>;
  narration?: RuntimeNarrationCue[];
  audio?: RuntimeAudioTimeline;
  camera?: RuntimeCameraShot;
  segments?: RuntimeProjectSegment[];
  timeline?: {
    segments?: RuntimeProjectSegment[];
  };
  scene: {
    root?: RuntimeProjectNode;
    nodes?: RuntimeProjectNode[];
  };
}

export interface RuntimeTheme {
  font?: string;
  colors?: Record<string, string>;
  radius?: number;
  grid?: number;
  spacing?: number;
  [key: string]: unknown;
}

export interface RuntimeAssetSource {
  src: string;
  type?: 'image' | 'video' | 'audio' | 'font' | 'json' | 'text' | 'unknown';
  preload?: boolean;
  [key: string]: unknown;
}

export interface RuntimeNarrationCue {
  id?: string;
  time: number;
  duration?: number;
  text: string;
  speaker?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface RuntimeAudioMarker {
  id?: string;
  time: number;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
}

export interface RuntimeAudioTrack {
  id: string;
  src?: string;
  startTime?: number;
  duration?: number;
  volume?: number;
  loop?: boolean;
  data?: Record<string, unknown>;
}

export interface RuntimeAudioTimeline {
  tracks?: RuntimeAudioTrack[];
  markers?: RuntimeAudioMarker[];
  [key: string]: unknown;
}

export interface RuntimeCameraKeyframe {
  time: number;
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  fov?: number;
  rotation?: number;
  easing?: string;
}

export interface RuntimeCameraShot {
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  fov?: number;
  rotation?: number;
  motion?: RuntimeCameraKeyframe[];
  [key: string]: unknown;
}

export interface RuntimeCameraState {
  x: number;
  y: number;
  z: number;
  zoom: number;
  fov: number;
  rotation: number;
  effectiveZoom: number;
}

export interface RuntimeTransition {
  type?: string;
  duration?: number;
  easing?: string;
  direction?: string;
  [key: string]: unknown;
}

export interface SceneGraphSnapshot {
  rootId: string;
  nodes: SceneNode[];
}

export interface RuntimeComposition {
  id: string;
  name?: string;
  version?: string;
  duration: number;
  fps: number;
  resolution: RuntimeResolution;
  backgroundColor?: string;
  variables: Record<string, unknown>;
  theme: RuntimeTheme;
  datasets: Record<string, unknown>;
  assets: Record<string, RuntimeAssetSource>;
  narration: RuntimeNarrationCue[];
  audio?: RuntimeAudioTimeline;
  camera: RuntimeCameraShot;
  markers: RuntimeMarker[];
  segments: RuntimeSegment[];
  dependencies: string[];
  sourceProject: AnimationProject | Record<string, unknown>;
}

export interface EvaluatedNode {
  id: string;
  type: string;
  name?: string;
  parentId?: string;
  zIndex: number;
  visible: boolean;
  opacity: number;
  blendMode?: string;
  localTime: number;
  localTransform: RuntimeTransform;
  transform: RuntimeTransform;
  localMatrix: RuntimeMatrix2D;
  worldMatrix: RuntimeMatrix2D;
  properties: Record<string, unknown>;
  dependencies: string[];
  source?: unknown;
}

export interface RuntimeFrame {
  composition: RuntimeComposition;
  time: number;
  frame: number;
  fps: number;
  progress: number;
  markers: RuntimeMarker[];
  activeSegment?: RuntimeSegment;
  camera: RuntimeCameraState;
  transition?: RuntimeTransition & {
    phase: 'in' | 'out';
    progress: number;
    fromSegmentId?: string;
    toSegmentId?: string;
  };
  activeNarration: RuntimeNarrationCue[];
  activeAudioMarkers: RuntimeAudioMarker[];
  dependencies: string[];
  nodes: EvaluatedNode[];
}

export interface RuntimeClock {
  now(): number;
  requestTick(callback: () => void): number;
  cancelTick(id: number): void;
}

export type SchedulerStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface SchedulerState {
  status: SchedulerStatus;
  time: number;
  frame: number;
}

export interface EngineAdapterCapabilities {
  renderer: string;
  renderers?: string[];
  nodeTypes?: string[];
  dependencies?: string[];
  supportsPreview: boolean;
  supportsExport: boolean;
  supportsHeadless: boolean;
  supportsIncrementalUpdate: boolean;
}

export interface EngineAdapterContext {
  composition: RuntimeComposition;
  scene: SceneGraphSnapshot;
}

export interface EngineAdapter {
  readonly id: string;
  readonly capabilities: EngineAdapterCapabilities;
  initialize(context: EngineAdapterContext): Promise<void> | void;
  render(frame: RuntimeFrame): Promise<void> | void;
  renderPlan?(plan: import('./render-plan/RenderPlan').RenderPlan, frame: RuntimeFrame): Promise<void> | void;
  renderCommands?(commands: import('./draw-commands/DrawCommand').DrawCommandStream, frame: RuntimeFrame): Promise<void> | void;
  resize?(resolution: RuntimeResolution): Promise<void> | void;
  dispose(): Promise<void> | void;
}
