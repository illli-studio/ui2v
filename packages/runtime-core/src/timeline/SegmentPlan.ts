import type { RuntimeComposition, RuntimeSegment, SceneGraphSnapshot, SceneNode } from '../types';

export interface SegmentPlanItem {
  id: string;
  label?: string;
  startTime: number;
  endTime: number;
  duration: number;
  dependencies: string[];
  nodeIds: string[];
  authoredNodeIds: string[];
  overlapsPrevious: boolean;
  gapFromPrevious: number;
}

export interface SegmentPlan {
  duration: number;
  segmentCount: number;
  coverage: number;
  gaps: Array<{ startTime: number; endTime: number; duration: number }>;
  overlaps: Array<{ previousId: string; nextId: string; startTime: number; endTime: number; duration: number }>;
  segments: SegmentPlanItem[];
}

export function createSegmentPlan(
  composition: RuntimeComposition,
  scene: SceneGraphSnapshot
): SegmentPlan {
  const segments = composition.segments.length > 0
    ? composition.segments
    : [{ id: 'main', startTime: 0, endTime: composition.duration }];
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  const items: SegmentPlanItem[] = [];
  const gaps: SegmentPlan['gaps'] = [];
  const overlaps: SegmentPlan['overlaps'] = [];
  let cursor = 0;

  for (const segment of sorted) {
    const startTime = clampTime(segment.startTime, composition.duration);
    const endTime = clampTime(segment.endTime, composition.duration);
    const duration = Math.max(0, endTime - startTime);
    const activeNodes = getNodesForSegment(scene, segment, startTime, endTime);
    const authoredNodes = activeNodes.filter(node => node.properties.__runtimeSegmentId === segment.id);

    if (startTime > cursor) {
      gaps.push({
        startTime: cursor,
        endTime: startTime,
        duration: startTime - cursor,
      });
    } else if (startTime < cursor) {
      const previous = items[items.length - 1];
      overlaps.push({
        previousId: previous?.id ?? 'unknown',
        nextId: segment.id,
        startTime,
        endTime: Math.min(cursor, endTime),
        duration: Math.max(0, Math.min(cursor, endTime) - startTime),
      });
    }

    items.push({
      id: segment.id,
      label: segment.label,
      startTime,
      endTime,
      duration,
      dependencies: uniqueSorted([
        ...composition.dependencies,
        ...(segment.dependencies ?? []),
        ...activeNodes.flatMap(node => node.dependencies),
      ]),
      nodeIds: activeNodes.map(node => node.id).sort(),
      authoredNodeIds: authoredNodes.map(node => node.id).sort(),
      overlapsPrevious: startTime < cursor,
      gapFromPrevious: Math.max(0, startTime - cursor),
    });

    cursor = Math.max(cursor, endTime);
  }

  if (cursor < composition.duration) {
    gaps.push({
      startTime: cursor,
      endTime: composition.duration,
      duration: composition.duration - cursor,
    });
  }

  const coveredDuration = Math.max(0, composition.duration - gaps.reduce((sum, gap) => sum + gap.duration, 0));

  return {
    duration: composition.duration,
    segmentCount: items.length,
    coverage: composition.duration > 0 ? coveredDuration / composition.duration : 0,
    gaps,
    overlaps,
    segments: items,
  };
}

function getNodesForSegment(
  scene: SceneGraphSnapshot,
  segment: Pick<RuntimeSegment, 'id'>,
  startTime: number,
  endTime: number
): SceneNode[] {
  return scene.nodes.filter(node => {
    if (node.id === scene.rootId || node.visible === false || node.opacity <= 0) {
      return false;
    }

    const authoredSegmentId = node.properties.__runtimeSegmentId;
    if (authoredSegmentId === segment.id) {
      return true;
    }

    return node.timing.startTime < endTime && node.timing.endTime > startTime;
  });
}

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.max(duration, 0), time));
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(value => value.trim().length > 0))).sort();
}
