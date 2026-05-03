import type { RuntimeComposition, RuntimeSegment, SceneGraphSnapshot, SceneNode } from '../types';

export interface DependencyWindow {
  id: string;
  startTime: number;
  endTime: number;
  dependencies: string[];
  nodeIds: string[];
  segmentId?: string;
}

export interface DependencyPlan {
  dependencies: string[];
  windows: DependencyWindow[];
}

export interface DependencyPlanOptions {
  lookAheadSeconds?: number;
}

export function createDependencyPlan(
  composition: RuntimeComposition,
  scene: SceneGraphSnapshot,
  options: DependencyPlanOptions = {}
): DependencyPlan {
  const lookAhead = Math.max(0, options.lookAheadSeconds ?? 0);
  const segments = composition.segments.length > 0
    ? composition.segments
    : [{ id: 'main', startTime: 0, endTime: composition.duration }];

  const windows = segments.map(segment => createSegmentWindow(composition, scene, segment, lookAhead));
  const dependencies = uniqueSorted(windows.flatMap(window => window.dependencies));

  return { dependencies, windows };
}

export function getDependenciesForRange(
  composition: RuntimeComposition,
  scene: SceneGraphSnapshot,
  startTime: number,
  endTime: number
): DependencyWindow {
  const start = clampTime(startTime, composition.duration);
  const end = clampTime(Math.max(startTime, endTime), composition.duration);
  const activeNodes = getActiveNodes(scene, start, end);

  return {
    id: `range:${formatTime(start)}-${formatTime(end)}`,
    startTime: start,
    endTime: end,
    dependencies: uniqueSorted([...composition.dependencies, ...activeNodes.flatMap(node => node.dependencies)]),
    nodeIds: activeNodes.map(node => node.id).sort(),
  };
}

function createSegmentWindow(
  composition: RuntimeComposition,
  scene: SceneGraphSnapshot,
  segment: Pick<RuntimeSegment, 'id' | 'startTime' | 'endTime' | 'dependencies'>,
  lookAhead: number
): DependencyWindow {
  const startTime = clampTime(segment.startTime, composition.duration);
  const endTime = clampTime(segment.endTime + lookAhead, composition.duration);
  const activeNodes = getActiveNodes(scene, startTime, endTime);

  return {
    id: segment.id,
    segmentId: segment.id,
    startTime,
    endTime,
    dependencies: uniqueSorted([
      ...composition.dependencies,
      ...(segment.dependencies ?? []),
      ...activeNodes.flatMap(node => node.dependencies),
    ]),
    nodeIds: activeNodes.map(node => node.id).sort(),
  };
}

function getActiveNodes(scene: SceneGraphSnapshot, startTime: number, endTime: number): SceneNode[] {
  return scene.nodes.filter(node => {
    if (node.id === scene.rootId || node.visible === false || node.opacity <= 0) {
      return false;
    }

    return rangesOverlap(
      node.timing.startTime,
      node.timing.endTime,
      startTime,
      endTime
    );
  });
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
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

function formatTime(value: number): string {
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
