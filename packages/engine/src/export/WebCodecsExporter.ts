/**
 * Browser-native MP4 exporter for ui2v.
 *
 * The exporter renders frames with the browser engine, encodes them with
 * WebCodecs, and muxes the encoded packets into MP4 with Mediabunny.
 */


import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  EncodedVideoPacketSource,
  EncodedPacket
} from 'mediabunny';
import { createVideoFramePlan, type SegmentFramePlanItem, type VideoFramePlan } from '@ui2v/runtime-core';
import type { OptimizedHybridEngine } from '../core/OptimizedHybridEngine';
import type { AnimationProject } from '../types';
import type { ExportProgress } from './ProgressReporter';
import {
  ChunkedExportEngine,
  createChunkedExportEngine,
  type ChunkedExportEngineConfig,
  type ExportOptions as ChunkedExportOptions,
} from './ChunkedExportEngine';

type WebCodecsQuality = 'low' | 'medium' | 'high' | 'ultra' | 'cinema';

export interface WebCodecsExportOptions {
  fps: number;
  width: number;
  height: number;
  renderScale?: number;
  duration: number;
  quality?: WebCodecsQuality;
  codec?: 'avc' | 'hevc';
  bitrate?: number;
  framePlan?: Array<VideoFramePlan | SegmentFramePlanItem>;
}

export interface WebCodecsExportProgress {
  phase: 'rendering' | 'encoding' | 'finalizing' | 'complete';
  progress: number; // 0-100
  renderedFrames: number;
  totalFrames: number;
  fps?: number;
  estimatedTimeRemaining?: number;
  segmentId?: string;
  segmentLabel?: string;
  segmentFrameIndex?: number;
  segmentLocalTime?: number;
  segmentProgress?: number;
  progressDetails?: ExportProgress;
}

export class WebCodecsExporter {
  private chunkedEngine: ChunkedExportEngine;
  private canvas: HTMLCanvasElement | null = null;
  private encoder: VideoEncoder | null = null;
  private output: Output | null = null;
  private videoSource: EncodedVideoPacketSource | null = null;
  private exportWorker: Worker | null = null;

  constructor(config?: Partial<ChunkedExportEngineConfig>) {
    this.chunkedEngine = createChunkedExportEngine(config);
  }

  static isSupported(): boolean {
    return (
      typeof VideoEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined' &&
      typeof window !== 'undefined'
    );
  }

