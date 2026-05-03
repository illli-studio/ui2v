/**
 * Chunked export coordinator used by the WebCodecs exporter.
 *
 * This class owns frame planning, memory pressure handling, cancellation, and
 * progress events. Actual muxing is handled by WebCodecsExporter.
 */


import { createVideoFramePlan, type VideoFramePlan } from '@ui2v/runtime-core';
import { MemoryManager, type MemoryUsage } from './MemoryManager';
import { BackpressureController } from './BackpressureController';
import { 
  ProgressReporter, 
  ExportErrorCode,
  type ExportProgress,
  type ExportResult,
  type ExportError,
  type ExportPhase,
} from './ProgressReporter';
import type { AnimationProject } from '../types';
import type { OptimizedHybridEngine } from '../core/OptimizedHybridEngine';

export interface ChunkedExportEngineConfig {
  chunkSize: number;
  maxMemoryMB: number;
  maxPendingFrames: number;
  retryAttempts: number;
  yieldInterval: number;
}

const DEFAULT_CONFIG: ChunkedExportEngineConfig = {
  chunkSize: 30,
  maxMemoryMB: 512,
  maxPendingFrames: 5,
  retryAttempts: 3,
  yieldInterval: 10,
};

async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => {
    const startTime = performance.now();
    const checkDelay = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= ms) {
        resolve();
      } else {
        const channel = new MessageChannel();
        channel.port1.onmessage = checkDelay;
        channel.port2.postMessage(null);
      }
    };
    checkDelay();
  });
}

export interface ExportOptions {
  format: 'mp4';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps?: number;
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
}

export type ExportStatus = 
  | 'idle' 
  | 'preparing' 
  | 'rendering' 
  | 'encoding' 
  | 'finalizing' 
  | 'complete' 
  | 'error' 
  | 'cancelled';

export interface ExportStatusInfo {
  status: ExportStatus;
  progress: ExportProgress;
  error?: ExportError;
}

export type ChunkedExportEventType = 
  | 'progress' 
  | 'error' 
  | 'complete' 
  | 'cancelled'
  | 'chunkStart'
  | 'chunkComplete';

export interface ChunkedExportEvent {
  type: ChunkedExportEventType;
  progress?: ExportProgress;
  error?: ExportError;
  result?: ExportResult;
  chunkIndex?: number;
  timestamp: number;
}

export type ChunkedExportEventHandler = (event: ChunkedExportEvent) => void;

interface ChunkInfo {
  index: number;
  startFrame: number;
  endFrame: number;
  frameCount: number;
}

// ==================== ChunkedExportEngine ====================

export class ChunkedExportEngine {
  private config: ChunkedExportEngineConfig;
  private memoryManager: MemoryManager;
  private backpressureController: BackpressureController;
  private progressReporter: ProgressReporter | null = null;
  
  private status: ExportStatus = 'idle';
  private abortController: AbortController | null = null;
  private eventHandlers: Map<ChunkedExportEventType, Set<ChunkedExportEventHandler>> = new Map();
  
  // Export state
  private currentProject: AnimationProject | null = null;
  private currentOptions: ExportOptions | null = null;
  private skippedFrames: number[] = [];
  private chunks: ChunkInfo[] = [];
  private framePlan: VideoFramePlan[] = [];
  private currentChunkSize: number;
  
  // Resource tracking for cleanup (Requirement 5.4, 5.5)
  private pendingVideoFrames: Set<VideoFrame> = new Set();
  private currentEngine: OptimizedHybridEngine | null = null;
  private currentCanvas: HTMLCanvasElement | null = null;

  constructor(config: Partial<ChunkedExportEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentChunkSize = this.config.chunkSize;
    
    // Initialize utility components
    this.memoryManager = new MemoryManager(this.config.maxMemoryMB);
    this.backpressureController = new BackpressureController({
      maxPendingFrames: this.config.maxPendingFrames,
    });
    
    // Setup memory event handlers
    this.setupMemoryHandlers();
  }

