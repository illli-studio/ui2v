import { parseProject } from '@ui2v/core';
import { inspectRuntimeProject, validateRuntimeProject } from '@ui2v/runtime-core';

export type PreviewClipKind = 'segment' | 'layer';

export interface PreviewTimelineClip {
  id: string;
  label: string;
  kind: PreviewClipKind;
  startTime: number;
  endTime: number;
  trackIndex: number;
  color: string;
  dependencies: string[];
  editable: boolean;
}

export interface PreviewTimelineTrack {
  id: string;
  label: string;
  clips: PreviewTimelineClip[];
}

export interface PreviewTimelineLint {
  severity: 'warning' | 'error';
  message: string;
  clipId?: string;
}

export interface PreviewTimelineModel {
  duration: number;
  fps: number;
  schema: 'uiv-runtime' | 'template' | 'unknown';
  tracks: PreviewTimelineTrack[];
  lint: PreviewTimelineLint[];
}

export interface PreviewTimelineUpdate {
  id: string;
  kind: PreviewClipKind;
  startTime?: number;
  endTime?: number;
}

export type PreviewTimelineEditMode = 'overwrite' | 'ripple';

export interface PreviewClipSplitRequest {
  id: string;
  kind: PreviewClipKind;
  time: number;
}

export interface PreviewClipMetadataUpdate {
  id: string;
  kind: PreviewClipKind;
  label?: string;
  dependencies?: string[];
}

export interface PreviewInspectSummary {
  time: number;
  frame: number;
  duration: number;
  fps: number;
  schema: PreviewTimelineModel['schema'];
  activeSegmentId?: string;
  activeSegmentLabel?: string;
  visibleNodeCount?: number;
  renderPlanItemCount?: number;
  dependencies: string[];
  markerIds: string[];
  lint: PreviewTimelineLint[];
  activeClipIds: string[];
}

const CLIP_COLORS = ['#48c7ff', '#7bd88f', '#facc15', '#fb7185', '#c084fc', '#f9a8d4', '#67e8f9', '#a3e635'];

export function buildPreviewTimeline(project: any): PreviewTimelineModel {
  const duration = Number(project?.duration) || 0;
  const fps = Number(project?.fps) || 30;
  const schema = project?.schema === 'uiv-runtime'
    ? 'uiv-runtime'
    : project?.template?.layers || project?.layers
      ? 'template'
      : 'unknown';

  const tracks: PreviewTimelineTrack[] = [];

  if (schema === 'uiv-runtime' && Array.isArray(project?.timeline?.segments)) {
    const clips = project.timeline.segments.map((segment: any, index: number) => ({
      id: String(segment.id),
      label: String(segment.label || segment.id),
      kind: 'segment' as const,
      startTime: Number(segment.startTime) || 0,
      endTime: Number(segment.endTime) || duration,
      trackIndex: 0,
      color: CLIP_COLORS[index % CLIP_COLORS.length],
      dependencies: Array.isArray(segment.dependencies) ? segment.dependencies.map(String) : [],
      editable: true,
    }));
    tracks.push({ id: 'segments', label: 'Segments', clips });
  }

  if (schema === 'template') {
    const layers = project?.template?.layers || project?.layers || [];
    const grouped = new Map<number, PreviewTimelineClip[]>();

    layers.forEach((layer: any, index: number) => {
      const startTime = Number(layer.startTime) || 0;
      const endTime = layer.endTime != null
        ? Number(layer.endTime)
        : startTime + (Number(layer.duration) || duration);
      const trackIndex = Number.isFinite(Number(layer.zIndex)) ? Number(layer.zIndex) : 1;
      const clip: PreviewTimelineClip = {
        id: String(layer.id),
        label: String(layer.name || layer.id),
        kind: 'layer',
        startTime,
        endTime,
        trackIndex,
        color: CLIP_COLORS[index % CLIP_COLORS.length],
        dependencies: collectLayerDependencies(layer),
        editable: layer.id !== 'stage',
      };
      const bucket = grouped.get(trackIndex) ?? [];
      bucket.push(clip);
      grouped.set(trackIndex, bucket);
    });

    for (const trackIndex of [...grouped.keys()].sort((a, b) => a - b)) {
      tracks.push({
        id: `track-${trackIndex}`,
        label: trackIndex === 0 ? 'Background' : `Track ${trackIndex}`,
        clips: grouped.get(trackIndex)!.sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime),
      });
    }
  }

  const lint = collectTimelineLint(tracks, duration, project);

  return { duration, fps, schema, tracks, lint };
}