  async exportToVideo(
    engine: OptimizedHybridEngine,
    canvas: HTMLCanvasElement,
    options: WebCodecsExportOptions,
    onProgress?: (progress: WebCodecsExportProgress) => void
  ): Promise<Blob> {
    if (!WebCodecsExporter.isSupported()) {
      throw new Error('WebCodecs API not supported in this browser. Please use Chrome 94+ or Edge 94+');
    }

    const {
      fps,
      width,
      height,
      renderScale = 1,
      duration,
      quality = 'high',
      codec = 'avc',
      bitrate: customBitrate,
      framePlan: providedFramePlan,
    } = options;

    const framePlan = providedFramePlan && providedFramePlan.length > 0
      ? providedFramePlan
      : createVideoFramePlan({ duration, fps });
    const totalFrames = framePlan.length;

    this.canvas = canvas;

    try {
      const startTime = performance.now();
      let encodedFrames = 0;

      const bitrate = customBitrate || this.calculateBitrate(width, height, quality);

      this.output = new Output({
        format: new Mp4OutputFormat({
          fastStart: 'in-memory',
        }),
        target: new BufferTarget(),
      });

      const codecString = this.getCodecString(codec, quality);

      const mediabunnyCodec = codec;
      this.videoSource = new EncodedVideoPacketSource(mediabunnyCodec as any);
      this.output.addVideoTrack(this.videoSource, {
        frameRate: fps,
      });

      await this.output.start();

      // Realtime encoding is faster, but a bitrate cushion preserves detail.
      const adjustedBitrate = bitrate * 1.5;

      const config: VideoEncoderConfig = {
        codec: codecString,
        width,
        height,
        bitrate: adjustedBitrate,
        framerate: fps,
        latencyMode: 'realtime',
        hardwareAcceleration: 'prefer-hardware',
      };

      if (codec === 'avc') {
        (config as any).avc = { format: 'avc' };
      }

      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) {
        if (codec === 'hevc') {
          config.codec = this.getCodecString('avc', quality);
          (config as any).avc = { format: 'avc' };
          const avcSupport = await VideoEncoder.isConfigSupported(config);
          if (!avcSupport.supported) {
            throw new Error(formatCodecSupportError('Neither HEVC nor AVC is supported by this browser', config, width, height, fps));
          }
        } else {
          config.hardwareAcceleration = 'prefer-software';
          const softwareSupport = await VideoEncoder.isConfigSupported(config);
          if (!softwareSupport.supported) {
            throw new Error(formatCodecSupportError(`Codec ${codec} is not supported by this browser`, config, width, height, fps));
          }
        }
      }

      const progressTracker = { lastReportedProgress: 0 };

      const encoderPromise = new Promise<void>((resolve, reject) => {
        this.encoder = new VideoEncoder({
          output: async (chunk, metadata) => {
            const segmentProgressInfo = getFrameSegmentProgress(framePlan[Math.min(encodedFrames, totalFrames - 1)]);
            if (this.videoSource) {
              try {
                await this.videoSource.add(EncodedPacket.fromEncodedChunk(chunk), metadata);
              } catch (err) {
                console.error('[WebCodecsExporter] Failed to add chunk:', err);
              }
            }
            encodedFrames++;

            const encodingProgress = 50 + Math.round((encodedFrames / totalFrames) * 45);

            if (encodingProgress > progressTracker.lastReportedProgress) {
              progressTracker.lastReportedProgress = encodingProgress;

              const elapsed = performance.now() - startTime;
              const estimatedTotal = encodedFrames > 0 ? (elapsed / encodedFrames) * totalFrames : 0;
              const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);
              const currentFPS = encodedFrames > 0 ? (encodedFrames / elapsed) * 1000 : 0;

              if (encodedFrames % 10 === 0 || encodedFrames === totalFrames) {
                onProgress?.({
                  phase: 'encoding',
                  progress: encodingProgress,
                  renderedFrames: encodedFrames,
                  totalFrames,
                  fps: currentFPS,
                  estimatedTimeRemaining: Math.round(estimatedRemaining / 1000),
                  ...segmentProgressInfo,
                });
              }
            }
          },
          error: (error) => {
            console.error(`[WebCodecsExporter.exportToVideo] Encoder error:`, error);
            reject(error);
          },
        });

        this.encoder.configure(config);

        const project: AnimationProject = {
          id: 'export-' + Date.now(),
          mode: 'template',
          duration,
          fps,
          resolution: { width, height },
        };

        const chunkedOptions: ChunkedExportOptions = {
          format: 'mp4',
          quality: toChunkedQuality(quality),
          fps,
          width,
          height,
          codec: codecString,
          bitrate,
        };

        this.encodeFramesChunked(this.encoder!, engine, canvas, project, chunkedOptions, framePlan, renderScale, resolve, reject, onProgress, progressTracker);
      });

      await encoderPromise;

      onProgress?.({
        phase: 'finalizing',
        progress: 95,
        renderedFrames: totalFrames,
        totalFrames,
        ...getFrameSegmentProgress(framePlan[totalFrames - 1]),
      });