  // ==================== Public API ====================

  
  async startExport(
    project: AnimationProject,
    engine: OptimizedHybridEngine,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Validate state
    if (this.status !== 'idle') {
      throw new Error('Export already in progress');
    }
    
    // Validate project
    if (!project || !project.duration || !project.fps) {
      const error = this.createError(ExportErrorCode.INVALID_PROJECT);
      this.emit('error', undefined, error);
      throw error;
    }
    
    // Initialize export
    this.currentProject = project;
    this.currentOptions = options;
    this.skippedFrames = [];
    this.abortController = new AbortController();
    this.currentChunkSize = this.config.chunkSize;
    
    // Calculate total frames from the shared runtime video plan.
    this.framePlan = createVideoFramePlan({
      duration: project.duration,
      fps: options.fps || project.fps,
    });
    const totalFrames = this.framePlan.length;
    
    // Calculate chunks
    this.chunks = this.calculateChunks(totalFrames, this.currentChunkSize);
    
    // Initialize progress reporter
    this.progressReporter = new ProgressReporter(totalFrames, this.chunks.length);
    this.setupProgressHandlers();
    
    try {
      // Start memory monitoring
      this.memoryManager.startMonitoring(500);
      
      // Start progress tracking
      this.progressReporter.start();
      
      // Execute export
      this.setStatus('preparing');
      const result = await this.executeExport(engine);
      
      // Report completion
      this.setStatus('complete');
      this.progressReporter.reportComplete(result);
      this.emit('complete', undefined, undefined, result);
      
      return result;
      
    } catch (error) {
      // Handle error
      const exportError = this.handleExportError(error);
      this.setStatus('error');
      this.emit('error', undefined, exportError);
      throw exportError;
      
    } finally {
      // Cleanup
      this.cleanup();
    }
  }

  
  async cancel(): Promise<void> {
    if (!this.abortController || this.status === 'idle') {
      return;
    }
    
    const cancelStart = performance.now();
    
    // Signal cancellation (Requirement 5.1)
    this.abortController.abort();
    
    // Verify signal was sent within 100ms
    const signalTime = performance.now() - cancelStart;
    if (signalTime > 100) {
      console.warn(`Cancellation signal took ${signalTime.toFixed(2)}ms (expected < 100ms)`);
    }
    
    // Wait a bit for cleanup (allow render loop to detect cancellation)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update status
    this.setStatus('cancelled');
    this.emit('cancelled');
    
    // Cleanup resources (handled in cleanup method)
    this.cleanup();
  }

  
  getStatus(): ExportStatusInfo {
    return {
      status: this.status,
      progress: this.progressReporter?.getCurrentProgress() || this.getDefaultProgress(),
      error: undefined,
    };
  }

  
  on(event: ChunkedExportEventType, handler: ChunkedExportEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  
  off(event: ChunkedExportEventType, handler: ChunkedExportEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  
  dispose(): void {
    this.cleanup();
    this.eventHandlers.clear();
    this.memoryManager.releaseAll();
    this.backpressureController.dispose();
  }

  // ==================== Private Methods - Chunk Processing ====================

  
  private calculateChunks(totalFrames: number, chunkSize: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const numChunks = Math.ceil(totalFrames / chunkSize);
    
    for (let i = 0; i < numChunks; i++) {
      const startFrame = i * chunkSize;
      const endFrame = Math.min(startFrame + chunkSize, totalFrames);
      
      chunks.push({
        index: i,
        startFrame,
        endFrame,
        frameCount: endFrame - startFrame,
      });
    }
    
    return chunks;
  }

  
  private async executeExport(engine: OptimizedHybridEngine): Promise<ExportResult> {
    if (!this.currentProject || !this.currentOptions || !this.progressReporter) {
      throw new Error('Export not properly initialized');
    }
    
    // Prepare canvas for rendering
    const canvas = engine['canvas'] as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas not available');
    }
    
    // Track resources for cleanup (Requirement 5.4)
    this.currentEngine = engine;
    this.currentCanvas = canvas;
    
    // Set export mode
    engine.setExportMode(true);
    
    // Start rendering phase
    this.setStatus('rendering');
    
    // Process each chunk sequentially
    for (let chunkIndex = 0; chunkIndex < this.chunks.length; chunkIndex++) {
      // Check for cancellation (Requirement 5.2)
      if (this.abortController?.signal.aborted) {
        throw new Error('Export cancelled');
      }
      
      const chunk = this.chunks[chunkIndex];
      
      // Emit chunk start event
      this.emit('chunkStart', undefined, undefined, undefined, chunkIndex);
      
      // Process chunk
      await this.processChunk(engine, chunk);
      
      // Emit chunk complete event
      this.emit('chunkComplete', undefined, undefined, undefined, chunkIndex);
      
      // Trigger GC between chunks
      await this.memoryManager.triggerGC();
      
      // Check if chunk size needs adjustment due to memory pressure
      if (this.currentChunkSize !== this.config.chunkSize) {
        // Recalculate remaining chunks
        const remainingFrames = this.progressReporter.getCurrentProgress().totalFrames - 
                                this.progressReporter.getCurrentProgress().currentFrame;
        if (remainingFrames > 0) {
          const remainingChunks = this.calculateChunks(remainingFrames, this.currentChunkSize);
          // Update chunks array (replace remaining chunks)
          this.chunks = [
            ...this.chunks.slice(0, chunkIndex + 1),
            ...remainingChunks.map((c, i) => ({
              ...c,
              index: chunkIndex + 1 + i,
              startFrame: this.progressReporter!.getCurrentProgress().currentFrame + c.startFrame,
              endFrame: this.progressReporter!.getCurrentProgress().currentFrame + c.endFrame,
            })),
          ];
        }
      }
      
      // Yield to main thread periodically

      if (chunkIndex % 3 === 0) {
        await delay(0);
      }
    }
    
    // Finalize export
    this.setStatus('finalizing');
    
    // Check for quality warnings
    const warnings: string[] = [];
    const skipRate = this.skippedFrames.length / this.progressReporter.getCurrentProgress().totalFrames;
    if (skipRate > 0.1) {
      warnings.push(
        `More than 10% of frames were skipped (${this.skippedFrames.length}/${this.progressReporter.getCurrentProgress().totalFrames}). ` +
        'Video quality may be affected.'
      );
    }
    
    // Create result
    const result: ExportResult = {
      success: true,
      fileSize: 0, // Will be set by actual encoder
      duration: this.currentProject.duration,
      totalFrames: this.progressReporter.getCurrentProgress().totalFrames,
      skippedFrames: this.skippedFrames,
      warnings,
      stats: this.progressReporter.getStats(),
    };
    
    // Reset export mode
    engine.setExportMode(false);
    
    return result;
  }

  
  private async processChunk(
    engine: OptimizedHybridEngine,
    chunk: ChunkInfo
  ): Promise<void> {
    if (!this.progressReporter) {
      throw new Error('Progress reporter not initialized');
    }
    
    // Update progress
    this.progressReporter.update({
      currentChunk: chunk.index,
      memoryUsage: this.memoryManager.getCurrentUsage(),
    });
    
    // Process each frame in the chunk
    for (let i = chunk.startFrame; i < chunk.endFrame; i++) {
      // Check for cancellation (Requirement 5.2)
      if (this.abortController?.signal.aborted) {
        throw new Error('Export cancelled');
      }
      
      // Check memory pressure - pause if needed

      while (this.memoryManager.isPausedState()) {
        await delay(0);
        
        // Check for cancellation during pause (Requirement 5.2)
        if (this.abortController?.signal.aborted) {
          throw new Error('Export cancelled');
        }
      }
      
      // Wait for backpressure capacity
      await this.backpressureController.waitForCapacity();
      
      // Check for cancellation after waiting (Requirement 5.2)
      if (this.abortController?.signal.aborted) {
        throw new Error('Export cancelled');
      }
      
      const plannedFrame = this.framePlan[i];
      if (!plannedFrame) {
        throw new Error(`Missing video frame plan for frame ${i}`);
      }
      
      // Render frame with retry
      const renderStart = performance.now();
      const videoFrame = await this.renderFrameWithRetry(engine, plannedFrame);
      const renderTime = performance.now() - renderStart;
      
      // Track render time
      this.progressReporter.addRenderTime(renderTime);
      
      // If frame was skipped, continue to next frame
      if (!videoFrame) {
        this.skippedFrames.push(i);
        continue;
      }
      
      // Track VideoFrame for cleanup (Requirement 5.4)
      this.pendingVideoFrames.add(videoFrame);
      
      // Mark frame as enqueued for encoding
      this.backpressureController.frameEnqueued();
      
      // Simulate encoding (actual encoding will be done by WebCodecsExporter)
      // For now, just close the frame and mark as completed
      const encodeStart = performance.now();
      videoFrame.close();
      const encodeTime = performance.now() - encodeStart;
      
      // Remove from tracking after close (Requirement 5.4)
      this.pendingVideoFrames.delete(videoFrame);
      
      // Track encode time
      this.progressReporter.addEncodeTime(encodeTime);
      
      // Mark frame as completed
      this.backpressureController.frameCompleted();
      
      // Update progress
      this.progressReporter.update({
        currentFrame: i + 1,
        memoryUsage: this.memoryManager.getCurrentUsage(),
      });
      
      // Yield to main thread periodically

      if ((i - chunk.startFrame) % this.config.yieldInterval === 0) {
        await delay(0);
      }
    }
  }

  
  private async renderFrameWithRetry(
    engine: OptimizedHybridEngine,
    plannedFrame: VideoFramePlan
  ): Promise<VideoFrame | null> {
    const maxAttempts = this.config.retryAttempts;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Check for cancellation (Requirement 5.2)
        if (this.abortController?.signal.aborted) {
          throw new Error('Export cancelled');
        }
        
        // Render the frame
        const videoFrame = await this.renderFrame(engine, plannedFrame);
        
        // Success!
        return videoFrame;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If cancelled, rethrow immediately
        if (this.abortController?.signal.aborted) {
          throw lastError;
        }
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxAttempts - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms

          const delayMs = 100 * Math.pow(2, attempt);
          await delay(delayMs);
          
          // Check for cancellation after delay (Requirement 5.2)
          if (this.abortController?.signal.aborted) {
            throw new Error('Export cancelled');
          }
        }
      }
    }
    
    // All attempts failed, log warning and skip frame
    console.warn(
      `Failed to render frame ${plannedFrame.index} after ${maxAttempts} attempts. Skipping frame.`,
      lastError
    );
    
    // Return null to indicate frame should be skipped
    return null;
  }

  
  private async renderFrame(
    engine: OptimizedHybridEngine,
    plannedFrame: VideoFramePlan
  ): Promise<VideoFrame> {
    // Render frame using engine
    const asyncRender = (engine as unknown as { renderFrameAsync?: (t: number) => Promise<void> })
      .renderFrameAsync;
    if (typeof asyncRender === 'function') {
      await asyncRender.call(engine, plannedFrame.renderTime);
    } else {
      engine.renderFrame(plannedFrame.renderTime);
    }
    
    // Get canvas
    const canvas = engine['canvas'] as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas not available');
    }
    
    // Create VideoFrame from canvas
    // Note: This requires WebCodecs API support
    if (typeof VideoFrame === 'undefined') {
      throw new Error('WebCodecs API not supported');
    }
    
    try {
      // Create VideoFrame from canvas
      const videoFrame = new VideoFrame(canvas, {
        timestamp: plannedFrame.timestampUs,
        duration: plannedFrame.durationUs,
      });
      
      return videoFrame;
      
    } catch (error) {
      throw new Error(`Failed to create VideoFrame: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== Private Methods - Memory Management ====================

  
  private setupMemoryHandlers(): void {
    this.memoryManager.on('pause', () => {
      // Memory pressure detected, pausing will be handled in render loop
    });
    
    this.memoryManager.on('resume', () => {
      // Memory pressure relieved, resuming will be handled in render loop
    });
    
    this.memoryManager.on('critical', () => {
      // Critical memory pressure, reduce chunk size
      this.currentChunkSize = Math.max(5, Math.floor(this.currentChunkSize / 2));
      // Recalculate chunks if export is in progress
      if (this.status === 'rendering' && this.currentProject) {
        this.chunks = this.calculateChunks(this.framePlan.length, this.currentChunkSize);
      }
    });
  }

  
  private setupProgressHandlers(): void {
    if (!this.progressReporter) return;
    
    this.progressReporter.on('progress', (event) => {
      if (event.progress) {
        this.emit('progress', event.progress);
      }
    });
    
    this.progressReporter.on('error', (event) => {
      if (event.error) {
        this.emit('error', undefined, event.error);
      }
    });
  }

  // ==================== Private Methods - Error Handling ====================

  
  private createError(
    code: ExportErrorCode,
    originalError?: Error,
    frameIndex?: number
  ): ExportError {
    if (this.progressReporter) {
      return this.progressReporter.reportError(code, originalError, frameIndex);
    }
    
    // Fallback if no progress reporter
    return {
      code,
      message: code,
      recoverable: false,
      suggestions: [],
      frameIndex,
      originalError,
    };
  }

  
  private handleExportError(error: unknown): ExportError {
    if (this.abortController?.signal.aborted) {
      return this.createError(ExportErrorCode.CANCELLED);
    }
    
    if (error instanceof Error) {
      // Determine error code based on error message
      if (error.message.includes('memory')) {
        return this.createError(ExportErrorCode.MEMORY_OVERFLOW, error);
      } else if (error.message.includes('render')) {
        return this.createError(ExportErrorCode.RENDER_FAILED, error);
      } else if (error.message.includes('encode')) {
        return this.createError(ExportErrorCode.ENCODE_FAILED, error);
      }
    }
    
    return this.createError(
      ExportErrorCode.RENDER_FAILED,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  // ==================== Private Methods - Utilities ====================

  
  private setStatus(status: ExportStatus): void {
    this.status = status;
    
    // Update progress reporter phase
    if (this.progressReporter) {
      const phaseMap: Record<ExportStatus, ExportPhase | null> = {
        idle: null,
        preparing: 'preparing',
        rendering: 'rendering',
        encoding: 'encoding',
        finalizing: 'finalizing',
        complete: 'complete',
        error: null,
        cancelled: null,
      };
      
      const phase = phaseMap[status];
      if (phase) {
        this.progressReporter.setPhase(phase);
      }
    }
  }

  
  private cleanup(): void {
    // Close all pending VideoFrames (Requirement 5.4)
    if (this.pendingVideoFrames.size > 0) {
      for (const frame of this.pendingVideoFrames) {
        try {
          frame.close();
        } catch (error) {
          console.warn('Error closing VideoFrame during cleanup:', error);
        }
      }
      this.pendingVideoFrames.clear();
    }
    
    // Clear canvas (Requirement 5.4)
    if (this.currentCanvas) {
      try {
        const ctx = this.currentCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
        }
      } catch (error) {
        console.warn('Error clearing canvas during cleanup:', error);
      }
      this.currentCanvas = null;
    }
    
    // Dispose renderers (Requirement 5.4)
    if (this.currentEngine) {
      try {
        // Reset export mode
        this.currentEngine.setExportMode(false);
        
        // Dispose engine if it has a dispose method
        if (typeof (this.currentEngine as any).dispose === 'function') {
          (this.currentEngine as any).dispose();
        }
      } catch (error) {
        console.warn('Error disposing engine during cleanup:', error);
      }
      this.currentEngine = null;
    }
    
    // Stop memory monitoring
    this.memoryManager.stopMonitoring();
    
    // Reset backpressure controller
    this.backpressureController.reset();
    
    // Dispose progress reporter
    if (this.progressReporter) {
      this.progressReporter.dispose();
      this.progressReporter = null;
    }
    
    // Reset state (Requirement 5.5)
    this.currentProject = null;
    this.currentOptions = null;
    this.skippedFrames = [];
    this.chunks = [];
    this.framePlan = [];
    this.abortController = null;
    this.currentChunkSize = this.config.chunkSize;
    this.status = 'idle';
  }

  
  private getDefaultProgress(): ExportProgress {
    return {
      phase: 'preparing',
      currentFrame: 0,
      totalFrames: 0,
      currentChunk: 0,
      totalChunks: 0,
      percentage: 0,
      fps: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercent: 0,
      },
    };
  }

  
  private emit(
    type: ChunkedExportEventType,
    progress?: ExportProgress,
    error?: ExportError,
    result?: ExportResult,
    chunkIndex?: number
  ): void {
    const event: ChunkedExportEvent = {
      type,
      progress,
      error,
      result,
      chunkIndex,
      timestamp: Date.now(),
    };
    
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`ChunkedExportEngine: Error in ${type} event handler:`, err);
        }
      });
    }
  }
}

export function createChunkedExportEngine(
  config?: Partial<ChunkedExportEngineConfig>
): ChunkedExportEngine {
  return new ChunkedExportEngine(config);
}