export function lintPreviewProject(project: any): PreviewTimelineModel {
  return buildPreviewTimeline(project);
}

export function summarizeTimelineLint(lint: PreviewTimelineLint[]): {
  errorCount: number;
  warningCount: number;
  ok: boolean;
} {
  const errorCount = lint.filter(item => item.severity === 'error').length;
  const warningCount = lint.filter(item => item.severity === 'warning').length;
  return { errorCount, warningCount, ok: errorCount === 0 };
}

export function applyPreviewTimelineUpdates(
  project: any,
  updates: PreviewTimelineUpdate[],
  options?: { mode?: PreviewTimelineEditMode },
): any {
  const next = structuredClone(project);
  const mode = options?.mode === 'ripple' ? 'ripple' : 'overwrite';
  const projectDuration = Number(next.duration) || 0;

  for (const update of updates) {
    const trackItems = getTrackItems(next, update);
    const target = trackItems.find((item: any) => String(item.id) === update.id);
    if (!target) {
      throw new Error(`${update.kind === 'segment' ? 'Segment' : 'Layer'} not found: ${update.id}`);
    }

    const oldStart = readClipStart(target, projectDuration);
    const oldEnd = readClipEnd(target, projectDuration);
    applyClipTiming(target, update, projectDuration);

    if (mode !== 'ripple') {
      continue;
    }

    if (update.kind === 'segment') {
      snapRuntimeSegmentChain(trackItems, update.id, projectDuration);
      extendProjectDurationIfNeeded(next);
      continue;
    }

    const newStart = readClipStart(target, projectDuration);
    const newEnd = readClipEnd(target, projectDuration);
    const delta = resolveRippleDelta(update, oldStart, oldEnd, newStart, newEnd);
    if (Math.abs(delta) <= 0.0005) {
      continue;
    }

    const sorted = sortTrackItems(trackItems);
    const index = sorted.findIndex(item => String(item.id) === update.id);
    for (let j = index + 1; j < sorted.length; j++) {
      shiftRawClipTiming(sorted[j], delta);
    }
    extendProjectDurationIfNeeded(next);
  }

  return next;
}

export function snapRuntimeSegmentChain(
  segments: any[],
  anchorId: string,
  projectDuration: number,
): void {
  if (!Array.isArray(segments) || segments.length === 0) {
    return;
  }

  const sorted = sortTrackItems(segments);
  const anchorIndex = sorted.findIndex(item => String(item.id) === anchorId);
  if (anchorIndex < 0) {
    return;
  }

  const minDuration = 0.05;

  if (anchorIndex > 0) {
    const previous = sorted[anchorIndex - 1];
    const anchor = sorted[anchorIndex];
    const anchorStart = readClipStart(anchor, projectDuration);
    const previousStart = readClipStart(previous, projectDuration);
    previous.endTime = roundTime(Math.max(previousStart + minDuration, anchorStart));
    delete previous.duration;
  }

  for (let index = anchorIndex + 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const previousEnd = readClipEnd(previous, projectDuration);
    const currentStart = readClipStart(current, projectDuration);
    const currentEnd = readClipEnd(current, projectDuration);
    const clipDuration = Math.max(minDuration, currentEnd - currentStart);
    current.startTime = roundTime(previousEnd);
    current.endTime = roundTime(current.startTime + clipDuration);
    delete current.duration;
  }
}

