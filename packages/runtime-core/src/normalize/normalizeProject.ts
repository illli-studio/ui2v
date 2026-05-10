import type { AnimationProject, Layer, TimelineAnimation } from '@ui2v/core';
import { getProjectDimensions } from '@ui2v/core';
import { createDefaultTransform, createRootNode } from '../scene/defaults';
import { SceneGraph } from '../scene/SceneGraph';
import { extractDependenciesFromCode } from '../custom-code/CustomCodeInspection';
import type { RuntimeAssetSource, RuntimeCameraShot, RuntimeComposition, RuntimeMotionTrack, RuntimeNarrationCue, RuntimeProjectNode, RuntimeProjectSegment, RuntimeSegment, RuntimeTheme, RuntimeTransition, SceneNode } from '../types';
import { validateRuntimeProject } from '../validate/validateRuntimeProject';

export interface NormalizedRuntimeProject {
  composition: RuntimeComposition;
  scene: SceneGraph;
}

export function normalizeProject(project: AnimationProject | Record<string, any>): NormalizedRuntimeProject {
  const rawProject = project as Record<string, any>;
  const validation = validateRuntimeProject(rawProject);
  if (!validation.valid) {
    const message = validation.errors
      .map(error => `${error.code} at ${error.path}: ${error.message}`)
      .join('\n');
    throw new Error(`Invalid runtime project:\n${message}`);
  }

  const duration = numberOr(project.duration, 1);
  const fps = numberOr(project.fps, 60);
  const resolution = resolveResolution(rawProject);
  const segments = normalizeSegments(rawProject.timeline?.segments ?? rawProject.segments, duration);
  const composition: RuntimeComposition = {
    id: String(project.id ?? 'ui2v-composition'),
    title: typeof rawProject.title === 'string' ? rawProject.title : undefined,
    description: typeof rawProject.description === 'string' ? rawProject.description : undefined,
    name: typeof rawProject.name === 'string' ? rawProject.name : undefined,
    version: typeof rawProject.version === 'string' ? rawProject.version : undefined,
    duration,
    fps,
    resolution,
    backgroundColor: typeof rawProject.backgroundColor === 'string' ? rawProject.backgroundColor : undefined,
    assetBaseUrl: typeof rawProject.assetBaseUrl === 'string' ? rawProject.assetBaseUrl : undefined,
    assetBaseDir: typeof rawProject.assetBaseDir === 'string' ? rawProject.assetBaseDir : undefined,
    __assetBaseUrl: typeof rawProject.__assetBaseUrl === 'string' ? rawProject.__assetBaseUrl : undefined,
    __assetBaseDir: typeof rawProject.__assetBaseDir === 'string' ? rawProject.__assetBaseDir : undefined,
    variables: isObject(rawProject.variables) ? { ...rawProject.variables } : {},
    theme: normalizeTheme(rawProject.theme),
    datasets: isObject(rawProject.datasets) ? { ...rawProject.datasets } : {},
    assets: normalizeAssets(rawProject.assets),
    narration: normalizeNarration(rawProject.narration),
    audio: isObject(rawProject.audio) ? { ...rawProject.audio } : undefined,
    camera: normalizeCamera(rawProject.camera),
    markers: normalizeMarkers(rawProject.markers),
    segments,
    dependencies: normalizeDependencies(rawProject.dependencies),
    sourceProject: project,
  };

  const root = normalizeRootNode(rawProject, duration);
  const scene = new SceneGraph(root);

  if (rawProject.schema === 'uiv-runtime' && rawProject.scene) {
    const nodes = Array.isArray(rawProject.scene.nodes)
      ? rawProject.scene.nodes
      : rawProject.scene.root?.children ?? [];
    for (const node of nodes) {
      addRuntimeNode(scene, node, root.id, duration);
    }
    addSegmentNodes(scene, rawProject.timeline?.segments ?? rawProject.segments, root.id, duration);
  } else {
    const layers = extractLayers(rawProject);
    for (const layer of layers) {
      scene.addNode(normalizeLayer(layer, duration));
    }
  }

  return { composition, scene };
}

