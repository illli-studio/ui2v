import { normalizeProject } from '../normalize/normalizeProject';
import { createRenderPlan } from '../render-plan/RenderPlan';
import { createSegmentFramePlan, type SegmentFramePlan } from '../timeline/FrameSampler';
import { createSegmentPlan, type SegmentPlan } from '../timeline/SegmentPlan';
import { TimelineEngine } from '../timeline/TimelineEngine';
import type { RuntimeFrame } from '../types';

export interface RuntimeInspectionOptions {
  sampleTimes?: number[];
}

export interface RuntimeNodeInspection {
  id: string;
  type: string;
  name?: string;
  parentId?: string;
  childCount: number;
  zIndex: number;
  startTime: number;
  endTime: number;
  motionTrackCount: number;
}

export interface RuntimeFrameInspection {
  time: number;
  frame: number;
  visibleNodeCount: number;
  renderPlanItemCount: number;
  dependencies: string[];
  activeSegmentId?: string;
  markerIds: string[];
  nodes: Array<{
    id: string;
    type: string;
    localTime: number;
    opacity: number;
    worldMatrix: RuntimeFrame['nodes'][number]['worldMatrix'];
  }>;
}

export interface RuntimeInspection {
  id: string;
  name?: string;
  duration: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  nodeCount: number;
  maxDepth: number;
  segmentPlan: SegmentPlan;
  segmentFramePlan: SegmentFramePlan;
  nodes: RuntimeNodeInspection[];
  frames: RuntimeFrameInspection[];
}

export function inspectRuntimeProject(
  project: Parameters<typeof normalizeProject>[0],
  options: RuntimeInspectionOptions = {}
): RuntimeInspection {
  const normalized = normalizeProject(project);
  const snapshot = normalized.scene.snapshot();
  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const sampleTimes = options.sampleTimes ?? [
    0,
    normalized.composition.duration / 2,
    normalized.composition.duration,
  ];

  return {
    id: normalized.composition.id,
    name: normalized.composition.name,
    duration: normalized.composition.duration,
    fps: normalized.composition.fps,
    resolution: normalized.composition.resolution,
    nodeCount: snapshot.nodes.length,
    maxDepth: getMaxDepth(snapshot.rootId, snapshot.nodes),
    segmentPlan: createSegmentPlan(normalized.composition, snapshot),
    segmentFramePlan: createSegmentFramePlan(normalized.composition),
    nodes: snapshot.nodes.map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      parentId: node.parentId,
      childCount: node.children.length,
      zIndex: node.zIndex,
      startTime: node.timing.startTime,
      endTime: node.timing.endTime,
      motionTrackCount: node.motion.length,
    })),
    frames: sampleTimes.map(time => {
      const frame = timeline.evaluate(time);
      const plan = createRenderPlan(frame);
      return {
        time: frame.time,
        frame: frame.frame,
        visibleNodeCount: frame.nodes.length,
        renderPlanItemCount: plan.itemCount,
        dependencies: plan.dependencies,
        activeSegmentId: plan.activeSegmentId,
        markerIds: plan.markerIds,
        nodes: frame.nodes.map(node => ({
          id: node.id,
          type: node.type,
          localTime: node.localTime,
          opacity: node.opacity,
          worldMatrix: node.worldMatrix,
        })),
      };
    }),
  };
}

function getMaxDepth(rootId: string, nodes: RuntimeNodeInspectionSource[]): number {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const visit = (id: string, depth: number): number => {
    const node = nodeMap.get(id);
    if (!node || node.children.length === 0) {
      return depth;
    }

    return Math.max(...node.children.map(childId => visit(childId, depth + 1)));
  };

  return visit(rootId, 0);
}

interface RuntimeNodeInspectionSource {
  id: string;
  children: string[];
}