export function splitPreviewClip(project: any, request: PreviewClipSplitRequest): any {
  const fps = Number(project?.fps) || 30;
  const duration = Number(project?.duration) || 0;
  const splitTime = snapTimeToFrame(request.time, fps);
  const minDuration = 1 / fps;
  const next = structuredClone(project);

  if (request.kind === 'segment') {
    const segments = next?.timeline?.segments;
    if (!Array.isArray(segments)) {
      throw new Error('Project has no runtime segments to split');
    }
    const index = segments.findIndex((item: any) => String(item.id) === request.id);
    if (index < 0) {
      throw new Error(`Segment not found: ${request.id}`);
    }
    const original = segments[index];
    const startTime = Number(original.startTime) || 0;
    const endTime = Number(original.endTime) || duration;
    assertSplitWindow(splitTime, startTime, endTime, minDuration, request.id);
    const existingIds = new Set(segments.map((item: any) => String(item.id)));
    const newId = createSplitId(String(original.id), existingIds);
    const duplicate = structuredClone(original);
    duplicate.id = newId;
    duplicate.label = `${String(original.label || original.id)} (B)`;
    duplicate.startTime = roundTime(splitTime);
    duplicate.endTime = roundTime(endTime);
    original.endTime = roundTime(splitTime);
    if (!String(original.label || '').endsWith(' (A)')) {
      original.label = `${String(original.label || original.id)} (A)`;
    }
    segments.splice(index + 1, 0, duplicate);
    return next;
  }

  if (request.kind === 'layer') {
    const layers = next?.template?.layers || next?.layers;
    if (!Array.isArray(layers)) {
      throw new Error('Project has no template layers to split');
    }
    const index = layers.findIndex((item: any) => String(item.id) === request.id);
    if (index < 0) {
      throw new Error(`Layer not found: ${request.id}`);
    }
    const original = layers[index];
    const startTime = Number(original.startTime) || 0;
    const endTime = original.endTime != null
      ? Number(original.endTime)
      : startTime + (Number(original.duration) || duration);
    assertSplitWindow(splitTime, startTime, endTime, minDuration, request.id);
    const existingIds = new Set(layers.map((item: any) => String(item.id)));
    const newId = createSplitId(String(original.id), existingIds);
    const duplicate = structuredClone(original);
    duplicate.id = newId;
    duplicate.name = `${String(original.name || original.id)} (B)`;
    duplicate.startTime = roundTime(splitTime);
    duplicate.endTime = roundTime(endTime);
    delete duplicate.duration;
    original.endTime = roundTime(splitTime);
    delete original.duration;
    if (!String(original.name || '').endsWith(' (A)')) {
      original.name = `${String(original.name || original.id)} (A)`;
    }
    layers.splice(index + 1, 0, duplicate);
    return next;
  }

  throw new Error(`Unsupported clip kind: ${request.kind}`);
}

export function applyPreviewClipMetadataUpdates(project: any, updates: PreviewClipMetadataUpdate[]): any {
  const next = structuredClone(project);

  for (const update of updates) {
    if (update.kind === 'segment' && Array.isArray(next?.timeline?.segments)) {
      const segment = next.timeline.segments.find((item: any) => String(item.id) === update.id);
      if (!segment) {
        throw new Error(`Segment not found: ${update.id}`);
      }
      if (update.label != null) {
        segment.label = String(update.label).trim() || segment.id;
      }
      if (update.dependencies != null) {
        segment.dependencies = normalizeDependencyList(update.dependencies);
      }
      continue;
    }

    if (update.kind === 'layer') {
      const layers = next?.template?.layers || next?.layers;
      if (!Array.isArray(layers)) {
        throw new Error('Project has no editable template layers');
      }
      const layer = layers.find((item: any) => String(item.id) === update.id);
      if (!layer) {
        throw new Error(`Layer not found: ${update.id}`);
      }
      if (update.label != null) {
        layer.name = String(update.label).trim() || layer.id;
      }
      if (update.dependencies != null) {
        const deps = normalizeDependencyList(update.dependencies);
        layer.dependencies = deps;
        if (layer.properties && typeof layer.properties === 'object') {
          layer.properties.dependencies = deps;
        }
      }
    }
  }

  return next;
}