function normalizeRootNode(project: Record<string, any>, duration: number): SceneNode {
  if (project.schema !== 'uiv-runtime' || !isObject(project.scene?.root)) {
    return createRootNode(duration);
  }

  const root = normalizeRuntimeNode(project.scene.root, duration);
  return {
    ...root,
    id: root.id || 'root',
    type: 'root',
    parentId: undefined,
    timing: {
      startTime: 0,
      endTime: duration,
      duration,
    },
  };
}

function addRuntimeNode(scene: SceneGraph, node: RuntimeProjectNode, parentId: string, projectDuration: number): void {
  const sceneNode = normalizeRuntimeNode(node, projectDuration);
  scene.addNode(sceneNode, parentId);

  for (const child of node.children ?? []) {
    addRuntimeNode(scene, child, sceneNode.id, projectDuration);
  }
}

function addSegmentNodes(
  scene: SceneGraph,
  value: unknown,
  parentId: string,
  projectDuration: number
): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const segment of value) {
    if (!isObject(segment) || typeof segment.id !== 'string') {
      continue;
    }

    const segmentNodes = collectSegmentNodes(segment as RuntimeProjectSegment, projectDuration);
    for (const node of segmentNodes) {
      addRuntimeNode(scene, node, parentId, projectDuration);
    }
  }
}

function collectSegmentNodes(segment: RuntimeProjectSegment, projectDuration: number): RuntimeProjectNode[] {
  const startTime = numberOr(segment.startTime, 0);
  const duration = numberOr(segment.duration, numberOr(segment.endTime, projectDuration) - startTime);
  const endTime = numberOr(segment.endTime, startTime + duration);
  const segmentDuration = Math.max(0, endTime - startTime);
  const childNodes = [
    ...(Array.isArray(segment.layers) ? segment.layers : []),
    ...(Array.isArray(segment.nodes) ? segment.nodes : []),
    ...(Array.isArray(segment.children) ? segment.children : []),
  ];

  if (childNodes.length === 0 && !segment.code && !segment.customCode) {
    return [];
  }

  const nodes = childNodes.length > 0
    ? childNodes
    : [{
      id: `${segment.id}-custom-code`,
      type: 'custom-code',
      properties: {
        ...(isObject(segment.properties) ? segment.properties : {}),
        code: segment.code ?? segment.customCode,
      },
    }];

  return nodes.map((node, index) => normalizeSegmentNode(node, segment, {
    startTime,
    endTime,
    duration: segmentDuration,
    index,
  }));
}

function normalizeSegmentNode(
  node: RuntimeProjectNode,
  segment: RuntimeProjectSegment,
  timing: { startTime: number; endTime: number; duration: number; index: number }
): RuntimeProjectNode {
  const localStart = numberOr(node.startTime, 0);
  const nodeDuration = numberOr(node.duration, numberOr(node.endTime, timing.duration) - localStart);
  const absoluteStart = timing.startTime + localStart;
  const absoluteEnd = timing.startTime + numberOr(node.endTime, localStart + nodeDuration);
  const segmentDependencies = normalizeDependencies(segment.dependencies);
  const nodeDependencies = normalizeDependencies((node as any).dependencies ?? node.properties?.dependencies);
  const nodeProperties = isObject(node.properties) ? { ...node.properties } : {};
  const inferredDependencies = inferCustomCodeDependencies({
    type: node.type ?? 'custom-code',
    properties: nodeProperties,
    code: (node as any).code,
  });

  return {
    ...node,
    id: node.id ? String(node.id) : `${segment.id}-layer-${timing.index + 1}`,
    type: node.type ?? 'custom-code',
    startTime: absoluteStart,
    endTime: Math.min(timing.endTime, absoluteEnd),
    duration: Math.max(0, Math.min(timing.endTime, absoluteEnd) - absoluteStart),
    dependencies: Array.from(new Set([...segmentDependencies, ...nodeDependencies, ...inferredDependencies])).sort(),
    properties: {
      ...nodeProperties,
      __runtimeSegmentId: segment.id,
      __runtimeSegmentStartTime: timing.startTime,
      __runtimeSegmentEndTime: timing.endTime,
      __runtimeSegmentDuration: timing.duration,
      __runtimeSegmentLabel: segment.label,
      __runtimeSegmentData: isObject(segment.data) ? { ...segment.data } : undefined,
      __runtimeSegmentTransition: normalizeTransition(segment.transition),
      __runtimeSegmentCamera: normalizeCamera(segment.camera),
    },
  } as RuntimeProjectNode;
}

