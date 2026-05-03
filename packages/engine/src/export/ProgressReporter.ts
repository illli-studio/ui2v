/**
 *
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { MemoryUsage } from './MemoryManager';

export type ExportPhase = 'preparing' | 'rendering' | 'encoding' | 'finalizing' | 'complete';

export interface ExportProgress {
  phase: ExportPhase;
  currentFrame: number;
  totalFrames: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  fps: number;
  estimatedTimeRemaining: number;
  memoryUsage: MemoryUsage;
}

export interface ExportStats {
  totalTimeMs: number;
  renderTimeMs: number;
  encodeTimeMs: number;
  avgFps: number;
  peakMemoryMB: number;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filePath?: string;
  fileSize: number;
  duration: number;
  totalFrames: number;
  skippedFrames: number[];
  warnings: string[];
  stats: ExportStats;
}

export enum ExportErrorCode {
  MEMORY_OVERFLOW = 'MEMORY_OVERFLOW',
  RENDER_FAILED = 'RENDER_FAILED',
  ENCODE_FAILED = 'ENCODE_FAILED',
  CANCELLED = 'CANCELLED',
  WEBCODECS_NOT_SUPPORTED = 'WEBCODECS_NOT_SUPPORTED',
  INVALID_PROJECT = 'INVALID_PROJECT',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
}

export interface ExportError {
  code: ExportErrorCode;
  message: string;
  recoverable: boolean;
  suggestions: string[];
  frameIndex?: number;
  originalError?: Error;
}

export type ProgressEventType = 'progress' | 'error' | 'complete' | 'phaseChange';

export interface ProgressEvent {
  type: ProgressEventType;
  progress?: ExportProgress;
  error?: ExportError;
  result?: ExportResult;
  timestamp: number;
}

export type ProgressEventHandler = (event: ProgressEvent) => void;

const ERROR_MESSAGES: Record<ExportErrorCode, {
  title: string;
  titleEn: string;
  suggestions: string[];
  suggestionsEn: string[];
}> = {
  [ExportErrorCode.MEMORY_OVERFLOW]: {
    title: 'Out of memory',
    titleEn: 'Memory Overflow',
    suggestions: [
      'Try lowering the export resolution',
      'Close other applications to free memory',
      'Export the animation in segments',
    ],
    suggestionsEn: [
      'Try reducing export resolution',
      'Close other applications to free memory',
      'Export animation in segments',
    ],
  },
  [ExportErrorCode.RENDER_FAILED]: {
    title: 'Render failed',
    titleEn: 'Render Failed',
    suggestions: [
      'Check the animation code for errors',
      'Try simplifying the animation effects',
      'Reload the project and try again',
    ],
    suggestionsEn: [
      'Check animation code for errors',
      'Try simplifying animation effects',
      'Reload project and try again',
    ],
  },
  [ExportErrorCode.ENCODE_FAILED]: {
    title: 'Encoding failed',
    titleEn: 'Encoding Failed',
    suggestions: [
      'Try a different codec or output format',
      'Lower the video quality settings',
      'Update the browser to the latest version',
    ],
    suggestionsEn: [
      'Try using a different encoding format',
      'Lower video quality settings',
      'Update browser to latest version',
    ],
  },
  [ExportErrorCode.CANCELLED]: {
    title: 'Export canceled',
    titleEn: 'Export Cancelled',
    suggestions: [],
    suggestionsEn: [],
  },
  [ExportErrorCode.WEBCODECS_NOT_SUPPORTED]: {
    title: 'Browser not supported',
    titleEn: 'Browser Not Supported',
    suggestions: [
      'Use Chrome 94+ or Edge 94+',
      'Update the browser to the latest version',
    ],
    suggestionsEn: [
      'Please use Chrome 94+ or Edge 94+',
      'Update browser to latest version',
    ],
  },
  [ExportErrorCode.INVALID_PROJECT]: {
    title: 'Invalid project config',
    titleEn: 'Invalid Project',
    suggestions: [
      'Check that the animation config is complete',
      'Recreate the animation project',
    ],
    suggestionsEn: [
      'Check if animation configuration is complete',
      'Recreate animation project',
    ],
  },
  [ExportErrorCode.FILE_WRITE_FAILED]: {
    title: 'File write failed',
    titleEn: 'File Write Failed',
    suggestions: [
      'Check that enough disk space is available',
      'Check file write permissions',
      'Try choosing another output location',
    ],
    suggestionsEn: [
      'Check if disk space is sufficient',
      'Check file write permissions',
      'Try selecting a different save location',
    ],
  },
};

const DEFAULT_MEMORY_USAGE: MemoryUsage = {
  usedJSHeapSize: 0,
  totalJSHeapSize: 0,
  jsHeapSizeLimit: 0,
  usagePercent: 0,
};

export class ProgressReporter {
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private frameTimestamps: number[] = [];
  private peakMemoryMB: number = 0;
  private renderTimeMs: number = 0;
  private encodeTimeMs: number = 0;
  private currentProgress: ExportProgress;
  private eventHandlers: Map<ProgressEventType, Set<ProgressEventHandler>> = new Map();
  private updateIntervalMs: number;
  private locale: 'zh' | 'en';

  constructor(
    totalFrames: number,
    totalChunks: number,
    options: { updateIntervalMs?: number; locale?: 'zh' | 'en' } = {}
  ) {
    this.updateIntervalMs = options.updateIntervalMs ?? 200;
    this.locale = options.locale ?? 'zh';

    this.currentProgress = {
      phase: 'preparing',
      currentFrame: 0,
      totalFrames,
      currentChunk: 0,
      totalChunks,
      percentage: 0,
      fps: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: DEFAULT_MEMORY_USAGE,
    };
  }

  /**
   */
  start(): void {
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.frameTimestamps = [];
    this.peakMemoryMB = 0;
    this.renderTimeMs = 0;
    this.encodeTimeMs = 0;

    this.forceUpdate({
      phase: 'preparing',
      currentFrame: 0,
      percentage: 0,
    });
  }

  /**
   */
  update(progress: Partial<ExportProgress>): void {
    const now = performance.now();

    this.currentProgress = {
      ...this.currentProgress,
      ...progress,
    };

    if (progress.currentFrame !== undefined) {
      this.frameTimestamps.push(now);
      if (this.frameTimestamps.length > 30) {
        this.frameTimestamps.shift();
      }

      if (this.frameTimestamps.length >= 2) {
        const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
        this.currentProgress.fps = ((this.frameTimestamps.length - 1) / timeSpan) * 1000;
      }
    }

    if (this.currentProgress.totalFrames > 0) {
      this.currentProgress.percentage = Math.round(
        (this.currentProgress.currentFrame / this.currentProgress.totalFrames) * 100
      );
    }

    this.currentProgress.estimatedTimeRemaining = this.getEstimatedTimeRemaining();

    if (progress.memoryUsage) {
      const memoryMB = progress.memoryUsage.usedJSHeapSize / (1024 * 1024);
      if (memoryMB > this.peakMemoryMB) {
        this.peakMemoryMB = memoryMB;
      }
    }

    if (now - this.lastUpdateTime >= this.updateIntervalMs) {
      this.lastUpdateTime = now;
      this.emit('progress', this.currentProgress);
    }
  }

  /**
   */
  forceUpdate(progress?: Partial<ExportProgress>): void {
    if (progress) {
      this.currentProgress = {
        ...this.currentProgress,
        ...progress,
      };
    }
    this.lastUpdateTime = performance.now();
    this.emit('progress', this.currentProgress);
  }

  /**
   */
  setPhase(phase: ExportPhase): void {
    const previousPhase = this.currentProgress.phase;
    this.currentProgress.phase = phase;

    if (previousPhase !== phase) {
      this.emit('phaseChange', this.currentProgress);
      // Emit a progress snapshot on phase transitions so short exports
      // still surface meaningful phase updates to observers.
      this.emit('progress', this.currentProgress);
    }
  }

  /**
   */
  addRenderTime(ms: number): void {
    this.renderTimeMs += ms;
  }

  /**
   */
  addEncodeTime(ms: number): void {
    this.encodeTimeMs += ms;
  }

  /**
   */
  reportError(
    code: ExportErrorCode,
    originalError?: Error,
    frameIndex?: number
  ): ExportError {
    const errorInfo = ERROR_MESSAGES[code];
    const isZh = this.locale === 'zh';

    const error: ExportError = {
      code,
      message: isZh ? errorInfo.title : errorInfo.titleEn,
      recoverable: code !== ExportErrorCode.WEBCODECS_NOT_SUPPORTED &&
                   code !== ExportErrorCode.INVALID_PROJECT,
      suggestions: isZh ? errorInfo.suggestions : errorInfo.suggestionsEn,
      frameIndex,
      originalError,
    };

    this.emit('error', undefined, error);
    return error;
  }

  /**
   */
  reportComplete(result: Partial<ExportResult>): ExportResult {
    const totalTimeMs = performance.now() - this.startTime;

    const fullResult: ExportResult = {
      success: true,
      fileSize: 0,
      duration: 0,
      totalFrames: this.currentProgress.totalFrames,
      skippedFrames: [],
      warnings: [],
      stats: {
        totalTimeMs,
        renderTimeMs: this.renderTimeMs,
        encodeTimeMs: this.encodeTimeMs,
        avgFps: this.currentProgress.totalFrames / (totalTimeMs / 1000),
        peakMemoryMB: this.peakMemoryMB,
      },
      ...result,
    };

    this.setPhase('complete');
    this.currentProgress.percentage = 100;
    this.emit('progress', this.currentProgress);
    this.emit('complete', this.currentProgress, undefined, fullResult);

    return fullResult;
  }

  /**
   */
  getEstimatedTimeRemaining(): number {
    if (this.currentProgress.currentFrame === 0 || this.startTime === 0) {
      return 0;
    }

    const elapsed = performance.now() - this.startTime;
    const framesRemaining = this.currentProgress.totalFrames - this.currentProgress.currentFrame;
    const msPerFrame = elapsed / this.currentProgress.currentFrame;

    return Math.max(0, Math.round((framesRemaining * msPerFrame) / 1000));
  }

  /**
   */
  getCurrentProgress(): ExportProgress {
    return { ...this.currentProgress };
  }

  /**
   */
  getStats(): ExportStats {
    const totalTimeMs = performance.now() - this.startTime;

    return {
      totalTimeMs,
      renderTimeMs: this.renderTimeMs,
      encodeTimeMs: this.encodeTimeMs,
      avgFps: this.currentProgress.currentFrame / (totalTimeMs / 1000),
      peakMemoryMB: this.peakMemoryMB,
    };
  }

  /**
   */
  formatErrorMessage(error: ExportError): string {
    let message = error.message;

    if (error.frameIndex !== undefined) {
      message += this.locale === 'zh'
        ? ` (frame ${error.frameIndex})`
        : ` (Frame ${error.frameIndex})`;
    }

    if (error.suggestions.length > 0) {
      message += '\n\n';
      message += this.locale === 'zh' ? 'Suggestions：\n' : 'Suggestions:\n';
      message += error.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    }

    return message;
  }

  /**
   */
  setLocale(locale: 'zh' | 'en'): void {
    this.locale = locale;
  }

  /**
   */
  on(event: ProgressEventType, handler: ProgressEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   */
  off(event: ProgressEventType, handler: ProgressEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   */
  reset(totalFrames?: number, totalChunks?: number): void {
    this.startTime = 0;
    this.lastUpdateTime = 0;
    this.frameTimestamps = [];
    this.peakMemoryMB = 0;
    this.renderTimeMs = 0;
    this.encodeTimeMs = 0;

    this.currentProgress = {
      phase: 'preparing',
      currentFrame: 0,
      totalFrames: totalFrames ?? this.currentProgress.totalFrames,
      currentChunk: 0,
      totalChunks: totalChunks ?? this.currentProgress.totalChunks,
      percentage: 0,
      fps: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: DEFAULT_MEMORY_USAGE,
    };
  }

  /**
   */
  dispose(): void {
    this.eventHandlers.clear();
    this.frameTimestamps = [];
  }

  // ============ Private Methods ============

  /**
   */
  private emit(
    type: ProgressEventType,
    progress?: ExportProgress,
    error?: ExportError,
    result?: ExportResult
  ): void {
    const event: ProgressEvent = {
      type,
      progress,
      error,
      result,
      timestamp: Date.now(),
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`ProgressReporter: Error in ${type} event handler:`, err);
        }
      });
    }
  }
}

/**
 */
export function createProgressReporter(
  totalFrames: number,
  totalChunks: number,
  options?: { updateIntervalMs?: number; locale?: 'zh' | 'en' }
): ProgressReporter {
  return new ProgressReporter(totalFrames, totalChunks, options);
}
