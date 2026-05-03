import type { EvaluatedNode, RuntimeCameraShot, RuntimeCameraState, RuntimeComposition, RuntimeFrame, RuntimeMotionTrack, RuntimeTransform, SceneNode } from '../types';
import { SceneGraph } from '../scene/SceneGraph';
import { IDENTITY_MATRIX, decomposeMatrix, matrixFromTransform, multiplyMatrix, type Matrix2DValue } from '../math/Matrix2D';
import { applyEasing, interpolateValue } from './easing';

export class TimelineEngine {
  constructor(
    private readonly composition: RuntimeComposition,
    private readonly scene: SceneGraph
  ) {}

  evaluate(time: number): RuntimeFrame {
    const duration = Math.max(this.composition.duration, 0.000001);
    const clampedTime = Math.max(0, Math.min(duration, time));
    const activeSegment = this.composition.segments.find(segment => clampedTime >= segment.startTime && clampedTime < segment.endTime)
      ?? this.composition.segments.find(segment => clampedTime >= segment.startTime && clampedTime <= segment.endTime);
    const nodes = this.evaluateGraph(clampedTime, activeSegment?.id);
    const camera = evaluateCamera(this.composition.camera, activeSegment?.camera, clampedTime, activeSegment?.startTime ?? 0);

    return {
      composition: this.composition,
      time: clampedTime,
      frame: Math.round(clampedTime * this.composition.fps),
      fps: this.composition.fps,
      progress: clampedTime / duration,
      markers: this.composition.markers.filter(marker => marker.time <= clampedTime),
      activeSegment,
      camera,
      transition: evaluateTransition(this.composition.segments, activeSegment?.id, clampedTime),
      activeNarration: this.composition.narration.filter(cue => {
        const cueDuration = Math.max(cue.duration ?? 0, 0);
        return clampedTime >= cue.time && clampedTime <= cue.time + cueDuration;
      }),
      activeAudioMarkers: (this.composition.audio?.markers ?? []).filter(marker => marker.time <= clampedTime),
      dependencies: getFrameDependencies(this.composition.dependencies, nodes),
      nodes,
    };
  }

  private evaluateGraph(time: number, activeSegmentId?: string): EvaluatedNode[] {
    const snapshot = this.scene.snapshot();
    const nodeMap = new Map(snapshot.nodes.map(node => [node.id, node]));
    const evaluated: EvaluatedNode[] = [];
    const root = nodeMap.get(snapshot.rootId);

    if (!root) {
      return evaluated;
    }

    const evaluateChildren = (
      parent: SceneNode,
      parentState: Pick<EvaluatedNode, 'visible' | 'opacity' | 'transform' | 'worldMatrix'>
    ) => {
      const children = parent.children
        .map(childId => nodeMap.get(childId))
        .filter((node): node is SceneNode => Boolean(node))
        .sort((a, b) => {
          if (a.zIndex === b.zIndex) {
            return a.id.localeCompare(b.id);
          }
          return a.zIndex - b.zIndex;
        });

      for (const child of children) {
        const childState = this.evaluateNode(child, time, parentState, activeSegmentId);
        if (childState.visible) {
          evaluated.push(childState);
        }
        evaluateChildren(child, childState);
      }
    };

    evaluateChildren(root, {
      visible: true,
      opacity: 1,
      transform: { ...root.transform },
      worldMatrix: IDENTITY_MATRIX,
    });

    return evaluated.sort((a, b) => {
      if (a.zIndex === b.zIndex) {
        return a.id.localeCompare(b.id);
      }
      return a.zIndex - b.zIndex;
    });
  }