function normalizeRuntimeNode(node: RuntimeProjectNode, projectDuration: number): SceneNode {
  const startTime = numberOr(node.startTime, 0);
  const duration = numberOr(node.duration, numberOr(node.endTime, projectDuration) - startTime);
  const endTime = numberOr(node.endTime, startTime + duration);

  const properties = isObject(node.properties) ? { ...node.properties } : {};
  const explicitDependencies = normalizeDependencies((node as any).dependencies ?? properties.dependencies);
  const inferredDependencies = inferCustomCodeDependencies({
    type: node.type ?? 'custom-code',
    properties,
    code: (node as any).code,
  });

  return {
    id: String(node.id),
    type: String(node.type ?? 'custom-code'),
    name: node.name,
    children: [],
    zIndex: numberOr(node.zIndex, 0),
    visible: node.visible !== false,
    locked: node.locked === true,
    opacity: numberOr(node.opacity, 1),
    blendMode: node.blendMode,
    timing: {
      startTime,
      endTime,
      duration: Math.max(0, endTime - startTime),
    },
    transform: createDefaultTransform(node.transform),
    properties,
    dependencies: Array.from(new Set([...explicitDependencies, ...inferredDependencies])).sort(),
    motion: [...(node.motion ?? node.animations ?? [])],
    source: node,
  };
}

function normalizeTheme(value: unknown): RuntimeTheme {
  if (!isObject(value)) {
    return {};
  }
  return {
    ...value,
    colors: isObject(value.colors) ? { ...value.colors } : undefined,
  };
}

function normalizeAssets(value: unknown): Record<string, RuntimeAssetSource> {
  if (!isObject(value)) {
    return {};
  }

  const assets: Record<string, RuntimeAssetSource> = {};
  for (const [key, asset] of Object.entries(value)) {
    if (typeof asset === 'string') {
      assets[key] = { src: asset, type: inferAssetType(asset) };
    } else if (isObject(asset) && typeof asset.src === 'string') {
      assets[key] = {
        ...asset,
        src: asset.src,
        type: typeof asset.type === 'string' ? asset.type as RuntimeAssetSource['type'] : inferAssetType(asset.src),
      };
    }
  }
  return assets;
}

function inferAssetType(src: string): RuntimeAssetSource['type'] {
  const clean = src.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(clean)) return 'image';
  if (/\.(mp4|webm|mov)$/.test(clean)) return 'video';
  if (/\.(mp3|wav|ogg|m4a)$/.test(clean)) return 'audio';
  if (/\.(ttf|otf|woff2?)$/.test(clean)) return 'font';
  if (/\.json$/.test(clean)) return 'json';
  if (/\.(txt|csv|md)$/.test(clean)) return 'text';
  return 'unknown';
}

function normalizeNarration(value: unknown): RuntimeNarrationCue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(cue => isObject(cue) && typeof cue.text === 'string' && typeof cue.time === 'number')
    .map(cue => ({
      id: typeof cue.id === 'string' ? cue.id : undefined,
      time: cue.time,
      duration: numberOr(cue.duration, 0),
      text: cue.text,
      speaker: typeof cue.speaker === 'string' ? cue.speaker : undefined,
      type: typeof cue.type === 'string' ? cue.type : undefined,
      data: isObject(cue.data) ? { ...cue.data } : undefined,
    }))
    .sort((a, b) => a.time - b.time);
}

