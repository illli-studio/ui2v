/**
 * ProgressReporter - 进度报告器
 * 
 * 提供导出进度信息，包括当前阶段、百分比、预估剩余时间、FPS 和内存使用情况。
 * 支持错误消息格式化和用户友好的建议。
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { MemoryUsage } from './MemoryManager';

export type ExportPhase = 'preparing' | 'rendering' | 'encoding' | 'finalizing' | 'complete';

export interface ExportProgress {
  /** 当前阶段 */
  phase: ExportPhase;
  /** 当前帧索引 */
  currentFrame: number;
  /** 总帧数 */
  totalFrames: number;
  /** 当前块索引 */
  currentChunk: number;
  /** 总块数 */
  totalChunks: number;
  /** 完成百分比 (0-100) */
  percentage: number;
  /** 当前 FPS */
  fps: number;
  /** 预估剩余时间（秒） */
  estimatedTimeRemaining: number;
  /** 内存使用情况 */
  memoryUsage: MemoryUsage;
}

export interface ExportStats {
  /** 总耗时（毫秒） */
  totalTimeMs: number;
  /** 渲染耗时（毫秒） */
  renderTimeMs: number;
  /** 编码耗时（毫秒） */
  encodeTimeMs: number;
  /** 平均 FPS */
  avgFps: number;
  /** 峰值内存使用（MB） */
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

/** 错误消息映射（中英文） */
const ERROR_MESSAGES: Record<ExportErrorCode, { 
  title: string; 
  titleEn: string;
  suggestions: string[];
  suggestionsEn: string[];
}> = {
  [ExportErrorCode.MEMORY_OVERFLOW]: {
    title: '内存不足',
    titleEn: 'Memory Overflow',
    suggestions: [
      '尝试降低导出分辨率',
      '关闭其他应用程序释放内存',
      '将动画分段导出',
    ],
    suggestionsEn: [
      'Try reducing export resolution',
      'Close other applications to free memory',
      'Export animation in segments',
    ],
  },
  [ExportErrorCode.RENDER_FAILED]: {
    title: '渲染失败',
    titleEn: 'Render Failed',
    suggestions: [
      '检查动画代码是否有错误',
      '尝试简化动画效果',
      '重新加载项目后再试',
    ],
    suggestionsEn: [
      'Check animation code for errors',
      'Try simplifying animation effects',
      'Reload project and try again',
    ],
  },
  [ExportErrorCode.ENCODE_FAILED]: {
    title: '编码失败',
    titleEn: 'Encoding Failed',
    suggestions: [
      '尝试使用不同的编码格式',
      '降低视频质量设置',
      '更新浏览器到最新版本',
    ],
    suggestionsEn: [
      'Try using a different encoding format',
      'Lower video quality settings',
      'Update browser to latest version',
    ],
  },
  [ExportErrorCode.CANCELLED]: {
    title: '导出已取消',
    titleEn: 'Export Cancelled',
    suggestions: [],
    suggestionsEn: [],
  },
  [ExportErrorCode.WEBCODECS_NOT_SUPPORTED]: {
    title: '浏览器不支持',
    titleEn: 'Browser Not Supported',
    suggestions: [
      '请使用 Chrome 94+ 或 Edge 94+',
      '更新浏览器到最新版本',
    ],
    suggestionsEn: [
      'Please use Chrome 94+ or Edge 94+',
      'Update browser to latest version',
    ],
  },
  [ExportErrorCode.INVALID_PROJECT]: {
    title: '项目配置无效',
    titleEn: 'Invalid Project',
    suggestions: [
      '检查动画配置是否完整',
      '重新创建动画项目',
    ],
    suggestionsEn: [
      'Check if animation configuration is complete',
      'Recreate animation project',
    ],
  },
  [ExportErrorCode.FILE_WRITE_FAILED]: {
    title: '文件写入失败',
    titleEn: 'File Write Failed',
    suggestions: [
      '检查磁盘空间是否充足',
      '检查文件写入权限',
      '尝试选择其他保存位置',
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
    this.updateIntervalMs = options.updateIntervalMs ?? 200; // 降低到 200ms，更频繁更新
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
   * 开始计时
   */
  start(): void {
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.frameTimestamps = [];
    this.peakMemoryMB = 0;
    this.renderTimeMs = 0;
    this.encodeTimeMs = 0;
    
    // 立即发送初始进度更新，让用户知道导出已开始
    this.forceUpdate({
      phase: 'preparing',
      currentFrame: 0,
      percentage: 0,
    });
  }

  /**
   * 更新进度
   */
  update(progress: Partial<ExportProgress>): void {
    const now = performance.now();
    
    // 更新当前进度
    this.currentProgress = {
      ...this.currentProgress,
      ...progress,
    };
    
    // 计算 FPS
    if (progress.currentFrame !== undefined) {
      this.frameTimestamps.push(now);
      // 只保留最近 30 帧的时间戳用于计算 FPS
      if (this.frameTimestamps.length > 30) {
        this.frameTimestamps.shift();
      }
      
      if (this.frameTimestamps.length >= 2) {
        const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
        this.currentProgress.fps = ((this.frameTimestamps.length - 1) / timeSpan) * 1000;
      }
    }
    
    // 计算百分比
    if (this.currentProgress.totalFrames > 0) {
      this.currentProgress.percentage = Math.round(
        (this.currentProgress.currentFrame / this.currentProgress.totalFrames) * 100
      );
    }
    
    // 计算预估剩余时间
    this.currentProgress.estimatedTimeRemaining = this.getEstimatedTimeRemaining();
    
    // 更新峰值内存
    if (progress.memoryUsage) {
      const memoryMB = progress.memoryUsage.usedJSHeapSize / (1024 * 1024);
      if (memoryMB > this.peakMemoryMB) {
        this.peakMemoryMB = memoryMB;
      }
    }
    
    // 检查是否需要发送更新事件（至少间隔 updateIntervalMs）
    if (now - this.lastUpdateTime >= this.updateIntervalMs) {
      this.lastUpdateTime = now;
      this.emit('progress', this.currentProgress);
    }
  }

  /**
   * 强制发送进度更新（不受时间间隔限制）
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
   * 设置当前阶段
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
   * 记录渲染时间
   */
  addRenderTime(ms: number): void {
    this.renderTimeMs += ms;
  }

  /**
   * 记录编码时间
   */
  addEncodeTime(ms: number): void {
    this.encodeTimeMs += ms;
  }

  /**
   * 报告错误
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
   * 报告完成
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
   * 获取预估剩余时间（秒）
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
   * 获取当前进度
   */
  getCurrentProgress(): ExportProgress {
    return { ...this.currentProgress };
  }

  /**
   * 获取统计信息
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
   * 格式化错误消息（用于显示）
   */
  formatErrorMessage(error: ExportError): string {
    let message = error.message;
    
    if (error.frameIndex !== undefined) {
      message += this.locale === 'zh' 
        ? ` (帧 ${error.frameIndex})` 
        : ` (Frame ${error.frameIndex})`;
    }
    
    if (error.suggestions.length > 0) {
      message += '\n\n';
      message += this.locale === 'zh' ? '建议：\n' : 'Suggestions:\n';
      message += error.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    }
    
    return message;
  }

  /**
   * 设置语言
   */
  setLocale(locale: 'zh' | 'en'): void {
    this.locale = locale;
  }

  /**
   * 注册事件处理器
   */
  on(event: ProgressEventType, handler: ProgressEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: ProgressEventType, handler: ProgressEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 重置报告器
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
   * 释放资源
   */
  dispose(): void {
    this.eventHandlers.clear();
    this.frameTimestamps = [];
  }

  // ============ Private Methods ============

  /**
   * 触发事件
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
 * 创建 ProgressReporter 实例
 */
export function createProgressReporter(
  totalFrames: number,
  totalChunks: number,
  options?: { updateIntervalMs?: number; locale?: 'zh' | 'en' }
): ProgressReporter {
  return new ProgressReporter(totalFrames, totalChunks, options);
}