export function formatPreviewProjectJson(project: any): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function assertPreviewProjectSaveable(project: any): void {
  if (project?.schema === 'uiv-runtime') {
    const validation = validateRuntimeProject(project);
    if (!validation.valid) {
      throw new Error(validation.errors
        .slice(0, 8)
        .map(error => `${error.path}: ${error.message}`)
        .join('; '));
    }
    return;
  }
  parseProject(JSON.stringify(project));
}

export function createPreviewInspectSummary(project: any, time: number): PreviewInspectSummary {
  const timeline = buildPreviewTimeline(project);
  const clampedTime = clampTime(time, timeline.duration);
  const frame = Math.max(0, Math.floor(clampedTime * timeline.fps));
  const activeClipIds = timeline.tracks
    .flatMap(track => track.clips)
    .filter(clip => clampedTime >= clip.startTime && clampedTime <= clip.endTime)
    .map(clip => clip.id);

  if (project?.schema === 'uiv-runtime') {
    const inspection = inspectRuntimeProject(project, { sampleTimes: [clampedTime] });
    const frameInspection = inspection.frames[0];
    return {
      time: clampedTime,
      frame,
      duration: timeline.duration,
      fps: timeline.fps,
      schema: timeline.schema,
      activeSegmentId: frameInspection?.activeSegmentId,
      activeSegmentLabel: inspection.segmentPlan.segments.find(item => item.id === frameInspection?.activeSegmentId)?.label,
      visibleNodeCount: frameInspection?.visibleNodeCount,
      renderPlanItemCount: frameInspection?.renderPlanItemCount,
      dependencies: frameInspection?.dependencies ?? [],
      markerIds: frameInspection?.markerIds ?? [],
      lint: timeline.lint,
      activeClipIds,
    };
  }

  return {
    time: clampedTime,
    frame,
    duration: timeline.duration,
    fps: timeline.fps,
    schema: timeline.schema,
    dependencies: collectActiveDependencies(project, activeClipIds),
    markerIds: [],
    lint: timeline.lint,
    activeClipIds,
  };
}

function getTrackItems(project: any, update: PreviewTimelineUpdate): any[] {
  if (update.kind === 'segment') {
    const segments = project?.timeline?.segments;
    if (!Array.isArray(segments)) {
      throw new Error('Project has no runtime segments to edit');
    }
    return segments;
  }

  if (update.kind === 'layer') {
    const layers = project?.template?.layers || project?.layers;
    if (!Array.isArray(layers)) {
      throw new Error('Project has no editable template layers');
    }
    const layer = layers.find((item: any) => String(item.id) === update.id);
    if (!layer) {
      throw new Error(`Layer not found: ${update.id}`);
    }
    const trackIndex = Number.isFinite(Number(layer.zIndex)) ? Number(layer.zIndex) : 1;
    return layers.filter((item: any) => {
      const zIndex = Number.isFinite(Number(item.zIndex)) ? Number(item.zIndex) : 1;
      return zIndex === trackIndex;
    });
  }

  throw new Error(`Unsupported clip kind: ${update.kind}`);
}

function sortTrackItems(items: any[]): any[] {
  return [...items].sort((left, right) => {
    const startDelta = readClipStart(left, Number.MAX_SAFE_INTEGER) - readClipStart(right, Number.MAX_SAFE_INTEGER);
    if (Math.abs(startDelta) > 0.0005) {
      return startDelta;
    }
    return readClipEnd(left, Number.MAX_SAFE_INTEGER) - readClipEnd(right, Number.MAX_SAFE_INTEGER);
  });
}

function readClipStart(target: any, projectDuration: number): number {
  return roundTime(Number(target?.startTime) || 0);
}