function normalizeCamera(value: unknown): RuntimeCameraShot {
  if (!isObject(value)) {
    return {};
  }
  return {
    ...value,
    x: typeof value.x === 'number' ? value.x : undefined,
    y: typeof value.y === 'number' ? value.y : undefined,
    z: typeof value.z === 'number' ? value.z : undefined,
    zoom: typeof value.zoom === 'number' ? value.zoom : undefined,
    fov: typeof value.fov === 'number' ? value.fov : undefined,
    rotation: typeof value.rotation === 'number' ? value.rotation : undefined,
    motion: Array.isArray(value.motion)
      ? value.motion
        .filter(keyframe => isObject(keyframe) && typeof keyframe.time === 'number')
        .map(keyframe => ({
          time: keyframe.time,
          x: typeof keyframe.x === 'number' ? keyframe.x : undefined,
          y: typeof keyframe.y === 'number' ? keyframe.y : undefined,
          z: typeof keyframe.z === 'number' ? keyframe.z : undefined,
          zoom: typeof keyframe.zoom === 'number' ? keyframe.zoom : undefined,
          fov: typeof keyframe.fov === 'number' ? keyframe.fov : undefined,
          rotation: typeof keyframe.rotation === 'number' ? keyframe.rotation : undefined,
          easing: typeof keyframe.easing === 'string' ? keyframe.easing : undefined,
        }))
        .sort((a, b) => a.time - b.time)
      : undefined,
  };
}

function normalizeTransition(value: unknown): RuntimeTransition | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  return {
    ...value,
    type: typeof value.type === 'string' ? value.type : 'fade',
    duration: numberOr(value.duration, 0.35),
    easing: typeof value.easing === 'string' ? value.easing : 'easeInOutCubic',
    direction: typeof value.direction === 'string' ? value.direction : undefined,
  };
}

function extractLayers(project: Record<string, any>): any[] {
  if (Array.isArray(project.template?.layers)) {
    return project.template.layers;
  }

  if (Array.isArray(project.layers)) {
    return project.layers;
  }

  return [];
}

function normalizeLayer(layer: Layer | Record<string, any>, projectDuration: number): SceneNode {
  const properties = isObject(layer.properties)
    ? { ...layer.properties }
    : collectLayerProperties(layer);
  const transform = {
    ...createDefaultTransform(isObject(layer.transform) ? layer.transform : undefined),
    ...extractTransformFromProperties(properties),
  };
  const startTime = numberOr(layer.startTime, 0);
  const duration = numberOr(layer.duration, numberOr(layer.endTime, projectDuration) - startTime);
  const endTime = numberOr(layer.endTime, startTime + duration);

  const explicitDependencies = normalizeDependencies((layer as any).dependencies ?? properties.dependencies);
  const inferredDependencies = inferCustomCodeDependencies({
    type: layer.type ?? 'custom-code',
    properties,
    code: (layer as any).code,
  });

  return {
    id: String(layer.id),
    type: String(layer.type ?? 'custom-code'),
    name: typeof layer.name === 'string' ? layer.name : undefined,
    children: [],
    zIndex: numberOr(layer.zIndex, 0),
    visible: layer.visible !== false,
    locked: layer.locked === true,
    opacity: numberOr(layer.opacity ?? properties.opacity, 1),
    blendMode: typeof layer.blendMode === 'string' ? layer.blendMode : undefined,
    timing: {
      startTime,
      endTime,
      duration: Math.max(0, endTime - startTime),
    },
    transform,
    properties,
    dependencies: Array.from(new Set([...explicitDependencies, ...inferredDependencies])).sort(),
    motion: extractMotionTracks(layer, startTime),
    source: layer,
  };
}

function normalizeMarkers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(marker => isObject(marker) && typeof marker.id === 'string' && typeof marker.time === 'number')
    .map(marker => ({
      id: marker.id,
      time: marker.time,
      label: typeof marker.label === 'string' ? marker.label : undefined,
      data: isObject(marker.data) ? { ...marker.data } : undefined,
    }))
    .sort((a, b) => a.time - b.time);
}