      if (this.output) {
        await this.output.finalize();
        const target = this.output.target as BufferTarget;
        const buffer = target.buffer;

        if (!buffer) {
          throw new Error('Output buffer is null');
        }

        const blob = new Blob([buffer], { type: 'video/mp4' });

        const totalTime = (performance.now() - startTime) / 1000;
        const avgFPS = totalFrames / totalTime;

        onProgress?.({
          phase: 'complete',
          progress: 100,
          renderedFrames: totalFrames,
          totalFrames,
          fps: avgFPS,
          ...getFrameSegmentProgress(framePlan[totalFrames - 1]),
        });

        return blob;
      } else {
        throw new Error('Output not initialized');
      }
    } catch (error) {
      console.error(`[WebCodecsExporter.exportToVideo] Export failed:`, error);
      throw error;
    } finally {
      // Cleanup resources (Requirement 8.4)
      this.dispose();
    }
  }

  
  private async encodeFramesChunked(
      encoder: VideoEncoder,
      engine: OptimizedHybridEngine,
      canvas: HTMLCanvasElement,
      project: AnimationProject,
      options: ChunkedExportOptions,
      framePlan: Array<VideoFramePlan | SegmentFramePlanItem>,
      renderScale: number,
      resolve: () => void,
      reject: (error: any) => void,
      onProgress?: (progress: WebCodecsExportProgress) => void,
      progressTracker?: { lastReportedProgress: number }
    ): Promise<void> {
      const fps = options.fps || project.fps;
      const outputWidth = options.width ?? project.resolution.width;
      const outputHeight = options.height ?? project.resolution.height;
      const totalFrames = framePlan.length;
      const startTime = performance.now();
      const captureCanvas = createCaptureCanvas(canvas, outputWidth, outputHeight, renderScale);
      const captureContext = captureCanvas === canvas
        ? null
        : captureCanvas.getContext('2d', { alpha: true });

      if (captureCanvas !== canvas && !captureContext) {
        throw new Error('Unable to create export downsample canvas');
      }

      if (onProgress) {
        try {
          onProgress({
            phase: 'rendering',
            progress: 1,
            renderedFrames: 0,
            totalFrames,
            fps: 0,
            estimatedTimeRemaining: 0,
            ...getFrameSegmentProgress(framePlan[0]),
          });
        } catch (err) {}
      }

      let workerUrl: string | null = null;
      try {
        const workerCode = `
          let isRunning = false;
          let currentFrame = 0;
          let totalFrames = 0;
          let waitingForFrame = false;

          self.onmessage = (e) => {
            const { type, data } = e.data;

            switch (type) {
              case 'start':
                totalFrames = data.totalFrames || 0;
                currentFrame = 0;
                isRunning = true;
                waitingForFrame = false;
                runLoop();
                break;

              case 'frameComplete':
                waitingForFrame = false;
                break;

              case 'stop':
                isRunning = false;
                self.postMessage({ type: 'stopped' });
                break;
            }
          };

          async function runLoop() {
            while (isRunning && currentFrame < totalFrames) {
              if (!waitingForFrame) {
                self.postMessage({ type: 'tick', data: { frameIndex: currentFrame } });
                waitingForFrame = true;
                currentFrame++;
              }
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            isRunning = false;
            self.postMessage({ type: 'stopped' });
          }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(blob);
        this.exportWorker = new Worker(workerUrl);

        const worker = this.exportWorker!;

        await new Promise<void>((resolveFrames, rejectFrames) => {
          worker.onmessage = async (e: MessageEvent) => {
            const { type, data } = e.data;

            if (type === 'tick') {
              const frameIndex = data.frameIndex;
              const plannedFrame = framePlan[frameIndex];

              if (!plannedFrame) {
                rejectFrames(new Error(`Missing video frame plan for frame ${frameIndex}`));
                return;
              }

              try {
                while (encoder.encodeQueueSize > 10) {
                  await new Promise(resolve => {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = () => resolve(undefined);
                    channel.port2.postMessage(null);
                  });
                }

                const time = plannedFrame.renderTime;

                try {
                  const asyncRender = (engine as unknown as { renderFrameAsync?: (t: number) => Promise<void> })
                    .renderFrameAsync;
                  if (typeof asyncRender === 'function') {
                    await asyncRender.call(engine, time);
                  } else {
                    engine.renderFrame(time);
                  }
                } catch (renderError) {
                  console.error(`[WebCodecsExporter] Render error at frame ${frameIndex}:`, renderError);
                }

                if (frameIndex % 30 === 0 && onProgress) {
                  const elapsed = performance.now() - startTime;
                  const framesPerSecond = frameIndex > 0 ? (frameIndex / elapsed) * 1000 : 0;
                  const remainingFrames = totalFrames - frameIndex;
                  const estimatedRemaining = framesPerSecond > 0 ? remainingFrames / framesPerSecond : 0;
                  const renderProgress = Math.max(1, Math.round((frameIndex / totalFrames) * 50));

                  if (!progressTracker || renderProgress > progressTracker.lastReportedProgress) {
                    if (progressTracker) {
                      progressTracker.lastReportedProgress = renderProgress;
                    }

                    try {
                      onProgress({
                        phase: 'rendering',
                        progress: renderProgress,
                        renderedFrames: frameIndex,
                        totalFrames,
                        fps: framesPerSecond,
                        estimatedTimeRemaining: Math.round(estimatedRemaining),
                        ...getFrameSegmentProgress(plannedFrame),
                      });
                    } catch (err) {}
                  }
                }

                let videoFrame: VideoFrame | null = null;
                try {
                  const frameSource = captureContext
                    ? downsampleFrame(canvas, captureCanvas, captureContext)
                    : canvas;
                  videoFrame = new VideoFrame(frameSource, {
                    timestamp: plannedFrame.timestampUs,
                    duration: plannedFrame.durationUs,
                  });

                  encoder.encode(videoFrame, { keyFrame: plannedFrame.keyframe });
                } catch (frameError) {
                  console.error(`[WebCodecsExporter] Frame encoding error at frame ${frameIndex}:`, frameError);
                } finally {
                  if (videoFrame) {
                    videoFrame.close();
                  }
                }

                try {
                  worker.postMessage({ type: 'frameComplete' });
                } catch (postError) {
                  console.error('[WebCodecsExporter] Failed to send frameComplete message:', postError);
                }

              } catch (error) {
                console.error('[WebCodecsExporter] Frame processing error:', error);
                try {
                  worker.postMessage({ type: 'stop' });
                } catch (postError) {

                }
                rejectFrames(error);
              }
            } else if (type === 'stopped') {
              resolveFrames();
            }
          };

          worker.onerror = (error) => {
            console.error('[WebCodecsExporter] Worker error:', error);
            rejectFrames(error);
          };

          worker.postMessage({
            type: 'start',
            data: { totalFrames, targetFps: fps }
          });
        });

      } finally {
        if (this.exportWorker) {
          this.exportWorker.terminate();
          this.exportWorker = null;
        }
        if (workerUrl) {
          URL.revokeObjectURL(workerUrl);
        }
      }

      if (onProgress) {
        try {
          onProgress({
            phase: 'encoding',
            progress: 75,
            renderedFrames: totalFrames,
            totalFrames,
            fps: 0,
            estimatedTimeRemaining: 0,
            ...getFrameSegmentProgress(framePlan[totalFrames - 1]),
          });
        } catch (err) {}
      }

      const flushTimeout = 120000;
      const flushPromise = encoder.flush();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Encoder flush timeout')), flushTimeout)
      );

      try {
        await Promise.race([flushPromise, timeoutPromise]);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        if (encoder.state !== 'closed') {
          try {
            encoder.close();
          } catch (closeError) {}
        }
      }
    }

  
  cancel(): void {
    if (this.exportWorker) {
      try {
        this.exportWorker.postMessage({ type: 'stop' });
      } catch (error) {
        // Ignore
      }
    }
    this.chunkedEngine.cancel();
  }

  
  dispose(): void {
    if (this.encoder && this.encoder.state !== 'closed') {
      try {
        this.encoder.close();
      } catch (error) {
        // Ignore
      }
      this.encoder = null;
    }

    this.output = null;
    this.videoSource = null;

    if (this.exportWorker) {
      try {
        this.exportWorker.terminate();
      } catch (error) {
        // Ignore
      }
      this.exportWorker = null;
    }

    if (this.canvas) {
      try {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      } catch (error) {
        // Ignore
      }
      this.canvas = null;
    }

    this.chunkedEngine.dispose();
  }

  
  private getCodecString(codec: 'avc' | 'hevc', quality: WebCodecsQuality): string {
    switch (codec) {
      case 'avc':

        if (quality === 'high' || quality === 'ultra' || quality === 'cinema') {
          return 'avc1.640033';  // High Profile, Level 5.1
        } else if (quality === 'medium') {
          return 'avc1.64002A';  // High Profile, Level 4.2
        } else {
          return 'avc1.640028';  // High Profile, Level 4.0
        }
      case 'hevc':

        // Main Profile, Level 5.1
        return 'hev1.1.6.L153.B0';
      default:
        return 'avc1.640033';
    }
  }

  
  private calculateBitrate(width: number, height: number, quality: WebCodecsQuality): number {
    const pixelCount = width * height;

    let bitsPerPixel: number;

    if (quality === 'cinema') {
      bitsPerPixel = 0.9;
    } else if (quality === 'ultra') {
      bitsPerPixel = 0.7;
    } else if (quality === 'high') {
      bitsPerPixel = 0.5;
    } else if (quality === 'medium') {
      bitsPerPixel = 0.3;
    } else {
      bitsPerPixel = 0.18;
    }

    let bitrate = pixelCount * bitsPerPixel * 30;

    if (pixelCount >= 3840 * 2160) {
      bitrate *= 1.5;  // 4K
    } else if (pixelCount >= 1920 * 1080) {
      bitrate *= 1.3;  // 1080p
    } else if (pixelCount >= 1280 * 720) {
      bitrate *= 1.1;  // 720p
    }

    return Math.min(Math.max(bitrate, 8_000_000), 150_000_000);
  }
}

function getFrameSegmentProgress(frame: VideoFramePlan | SegmentFramePlanItem | undefined): Partial<WebCodecsExportProgress> {
  if (!frame || !('segmentId' in frame) || !frame.segmentId) {
    return {};
  }

  return {
    segmentId: frame.segmentId,
    segmentLabel: frame.segmentLabel,
    segmentFrameIndex: frame.segmentFrameIndex,
    segmentLocalTime: frame.segmentLocalTime,
    segmentProgress: frame.segmentProgress,
  };
}

function toChunkedQuality(quality: WebCodecsQuality): ChunkedExportOptions['quality'] {
  if (quality === 'cinema' || quality === 'ultra') {
    return 'ultra';
  }
  return quality;
}

function createCaptureCanvas(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  renderScale: number
): HTMLCanvasElement {
  const clampedScale = Math.max(1, Math.min(4, renderScale));
  if (clampedScale === 1 && sourceCanvas.width === width && sourceCanvas.height === height) {
    return sourceCanvas;
  }

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = width;
  captureCanvas.height = height;
  return captureCanvas;
}

function downsampleFrame(
  sourceCanvas: HTMLCanvasElement,
  captureCanvas: HTMLCanvasElement,
  captureContext: CanvasRenderingContext2D
): HTMLCanvasElement {
  captureContext.setTransform(1, 0, 0, 1, 0, 0);
  captureContext.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
  captureContext.imageSmoothingEnabled = true;
  captureContext.imageSmoothingQuality = 'high';
  captureContext.drawImage(sourceCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas;
}

function formatCodecSupportError(
  reason: string,
  config: VideoEncoderConfig,
  width: number,
  height: number,
  fps: number
): string {
  return [
    reason,
    `Requested encoder: ${config.codec}`,
    `Render size: ${width}x${height} @ ${fps}fps`,
    'Run `ui2v doctor` to verify WebCodecs and AVC/H.264 support in the selected browser.',
  ].join('\n');
}

export function createWebCodecsExporter(config?: Partial<ChunkedExportEngineConfig>): WebCodecsExporter {
  return new WebCodecsExporter(config);
}
