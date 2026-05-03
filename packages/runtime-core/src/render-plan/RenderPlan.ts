import type { EvaluatedNode, RuntimeFrame, RuntimeMatrix2D } from '../types';

export interface RenderPlanItem {
  nodeId: string;
  type: string;
  zIndex: number;
  opacity: number;
  localTime: number;
  worldMatrix: RuntimeMatrix2D;
  dependencies: string[];
  properties: Record<string, unknown>;
  source?: unknown;
}

export interface RenderPlan {
  time: number;
  frame: number;
  fps: number;
  dependencies: string[];
  activeSegmentId?: string;
  markerIds: string[];
  itemCount: number;
  items: RenderPlanItem[];
}

export function createRenderPlan(frame: RuntimeFrame): RenderPlan {
  const items = frame.nodes
    .filter(node => node.visible && node.opacity > 0)
    .map(nodeToPlanItem)
    .sort((a, b) => {
      if (a.zIndex === b.zIndex) {
        return a.nodeId.localeCompare(b.nodeId);
      }
      return a.zIndex - b.zIndex;
    });

  return {
    time: frame.time,
    frame: frame.frame,
    fps: frame.fps,
    dependencies: frame.dependencies,
    activeSegmentId: frame.activeSegment?.id,
    markerIds: frame.markers.map(marker => marker.id),
    itemCount: items.length,
    items,
  };
}

function nodeToPlanItem(node: EvaluatedNode): RenderPlanItem {
  return {
    nodeId: node.id,
    type: node.type,
    zIndex: node.zIndex,
    opacity: node.opacity,
    localTime: node.localTime,
    worldMatrix: node.worldMatrix,
    dependencies: node.dependencies,
    properties: {
      ...node.properties,
      opacity: node.opacity,
      __runtimeLocalTime: node.localTime,
      __runtimeLocalMatrix: node.localMatrix,
      __runtimeWorldMatrix: node.worldMatrix,
    },
    source: node.source,
  };
}