function normalizeSegments(value: unknown, duration: number): RuntimeSegment[] {
  if (!Array.isArray(value)) {
    return [{
      id: 'main',
      startTime: 0,
      endTime: duration,
      label: 'Main',
    }];
  }

  return value
    .filter(segment => isObject(segment) && typeof segment.id === 'string')
    .map(segment => ({
      id: segment.id,
      startTime: numberOr(segment.startTime, 0),
      endTime: numberOr(segment.endTime, numberOr(segment.startTime, 0) + numberOr(segment.duration, duration)),
      label: typeof segment.label === 'string' ? segment.label : undefined,
      dependencies: normalizeDependencies(segment.dependencies),
      data: isObject(segment.data) ? { ...segment.data } : undefined,
      transition: normalizeTransition(segment.transition),
      camera: normalizeCamera(segment.camera),
    }))
    .filter(segment => segment.endTime > segment.startTime)
    .sort((a, b) => a.startTime - b.startTime);
}

function normalizeDependencies(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))).sort();
}

function inferCustomCodeDependencies(input: {
  type: unknown;
  properties?: Record<string, unknown>;
  code?: unknown;
}): string[] {
  if (String(input.type ?? 'custom-code') !== 'custom-code') {
    return [];
  }

  const code = typeof input.properties?.code === 'string'
    ? input.properties.code
    : typeof input.code === 'string'
      ? input.code
      : '';

  return extractDependenciesFromCode(code);
}

function collectLayerProperties(layer: Record<string, any>): Record<string, unknown> {
  const reserved = new Set([
    'id',
    'type',
    'name',
    'visible',
    'locked',
    'startTime',
    'duration',
    'endTime',
    'zIndex',
    'opacity',
    'blendMode',
    'transform',
    'animation',
    'animations',
    'children',
  ]);
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(layer)) {
    if (!reserved.has(key)) {
      properties[key] = value;
    }
  }

  return properties;
}

function extractTransformFromProperties(properties: Record<string, unknown>) {
  return {
    x: numberOr(properties.x, 0),
    y: numberOr(properties.y, 0),
    scaleX: numberOr(properties.scaleX, 1),
    scaleY: numberOr(properties.scaleY, 1),
    rotation: numberOr(properties.rotation, 0),
  };
}

function extractMotionTracks(layer: Record<string, any>, layerStartTime: number): RuntimeMotionTrack[] {
  const tracks: RuntimeMotionTrack[] = [];

  if (Array.isArray(layer.animations)) {
    for (const animation of layer.animations) {
      const property = typeof animation.property === 'string' ? animation.property : undefined;
      if (!property) {
        continue;
      }
      tracks.push({
        id: typeof animation.id === 'string' ? animation.id : undefined,
        property,
        from: animation.from,
        to: animation.to,
        startTime: numberOr(animation.startTime, layerStartTime + numberOr(animation.delay, 0)),
        duration: numberOr(animation.duration, 0),
        easing: typeof animation.easing === 'string' ? animation.easing : 'linear',
        loop: animation.loop === true,
        yoyo: animation.yoyo === true,
        keyframes: Array.isArray(animation.keyframes)
          ? animation.keyframes.map((keyframe: any) => ({
            at: numberOr(keyframe.at, 0),
            value: keyframe.value,
            properties: { ...keyframe },
            easing: typeof keyframe.easing === 'string' ? keyframe.easing : undefined,
          }))
          : undefined,
      });
    }
  }

  const timeline = layer.animation?.timeline;
  if (Array.isArray(timeline)) {
    for (const item of timeline as TimelineAnimation[]) {
      for (const [property, value] of Object.entries(item.properties ?? {})) {
        tracks.push({
          property,
          from: (layer.properties ?? layer.transform ?? {})[property],
          to: value,
          startTime: layerStartTime + numberOr(item.time, 0),
          duration: numberOr(item.duration, 0),
          easing: item.easing ?? 'linear',
          loop: false,
          yoyo: false,
        });
      }
    }
  }

  return tracks;
}

function resolveResolution(project: Record<string, any>) {
  try {
    return getProjectDimensions(project as AnimationProject);
  } catch {
    if (isObject(project.resolution)) {
      return {
        width: numberOr(project.resolution.width, 1920),
        height: numberOr(project.resolution.height, 1080),
      };
    }

    if (typeof project.resolution === 'string') {
      const match = project.resolution.match(/^(\d+)x(\d+)$/);
      if (match) {
        return {
          width: Number(match[1]),
          height: Number(match[2]),
        };
      }
    }

    return { width: 1920, height: 1080 };
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