  private evaluateNode(
    node: SceneNode,
    time: number,
    parentState: Pick<EvaluatedNode, 'visible' | 'opacity' | 'transform' | 'worldMatrix'>,
    activeSegmentId?: string
  ): EvaluatedNode {
    const localTime = Math.max(0, time - node.timing.startTime);
    const inRange = node.visible && time >= node.timing.startTime && time <= node.timing.endTime;
    const localTransform: RuntimeTransform = { ...node.transform };
    const properties: Record<string, unknown> = { ...node.properties };
    const segmentStart = typeof properties.__runtimeSegmentStartTime === 'number'
      ? properties.__runtimeSegmentStartTime
      : node.timing.startTime;
    const segmentDuration = typeof properties.__runtimeSegmentDuration === 'number'
      ? properties.__runtimeSegmentDuration
      : node.timing.duration;
    const segmentLocalTime = Math.max(0, time - segmentStart);
    const segmentProgress = segmentDuration > 0
      ? Math.max(0, Math.min(1, segmentLocalTime / segmentDuration))
      : 0;
    properties.__runtimeActiveSegmentId = activeSegmentId;
    properties.__runtimeSegmentLocalTime = segmentLocalTime;
    properties.__runtimeSegmentProgress = segmentProgress;
    properties.__runtimeDuration = node.timing.duration;
    let opacity = node.opacity;

    for (const track of node.motion) {
      const value = evaluateTrack(track, time);
      if (value === undefined) {
        continue;
      }

      if (track.property === 'opacity') {
        opacity = Number(value);
      } else if (track.property.startsWith('transform.')) {
        const key = track.property.slice('transform.'.length) as keyof RuntimeTransform;
        if (key in localTransform && typeof value === 'number') {
          localTransform[key] = value;
        }
      } else if (track.property in localTransform && typeof value === 'number') {
        localTransform[track.property as keyof RuntimeTransform] = value;
      } else {
        properties[track.property] = value;
      }
    }

    const inheritedOpacity = parentState.opacity * opacity;
    const localMatrix = matrixFromTransform(localTransform);
    const worldMatrix = multiplyMatrix(parentState.worldMatrix, localMatrix);
    const worldTransform = decomposeMatrix(worldMatrix);

    return {
      id: node.id,
      type: node.type,
      name: node.name,
      parentId: node.parentId,
      zIndex: node.zIndex,
      visible: parentState.visible && inRange && inheritedOpacity > 0,
      opacity: Math.max(0, Math.min(1, inheritedOpacity)),
      blendMode: node.blendMode,
      localTime,
      localTransform,
      transform: worldTransform,
      localMatrix,
      worldMatrix,
      properties,
      dependencies: node.dependencies,
      source: node.source,
    };
  }
}

function evaluateCamera(
  globalCamera: RuntimeCameraShot,
  segmentCamera: RuntimeCameraShot | undefined,
  time: number,
  segmentStartTime: number
): RuntimeCameraState {
  const base = resolveCameraState(globalCamera, time, 0);
  const segment = resolveCameraState(segmentCamera ?? {}, time, segmentStartTime);
  return withEffectiveZoom({
    x: segmentCamera && (segmentCamera.x !== undefined || segmentCamera.motion) ? segment.x : base.x,
    y: segmentCamera && (segmentCamera.y !== undefined || segmentCamera.motion) ? segment.y : base.y,
    z: segmentCamera && (segmentCamera.z !== undefined || segmentCamera.motion) ? segment.z : base.z,
    zoom: segmentCamera && (segmentCamera.zoom !== undefined || segmentCamera.motion) ? segment.zoom : base.zoom,
    fov: segmentCamera && (segmentCamera.fov !== undefined || segmentCamera.motion) ? segment.fov : base.fov,
    rotation: segmentCamera && (segmentCamera.rotation !== undefined || segmentCamera.motion) ? segment.rotation : base.rotation,
    effectiveZoom: 1,
  } satisfies RuntimeCameraState);
}

function resolveCameraState(camera: RuntimeCameraShot, time: number, originTime: number): RuntimeCameraState {
  const initial: RuntimeCameraState = {
    x: typeof camera.x === 'number' ? camera.x : 0,
    y: typeof camera.y === 'number' ? camera.y : 0,
    z: typeof camera.z === 'number' ? camera.z : 0,
    zoom: typeof camera.zoom === 'number' ? camera.zoom : 1,
    fov: typeof camera.fov === 'number' ? camera.fov : 1200,
    rotation: typeof camera.rotation === 'number' ? camera.rotation : 0,
    effectiveZoom: 1,
  };
  const keyframes = camera.motion ?? [];
  if (keyframes.length === 0) {
    return withEffectiveZoom(initial);
  }

  const localTime = Math.max(0, time - originTime);
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  let previous = { ...initial, time: 0, easing: 'linear' };
  for (const keyframe of sorted) {
    if (localTime < keyframe.time) {
      const span = Math.max(keyframe.time - previous.time, 0.000001);
      const progress = applyEasing((localTime - previous.time) / span, keyframe.easing ?? previous.easing ?? 'linear');
      return withEffectiveZoom({
        x: interpolateNumber(previous.x, keyframe.x ?? previous.x, progress),
        y: interpolateNumber(previous.y, keyframe.y ?? previous.y, progress),
        z: interpolateNumber(previous.z, keyframe.z ?? previous.z, progress),
        zoom: interpolateNumber(previous.zoom, keyframe.zoom ?? previous.zoom, progress),
        fov: interpolateNumber(previous.fov, keyframe.fov ?? previous.fov, progress),
        rotation: interpolateNumber(previous.rotation, keyframe.rotation ?? previous.rotation, progress),
        effectiveZoom: 1,
      });
    }
    previous = {
      time: keyframe.time,
      easing: keyframe.easing ?? previous.easing,
      x: keyframe.x ?? previous.x,
      y: keyframe.y ?? previous.y,
      z: keyframe.z ?? previous.z,
      zoom: keyframe.zoom ?? previous.zoom,
      fov: keyframe.fov ?? previous.fov,
      rotation: keyframe.rotation ?? previous.rotation,
      effectiveZoom: 1,
    };
  }

  return withEffectiveZoom({
    x: previous.x,
    y: previous.y,
    z: previous.z,
    zoom: previous.zoom,
    fov: previous.fov,
    rotation: previous.rotation,
    effectiveZoom: 1,
  });
}

