import type {
  EngineAdapter,
  EngineAdapterCapabilities,
  EngineAdapterContext,
  RuntimeFrame,
  RuntimeMatrix2D,
  RuntimeResolution,
  RenderPlan,
  DrawCommandStream,
  DrawLayerCommand,
} from '@ui2v/runtime-core';
import { createAdapterRoutingPlan, createDrawCommandStream, globalAdapterRegistry } from '@ui2v/runtime-core';
import { OptimizedHybridEngine } from '../core/OptimizedHybridEngine';
import { CanvasDrawCommandExecutor, type CanvasDrawCommandExecutionResult } from '../draw/CanvasDrawCommandExecutor';
import type { AnimationProject, TemplateLayer } from '../types';

export interface TemplateCanvasAdapterOptions {
  canvas: HTMLCanvasElement;
  container?: HTMLElement;
  pixelRatio?: number;
  enablePerformanceMonitoring?: boolean;
  enableAutoQualityAdjust?: boolean;
}

export class TemplateCanvasAdapter implements EngineAdapter {
  readonly id = 'ui2v.template-canvas';
  readonly capabilities: EngineAdapterCapabilities = {
    renderer: 'canvas2d-template',
    renderers: ['canvas2d-template'],
    nodeTypes: ['custom-code', 'poster-static', 'image-layer', 'video-layer', 'audio-layer', 'static-text', 'static-image', 'static-shape', 'static-gradient'],
    dependencies: ['canvas2d'],
    supportsPreview: true,
    supportsExport: true,
    supportsHeadless: false,
    supportsIncrementalUpdate: true,
  };

  private engine: OptimizedHybridEngine | null = null;
  private project: AnimationProject | null = null;
  private lastCommandExecution: CanvasDrawCommandExecutionResult | null = null;

  constructor(private readonly options: TemplateCanvasAdapterOptions) {}

  async initialize(context: EngineAdapterContext): Promise<void> {
    this.project = runtimeContextToProject(context);
    this.engine = new OptimizedHybridEngine(this.options.canvas, {
      container: this.options.container,
      enablePerformanceMonitoring: this.options.enablePerformanceMonitoring ?? false,
      enableAutoQualityAdjust: this.options.enableAutoQualityAdjust ?? false,
    });
    await this.engine.loadProject(this.project);

    const pixelRatio = normalizePixelRatio(this.options.pixelRatio);
    if (pixelRatio !== 1) {
      const resolution = context.composition.resolution;
      this.engine.setPreviewPixelRatio(resolution.width, resolution.height, pixelRatio);
    }
  }

  async render(frame: RuntimeFrame): Promise<void> {
    const cameraMatrix = createCameraMatrix(frame);
    await this.renderPlan({
      time: frame.time,
      frame: frame.frame,
      fps: frame.fps,
      dependencies: frame.dependencies,
      activeSegmentId: frame.activeSegment?.id,
      markerIds: frame.markers.map(marker => marker.id),
      itemCount: frame.nodes.length,
      items: frame.nodes.map(node => ({
        nodeId: node.id,
        type: node.type,
        zIndex: node.zIndex,
        opacity: node.opacity,
        localTime: node.localTime,
        worldMatrix: multiplyMatrix(cameraMatrix, node.worldMatrix),
        dependencies: node.dependencies,
        properties: {
          ...node.properties,
          opacity: node.opacity,
          __runtimeLocalTime: node.localTime,
          __runtimeLocalMatrix: node.localMatrix,
          __runtimeWorldMatrix: multiplyMatrix(cameraMatrix, node.worldMatrix),
          __runtimeNodeWorldMatrix: node.worldMatrix,
          __runtimeTheme: frame.composition.theme,
          __runtimeDatasets: frame.composition.datasets,
          __runtimeAssets: frame.composition.assets,
          __runtimeNarration: frame.activeNarration,
          __runtimeAudioMarkers: frame.activeAudioMarkers,
          __runtimeCamera: frame.camera,
          __runtimeTransition: frame.transition,
          __runtimeComposition: {
            id: frame.composition.id,
            name: frame.composition.name,
            duration: frame.composition.duration,
            fps: frame.composition.fps,
            resolution: frame.composition.resolution,
            assetBaseUrl: frame.composition.__assetBaseUrl ?? frame.composition.assetBaseUrl,
            assetBaseDir: frame.composition.__assetBaseDir ?? frame.composition.assetBaseDir,
          },
        },
        source: node.source,
      })),
    }, frame);
  }