function readClipEnd(target: any, projectDuration: number): number {
  if (target?.endTime != null) {
    return roundTime(Number(target.endTime));
  }
  const startTime = Number(target?.startTime) || 0;
  const duration = Number(target?.duration);
  if (Number.isFinite(duration) && duration > 0) {
    return roundTime(startTime + duration);
  }
  return roundTime(projectDuration);
}

function resolveRippleDelta(
  update: PreviewTimelineUpdate,
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number,
): number {
  if (update.endTime != null && update.startTime == null) {
    return newEnd - oldEnd;
  }
  if (update.startTime != null && update.endTime == null) {
    return newStart - oldStart;
  }
  return newStart - oldStart;
}

function shiftRawClipTiming(target: any, delta: number): void {
  const startTime = readClipStart(target, Number.MAX_SAFE_INTEGER);
  const endTime = readClipEnd(target, Number.MAX_SAFE_INTEGER);
  const clipDuration = Math.max(0.05, endTime - startTime);
  let nextStart = roundTime(startTime + delta);
  if (nextStart < 0) {
    nextStart = 0;
  }
  target.startTime = nextStart;
  target.endTime = roundTime(nextStart + clipDuration);
  delete target.duration;
}

function extendProjectDurationIfNeeded(project: any): void {
  const currentDuration = Number(project?.duration) || 0;
  let maxEnd = currentDuration;

  for (const segment of project?.timeline?.segments || []) {
    maxEnd = Math.max(maxEnd, readClipEnd(segment, currentDuration));
  }

  for (const layer of project?.template?.layers || project?.layers || []) {
    maxEnd = Math.max(maxEnd, readClipEnd(layer, currentDuration));
  }

  if (maxEnd > currentDuration + 0.0005) {
    project.duration = roundTime(maxEnd);
  }
}

function applyClipTiming(
  target: { startTime?: number; endTime?: number; duration?: number },
  update: PreviewTimelineUpdate,
  projectDuration: number
): void {
  const minDuration = 0.05;
  let startTime = update.startTime ?? (Number(target.startTime) || 0);
  let endTime = update.endTime ?? (Number(target.endTime ?? (Number(target.startTime) + Number(target.duration))) || projectDuration);

  startTime = clampTime(startTime, projectDuration);
  endTime = clampTime(endTime, projectDuration);

  if (endTime - startTime < minDuration) {
    if (update.startTime != null && update.endTime == null) {
      endTime = Math.min(projectDuration, startTime + minDuration);
    } else if (update.endTime != null && update.startTime == null) {
      startTime = Math.max(0, endTime - minDuration);
    } else {
      throw new Error(`Clip ${update.id} must stay at least ${minDuration}s long`);
    }
  }

  target.startTime = roundTime(startTime);
  target.endTime = roundTime(endTime);
  delete target.duration;
}

function collectLayerDependencies(layer: any): string[] {
  const values = new Set<string>();
  for (const source of [layer.dependencies, layer.properties?.dependencies]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (typeof item === 'string' && item.trim()) {
        values.add(item.trim());
      }
    }
  }
  return [...values].sort();
}

function collectActiveDependencies(project: any, activeClipIds: string[]): string[] {
  const layers = project?.template?.layers || project?.layers || [];
  const values = new Set<string>();
  if (Array.isArray(project?.dependencies)) {
    project.dependencies.forEach((item: unknown) => typeof item === 'string' && values.add(item));
  }
  for (const layer of layers) {
    if (!activeClipIds.includes(String(layer.id))) continue;
    collectLayerDependencies(layer).forEach(item => values.add(item));
  }
  return [...values].sort();
}

