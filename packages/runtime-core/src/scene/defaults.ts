import type { RuntimeTransform, SceneNode } from '../types';

export function createDefaultTransform(partial: Partial<RuntimeTransform> = {}): RuntimeTransform {
  return {
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    scaleX: partial.scaleX ?? 1,
    scaleY: partial.scaleY ?? 1,
    rotation: partial.rotation ?? 0,
    skewX: partial.skewX ?? 0,
    skewY: partial.skewY ?? 0,
    originX: partial.originX ?? 0,
    originY: partial.originY ?? 0,
  };
}

export function createRootNode(duration: number): SceneNode {
  return {
    id: 'root',
    type: 'root',
    children: [],
    zIndex: Number.NEGATIVE_INFINITY,
    visible: true,
    locked: false,
    opacity: 1,
    timing: {
      startTime: 0,
      endTime: duration,
      duration,
    },
    transform: createDefaultTransform(),
    properties: {},
    dependencies: [],
    motion: [],
  };
}