  async renderPlan(plan: RenderPlan, frame: RuntimeFrame): Promise<void> {
    if (!this.engine) {
      throw new Error('TemplateCanvasAdapter has not been initialized');
    }

    const routingPlan = createAdapterRoutingPlan(plan);
    const commands = createDrawCommandStream(routingPlan, {
      backgroundColor: frame.composition.backgroundColor,
      size: frame.composition.resolution,
    });
    appendTransitionCommands(commands, frame);
    await this.renderCommands(commands, frame);
  }

  async renderCommands(commands: DrawCommandStream, frame: RuntimeFrame): Promise<void> {
    if (!this.engine) {
      throw new Error('TemplateCanvasAdapter has not been initialized');
    }

    const collectedLayers: TemplateLayer[] = [];
    const executor = new CanvasDrawCommandExecutor({
      canvas: this.options.canvas,
      onDrawLayer: command => {
        collectedLayers.push(drawLayerCommandToTemplateLayer(command));
      },
    });
    this.lastCommandExecution = await executor.execute(commands);

    if (this.project) {
      this.project = {
        ...this.project,
        template: {
          layers: collectedLayers,
          ...(this.project.__assetBaseUrl || this.project.assetBaseUrl
            ? { __assetBaseUrl: this.project.__assetBaseUrl ?? this.project.assetBaseUrl }
            : {}),
          ...(this.project.__assetBaseDir || this.project.assetBaseDir
            ? { __assetBaseDir: this.project.__assetBaseDir ?? this.project.assetBaseDir }
            : {}),
        },
      };
      await this.engine.hotUpdateProject(this.project);
    }

    await this.engine.renderFrameAsync(frame.time);
  }

  async resize(resolution: RuntimeResolution): Promise<void> {
    if (!this.project || !this.engine) {
      return;
    }

    this.project = {
      ...this.project,
      resolution,
    };
    await this.engine.hotUpdateProject(this.project);
  }

  dispose(): void {
    this.engine?.dispose();
    this.engine = null;
    this.project = null;
  }

  getEngine(): OptimizedHybridEngine | null {
    return this.engine;
  }

  getLastCommandExecution(): CanvasDrawCommandExecutionResult | null {
    return this.lastCommandExecution;
  }
}

function createCameraMatrix(frame: RuntimeFrame): RuntimeMatrix2D {
  const width = frame.composition.resolution.width;
  const height = frame.composition.resolution.height;
  const camera = frame.camera ?? { x: 0, y: 0, z: 0, zoom: 1, effectiveZoom: 1, rotation: 0 };
  const zoom = Number.isFinite(camera.effectiveZoom) && camera.effectiveZoom > 0
    ? camera.effectiveZoom
    : Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  const rotation = (Number.isFinite(camera.rotation) ? camera.rotation : 0) * Math.PI / 180;
  const cos = Math.cos(rotation) * zoom;
  const sin = Math.sin(rotation) * zoom;
  const cx = width / 2;
  const cy = height / 2;
  const panX = Number.isFinite(camera.x) ? camera.x : 0;
  const panY = Number.isFinite(camera.y) ? camera.y : 0;

  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: cx + panX - cos * cx + sin * cy,
    f: cy + panY - sin * cx - cos * cy,
  };
}