function evaluateTransition(segments: RuntimeComposition['segments'], activeSegmentId: string | undefined, time: number): RuntimeFrame['transition'] {
  const index = segments.findIndex(segment => segment.id === activeSegmentId);
  if (index < 0) {
    return undefined;
  }
  const segment = segments[index];
  const previous = segments[index - 1];
  const next = segments[index + 1];
  const inTransition = segment.transition;
  if (inTransition && previous) {
    const duration = Math.max(inTransition.duration ?? 0, 0);
    if (duration > 0 && time >= segment.startTime && time < segment.startTime + duration) {
      return {
        ...inTransition,
        phase: 'in',
        progress: applyEasing((time - segment.startTime) / duration, inTransition.easing ?? 'linear'),
        fromSegmentId: previous.id,
        toSegmentId: segment.id,
      };
    }
  }
  const outTransition = next?.transition;
  if (outTransition) {
    const duration = Math.max(outTransition.duration ?? 0, 0);
    if (duration > 0 && time > segment.endTime - duration && time <= segment.endTime) {
      return {
        ...outTransition,
        phase: 'out',
        progress: applyEasing((time - (segment.endTime - duration)) / duration, outTransition.easing ?? 'linear'),
        fromSegmentId: segment.id,
        toSegmentId: next.id,
      };
    }
  }
  return undefined;
}

function interpolateNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, progress));
}

function withEffectiveZoom(camera: RuntimeCameraState): RuntimeCameraState {
  const fov = Number.isFinite(camera.fov) && camera.fov > 1 ? camera.fov : 1200;
  const perspective = fov / Math.max(fov * 0.2, fov + camera.z);
  return {
    ...camera,
    fov,
    effectiveZoom: Math.max(0.05, Math.min(4, camera.zoom * perspective)),
  };
}

function getFrameDependencies(globalDependencies: string[], nodes: EvaluatedNode[]): string[] {
  const dependencies = new Set(globalDependencies);
  for (const node of nodes) {
    node.dependencies.forEach(dependency => dependencies.add(dependency));
  }
  return Array.from(dependencies).sort();
}

function evaluateTrack(track: RuntimeMotionTrack, time: number): unknown {
  if (track.duration <= 0) {
    return track.to ?? track.from;
  }

  const rawLocal = time - track.startTime;
  if (rawLocal < 0) {
    return track.from;
  }

  if (!track.loop && rawLocal > track.duration) {
    return track.to ?? track.from;
  }

  const cycle = Math.floor(rawLocal / track.duration);
  let localTime = track.loop ? rawLocal % track.duration : Math.min(rawLocal, track.duration);
  if (track.yoyo && cycle % 2 === 1) {
    localTime = track.duration - localTime;
  }

  const progress = applyEasing(localTime / track.duration, track.easing);

  if (track.keyframes && track.keyframes.length > 0) {
    return evaluateKeyframes(track, progress);
  }

  return interpolateValue(track.from, track.to, progress);
}

function evaluateKeyframes(track: RuntimeMotionTrack, progress: number): unknown {
  const keyframes = [...(track.keyframes ?? [])].sort((a, b) => a.at - b.at);
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (!first || !last) {
    return undefined;
  }

  if (progress <= first.at) {
    return first.value ?? first.properties?.[track.property];
  }

  if (progress >= last.at) {
    return last.value ?? last.properties?.[track.property];
  }

  for (let index = 0; index < keyframes.length - 1; index++) {
    const current = keyframes[index];
    const next = keyframes[index + 1];
    if (progress < current.at || progress > next.at) {
      continue;
    }

    const span = Math.max(next.at - current.at, 0.000001);
    const local = applyEasing((progress - current.at) / span, next.easing ?? current.easing ?? track.easing);
    return interpolateValue(
      current.value ?? current.properties?.[track.property],
      next.value ?? next.properties?.[track.property],
      local
    );
  }

  return undefined;
}
