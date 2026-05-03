import type { RuntimeComposition, RuntimeSegment } from '../types';

export interface FrameSample {
  index: number;
  time: number;
  presentationTime: number;
  duration: number;
}

export interface FrameSamplingOptions {
  includeEndFrame?: boolean;
}

export interface VideoFramePlan {
  index: number;
  renderTime: number;
  presentationTime: number;
  duration: number;
  timestampUs: number;
  durationUs: number;
  keyframe: boolean;
}

export interface SegmentFramePlanItem extends VideoFramePlan {
  segmentId?: string;
  segmentLabel?: string;
  segmentStartTime?: number;
  segmentEndTime?: number;
  segmentDuration?: number;
  segmentLocalTime?: number;
  segmentProgress?: number;
  segmentFrameIndex?: number;
}

export interface SegmentFrameRange {
  segmentId: string;
  label?: string;
  startTime: number;
  endTime: number;
  duration: number;
  startFrame: number;
  endFrame: number;
  frameCount: number;
}

export interface SegmentFramePlan {
  frames: SegmentFramePlanItem[];
  ranges: SegmentFrameRange[];
  totalFrames: number;
  unassignedFrames: number[];
}

export interface VideoFramePlanOptions extends FrameSamplingOptions {
  keyframeIntervalFrames?: number;
  keyframeIntervalSeconds?: number;
}

export function getFrameCount(composition: Pick<RuntimeComposition, 'duration' | 'fps'>): number {
  return Math.max(1, Math.ceil(composition.duration * composition.fps));
}

export function getFrameTime(index: number, fps: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Frame index must be a non-negative integer');
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('FPS must be a positive number');
  }
  return index / fps;
}

export function sampleFrames(
  composition: Pick<RuntimeComposition, 'duration' | 'fps'>,
  options: FrameSamplingOptions = {}
): FrameSample[] {
  const frameCount = getFrameCount(composition);
  const count = options.includeEndFrame ? frameCount + 1 : frameCount;
  const frameDuration = 1 / composition.fps;
  const samples: FrameSample[] = [];

  for (let index = 0; index < count; index++) {
    const rawTime = getFrameTime(index, composition.fps);
    samples.push({
      index,
      time: Math.min(rawTime, composition.duration),
      presentationTime: rawTime,
      duration: frameDuration,
    });
  }

  return samples;
}

export function createVideoFramePlan(
  composition: Pick<RuntimeComposition, 'duration' | 'fps'>,
  options: VideoFramePlanOptions = {}
): VideoFramePlan[] {
  const samples = sampleFrames(composition, options);
  const keyframeIntervalFrames = getKeyframeIntervalFrames(composition.fps, options);

  return samples.map(sample => ({
    index: sample.index,
    renderTime: sample.time,
    presentationTime: sample.presentationTime,
    duration: sample.duration,
    timestampUs: secondsToMicroseconds(sample.presentationTime),
    durationUs: secondsToMicroseconds(sample.duration),
    keyframe: sample.index % keyframeIntervalFrames === 0,
  }));
}

export function createSegmentFramePlan(
  composition: Pick<RuntimeComposition, 'duration' | 'fps'> & Partial<Pick<RuntimeComposition, 'segments'>>,
  options: VideoFramePlanOptions = {}
): SegmentFramePlan {
  const segments = getSegments(composition);
  const frames = createVideoFramePlan(composition, options).map(frame => annotateSegmentFrame(frame, segments));
  const ranges = createSegmentFrameRanges(composition, frames);
  const unassignedFrames = frames
    .filter(frame => !frame.segmentId)
    .map(frame => frame.index);

  return {
    frames,
    ranges,
    totalFrames: frames.length,
    unassignedFrames,
  };
}

function annotateSegmentFrame(frame: VideoFramePlan, segments: RuntimeSegment[]): SegmentFramePlanItem {
  const segment = findSegmentForTime(frame.renderTime, segments);
  if (!segment) {
    return { ...frame };
  }

  const segmentDuration = Math.max(0, segment.endTime - segment.startTime);
  const segmentLocalTime = Math.max(0, frame.renderTime - segment.startTime);
  const segmentProgress = segmentDuration > 0
    ? Math.max(0, Math.min(1, segmentLocalTime / segmentDuration))
    : 0;

  return {
    ...frame,
    segmentId: segment.id,
    segmentLabel: segment.label,
    segmentStartTime: segment.startTime,
    segmentEndTime: segment.endTime,
    segmentDuration,
    segmentLocalTime,
    segmentProgress,
    segmentFrameIndex: Math.max(0, Math.round(segmentLocalTime * frameDurationToFps(frame.duration))),
  };
}

function createSegmentFrameRanges(
  composition: Pick<RuntimeComposition, 'duration' | 'fps'> & Partial<Pick<RuntimeComposition, 'segments'>>,
  frames: SegmentFramePlanItem[]
): SegmentFrameRange[] {
  const ranges: SegmentFrameRange[] = [];
  const segments = getSegments(composition);

  for (const segment of segments) {
    const segmentFrames = frames.filter(frame => frame.segmentId === segment.id);
    if (segmentFrames.length === 0) {
      ranges.push({
        segmentId: segment.id,
        label: segment.label,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: Math.max(0, segment.endTime - segment.startTime),
        startFrame: -1,
        endFrame: -1,
        frameCount: 0,
      });
      continue;
    }

    ranges.push({
      segmentId: segment.id,
      label: segment.label,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: Math.max(0, segment.endTime - segment.startTime),
      startFrame: segmentFrames[0].index,
      endFrame: segmentFrames[segmentFrames.length - 1].index,
      frameCount: segmentFrames.length,
    });
  }

  return ranges;
}

function getSegments(
  composition: Pick<RuntimeComposition, 'duration'> & Partial<Pick<RuntimeComposition, 'segments'>>
): RuntimeSegment[] {
  if (Array.isArray(composition.segments) && composition.segments.length > 0) {
    return composition.segments;
  }

  return [{
    id: 'main',
    label: 'Main',
    startTime: 0,
    endTime: composition.duration,
  }];
}

function findSegmentForTime(time: number, segments: RuntimeSegment[]): RuntimeSegment | undefined {
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  return sorted.find(segment => time >= segment.startTime && time < segment.endTime)
    ?? sorted.find(segment => time >= segment.startTime && time <= segment.endTime);
}

function frameDurationToFps(duration: number): number {
  return duration > 0 ? 1 / duration : 0;
}

function getKeyframeIntervalFrames(
  fps: number,
  options: Pick<VideoFramePlanOptions, 'keyframeIntervalFrames' | 'keyframeIntervalSeconds'>
): number {
  if (options.keyframeIntervalFrames !== undefined) {
    if (!Number.isInteger(options.keyframeIntervalFrames) || options.keyframeIntervalFrames <= 0) {
      throw new Error('Keyframe interval frames must be a positive integer');
    }
    return options.keyframeIntervalFrames;
  }

  if (options.keyframeIntervalSeconds !== undefined) {
    if (!Number.isFinite(options.keyframeIntervalSeconds) || options.keyframeIntervalSeconds <= 0) {
      throw new Error('Keyframe interval seconds must be a positive number');
    }
    return Math.max(1, Math.round(options.keyframeIntervalSeconds * fps));
  }

  return Math.max(1, Math.round(fps * 2));
}

function secondsToMicroseconds(seconds: number): number {
  return Math.round(seconds * 1_000_000);
}