function multiplyMatrix(left: RuntimeMatrix2D, right: RuntimeMatrix2D): RuntimeMatrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function appendTransitionCommands(commands: DrawCommandStream, frame: RuntimeFrame): void {
  if (!frame.transition) {
    return;
  }

  commands.commands.push({
    op: 'custom',
    name: 'runtime-transition-overlay',
    payload: {
      transition: frame.transition,
      size: frame.composition.resolution,
      backgroundColor: frame.composition.backgroundColor,
    },
  });
  commands.commandCount = commands.commands.length;
}

export const TEMPLATE_CANVAS_ADAPTER_ID = 'ui2v.template-canvas';

export function registerTemplateCanvasAdapter(): void {
  if (globalAdapterRegistry.has(TEMPLATE_CANVAS_ADAPTER_ID)) {
    return;
  }

  globalAdapterRegistry.register<TemplateCanvasAdapterOptions>(
    TEMPLATE_CANVAS_ADAPTER_ID,
    {
      renderer: 'canvas2d-template',
      renderers: ['canvas2d-template'],
      nodeTypes: ['custom-code', 'poster-static', 'image-layer', 'video-layer', 'audio-layer', 'static-text', 'static-image', 'static-shape', 'static-gradient'],
      dependencies: ['canvas2d'],
      supportsPreview: true,
      supportsExport: true,
      supportsHeadless: false,
      supportsIncrementalUpdate: true,
    },
    options => {
      if (!options?.canvas) {
        throw new Error('TemplateCanvasAdapter requires a canvas option');
      }
      return new TemplateCanvasAdapter(options);
    }
  );
}

function normalizePixelRatio(pixelRatio: number | undefined): number {
  if (pixelRatio === undefined || !Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return 1;
  }

  return Math.max(1, Math.min(4, pixelRatio));
}

function runtimeContextToProject(context: EngineAdapterContext): AnimationProject {
  return {
    id: context.composition.id,
    name: context.composition.name,
    mode: 'template',
    duration: context.composition.duration,
    fps: context.composition.fps,
    resolution: context.composition.resolution,
    backgroundColor: context.composition.backgroundColor,
    assetBaseUrl: (context.composition as any).assetBaseUrl,
    assetBaseDir: (context.composition as any).assetBaseDir,
    __assetBaseUrl: (context.composition as any).__assetBaseUrl,
    __assetBaseDir: (context.composition as any).__assetBaseDir,
    template: {
      layers: context.scene.nodes
        .filter(node => node.id !== context.scene.rootId)
        .map(node => node.source && typeof node.source === 'object'
          ? node.source as TemplateLayer
          : runtimeNodeToTemplateLayer(node)),
    },
  };
}

function runtimeNodeToTemplateLayer(node: EngineAdapterContext['scene']['nodes'][number]): TemplateLayer {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    zIndex: node.zIndex,
    startTime: node.timing.startTime,
    endTime: node.timing.endTime,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    blendMode: node.blendMode,
    properties: {
      ...node.properties,
      ...node.transform,
      opacity: node.opacity,
    },
    animations: node.motion.map(track => ({
      id: track.id,
      property: track.property,
      from: track.from as any,
      to: track.to as any,
      startTime: track.startTime,
      duration: track.duration,
      easing: track.easing,
      loop: track.loop,
      yoyo: track.yoyo,
      keyframes: track.keyframes?.map(keyframe => ({
        at: keyframe.at,
        value: keyframe.value as any,
        ...keyframe.properties,
      })),
    })),
  };
}

function drawLayerCommandToTemplateLayer(command: DrawLayerCommand): TemplateLayer {
  const source = command.source && typeof command.source === 'object'
    ? command.source as Partial<TemplateLayer>
    : {};
  return {
    ...source,
    id: command.nodeId,
    type: command.type,
    name: source.name,
    zIndex: command.zIndex,
    startTime: 0,
    endTime: Number.POSITIVE_INFINITY,
    visible: true,
    opacity: Number(command.properties.opacity ?? 1),
    blendMode: source.blendMode,
    properties: {
      ...(source.properties ?? {}),
      ...command.properties,
      dependencies: command.dependencies,
      __runtimeRoute: command.route,
    },
    animations: [],
  };
}