function collectTimelineLint(tracks: PreviewTimelineTrack[], duration: number, project?: any): PreviewTimelineLint[] {
  const lint: PreviewTimelineLint[] = [];
  const clips = tracks.flatMap(track => track.clips);
  const fps = Number(project?.fps) || 30;
  const frameDuration = 1 / fps;
  const rootDependencies = new Set<string>(
    Array.isArray(project?.dependencies) ? project.dependencies.map(String) : []
  );
  const seenIds = new Map<string, string>();

  if (clips.length === 0) {
    lint.push({ severity: 'warning', message: 'Timeline has no clips or segments to inspect' });
  }

  for (const clip of clips) {
    if (seenIds.has(clip.id)) {
      lint.push({
        severity: 'error',
        message: `Duplicate clip id "${clip.id}" (${seenIds.get(clip.id)} and ${clip.label})`,
        clipId: clip.id,
      });
    } else {
      seenIds.set(clip.id, clip.label);
    }

    if (clip.startTime < 0) {
      lint.push({ severity: 'error', message: `${clip.label} starts before 0s`, clipId: clip.id });
    }
    if (clip.endTime > duration + 0.001) {
      lint.push({ severity: 'error', message: `${clip.label} ends after project duration`, clipId: clip.id });
    }
    if (clip.endTime - clip.startTime < 0.05) {
      lint.push({ severity: 'warning', message: `${clip.label} is extremely short`, clipId: clip.id });
    }

    if (clip.editable && clip.dependencies.length === 0) {
      lint.push({
        severity: 'warning',
        message: `${clip.label} declares no dependencies`,
        clipId: clip.id,
      });
    }

    for (const dependency of clip.dependencies) {
      if (rootDependencies.size > 0 && !rootDependencies.has(dependency)) {
        lint.push({
          severity: 'warning',
          message: `${clip.label} uses ${dependency} but project.dependencies omits it`,
          clipId: clip.id,
        });
      }
    }

    if (!isFrameAligned(clip.startTime, frameDuration) || !isFrameAligned(clip.endTime, frameDuration)) {
      lint.push({
        severity: 'warning',
        message: `${clip.label} boundaries are not aligned to ${fps}fps grid`,
        clipId: clip.id,
      });
    }
  }

  const segments = tracks.find(track => track.id === 'segments')?.clips ?? [];
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.startTime > previous.endTime + 0.001) {
      lint.push({
        severity: 'warning',
        message: `Gap between ${previous.label} and ${current.label}`,
        clipId: current.id,
      });
    }
    if (current.startTime < previous.endTime - 0.001) {
      lint.push({
        severity: 'warning',
        message: `${current.label} overlaps ${previous.label}`,
        clipId: current.id,
      });
    }
  }

  if (clips.length > 0) {
    const lastEnd = Math.max(...clips.map(clip => clip.endTime));
    if (duration - lastEnd > 0.05) {
      lint.push({
        severity: 'warning',
        message: `Timeline ends ${roundTime(duration - lastEnd)}s before project duration`,
      });
    }
  }

  return lint;
}

function isFrameAligned(time: number, frameDuration: number): boolean {
  const frames = time / frameDuration;
  return Math.abs(frames - Math.round(frames)) < 0.001;
}

function clampTime(value: number, duration: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(duration, value));
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function snapTimeToFrame(value: number, fps: number): number {
  if (!Number.isFinite(value)) return 0;
  const frameDuration = 1 / (fps || 30);
  return roundTime(Math.round(value / frameDuration) * frameDuration);
}

function assertSplitWindow(splitTime: number, startTime: number, endTime: number, minDuration: number, clipId: string): void {
  if (splitTime <= startTime + minDuration - 0.0001 || splitTime >= endTime - minDuration + 0.0001) {
    throw new Error(`Split time for ${clipId} must leave both sides at least one frame long`);
  }
}

function createSplitId(baseId: string, existingIds: Set<string>): string {
  let candidate = `${baseId}-split`;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}-split-${index}`;
    index += 1;
  }
  existingIds.add(candidate);
  return candidate;
}

function normalizeDependencyList(value: string[] | string): string[] {
  const items = Array.isArray(value)
    ? value
    : String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  return [...new Set(items.map(item => String(item).trim()).filter(Boolean))].sort();
}
