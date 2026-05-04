import { TemplateRenderer } from './TemplateRenderer';
import { CanvasCompositor } from './CanvasCompositor';
import { PerformanceOptimizer, PerformanceMonitor } from './PerformanceOptimizer';
import type { AnimationProject, PerformanceStats } from '../types';

export interface OptimizedEngineConfig {
  enablePerformanceMonitoring?: boolean;
  enableAutoQualityAdjust?: boolean;
  targetFPS?: number;
  container?: HTMLElement;
}

/**
 * Browser rendering engine for ui2v template projects.
 */
export class OptimizedHybridEngine {
  private canvas: HTMLCanvasElement;
  private templateRenderer: TemplateRenderer | null = null;
  private compositor: CanvasCompositor | null = null;
  private performanceOptimizer: PerformanceOptimizer;
  private container?: HTMLElement;

  public currentProject: AnimationProject | null = null;
  private isPlaying = false;
  private animationFrameId: number | null = null;
  private startTime = 0;
  private pausedTime = 0;
  private isExporting = false;
  private config: OptimizedEngineConfig;
  private frameCount = 0;
  private renderTimes: number[] = [];
  private lastRenderScale = 1.0;

  constructor(canvas: HTMLCanvasElement, config: OptimizedEngineConfig = {}) {
    this.canvas = canvas;
    this.config = {
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      enableAutoQualityAdjust: config.enableAutoQualityAdjust ?? true,
      targetFPS: config.targetFPS ?? 60,
      container: config.container
    };
    this.container = config.container;

    this.templateRenderer = new TemplateRenderer(canvas, this.container);
    this.compositor = new CanvasCompositor(canvas);

    this.performanceOptimizer = new PerformanceOptimizer({
      targetFPS: this.config.targetFPS,
      minFPS: 30,
      sampleSize: 60,
      adjustInterval: 2000
    });

    if (this.config.enablePerformanceMonitoring) {
      PerformanceMonitor.getInstance().startMonitoring(5000);
    }
  }

  /**
   */
  private convertBackgroundToLayer(project: AnimationProject): void {
    if (project.backgroundColor && project.template?.layers) {
      const hasBackgroundLayer = project.template.layers.some(
        layer => layer.zIndex !== undefined && layer.zIndex < 0
      );

      if (!hasBackgroundLayer) {
        const backgroundLayer = {
          id: 'auto-background',
          name: 'Background',
          type: 'custom-code',
          zIndex: -1000,
          startTime: 0,
          endTime: project.duration,
          visible: true,
          opacity: 1,
          properties: {
            code: `function createRenderer() {
  function render(t, context) {
    const { mainContext, width, height } = context;
    const ctx = mainContext;
    ctx.fillStyle = '${project.backgroundColor}';
    ctx.fillRect(0, 0, width, height);
  }
  return { render };
}`
          }
        };

        project.template.layers.unshift(backgroundLayer as any);
      }
    }
  }

  /**
   * Render a single frame.
   */
  async loadProject(project: AnimationProject): Promise<void> {
    this.currentProject = project;

    try {
      // Keep the backing canvas aligned with the project resolution.
      if (project.resolution) {
        let width: number, height: number;

        const res = project.resolution as any;
        if (typeof res === 'string') {
          [width, height] = res.split('x').map(Number);
        } else if (typeof project.resolution === 'object') {
          width = project.resolution.width;
          height = project.resolution.height;
        } else {
          width = 1920;
          height = 1080;
        }

        if (width > 0 && height > 0) {
          this.canvas.width = width;
          this.canvas.height = height;
          await this.templateRenderer?.updateCanvasSize(width, height);
        }
      }

      // Keep legacy projects with root-level layers renderable.
      if (!project.template && (project as any).layers) {
        project.template = {
          layers: (project as any).layers
        };
      }

      if (!project.template) {
        throw new Error('No template or layers found in project');
      }

      this.convertBackgroundToLayer(project);

      await this.templateRenderer?.load(project.template);

      this.performanceOptimizer.reset();

      this.renderFrame(0);
    } catch (error: any) {
      console.error('Project load failed:', error);

      // visually report error to canvas
      if (this.compositor) {
        this.compositor.clear();
        this.compositor.fillBackground('#200');
        this.compositor.drawError(`Load Error: ${error.message}`);
      }

      throw error;
    }
  }

  play(): void {
    if (!this.currentProject || this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = performance.now() - this.pausedTime;
    this.frameCount = 0;
    this.renderTimes = [];
    this.animate();
  }

  pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.pausedTime = performance.now() - this.startTime;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop(): void {
    this.pause();
    this.pausedTime = 0;
    this.compositor?.clear();
  }

  seekTo(timeMs: number): void {
    if (!this.currentProject) return;

    const timeInSeconds = timeMs / 1000;
    const maxTime = this.currentProject.duration;
    const clampedTimeInSeconds = Math.max(0, Math.min(maxTime, timeInSeconds));

    this.pausedTime = clampedTimeInSeconds * 1000;

    this.templateRenderer?.reset();

    if (this.isPlaying) {
      this.startTime = performance.now() - clampedTimeInSeconds * 1000;
    }

    this.renderFrame(clampedTimeInSeconds);
  }

  private animate = (): void => {
    if (!this.isPlaying || !this.currentProject) return;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const duration = this.currentProject.duration * 1000;
    const elapsedMs = elapsed % duration;
    const time = elapsedMs / 1000;

    const frameStart = performance.now();
    this.renderFrame(time);
    const frameTime = performance.now() - frameStart;

    this.performanceOptimizer.recordFrame(frameTime);
    PerformanceMonitor.getInstance().recordFrame(frameTime);

    if (this.config.enableAutoQualityAdjust) {
      this.performanceOptimizer.autoAdjust();
    }

    this.frameCount++;
    this.renderTimes.push(frameTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }

    if (this.config.enableAutoQualityAdjust && this.templateRenderer) {
      const qs = this.performanceOptimizer.getQualitySettings();
      if (qs.renderScale !== this.lastRenderScale) {
        this.lastRenderScale = qs.renderScale;
        const targetW = Math.round((this.canvas.width || 1920) * qs.renderScale);
        const targetH = Math.round((this.canvas.height || 1080) * qs.renderScale);
        this.templateRenderer.updateCanvasSize(targetW, targetH).catch(err => {
          console.error('Failed to update canvas size:', err);
        });
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Render a frame at the requested timeline time in seconds.
   */
  renderFrame(time: number): void {
    if (!this.currentProject) {
      return;
    }

    try {
      this.compositor?.clear();


      // Render the template graph, including custom-code and background layers.
      // Note: render() may return a Promise for async operations (like SVG drawing)
      // We don't await here to avoid blocking the animation loop
      const renderPromise = this.templateRenderer?.render(time);
      
      // If render returns a Promise, handle it asynchronously
      if (renderPromise && typeof renderPromise.then === 'function') {
        renderPromise.then(() => {
          const templateCanvas = this.templateRenderer?.getCanvas();
          if (templateCanvas) {
            this.compositor?.drawCanvas(
              templateCanvas,
              0, 0,
              this.canvas.width || 1920,
              this.canvas.height || 1080
            );
          }
        }).catch(error => {
          console.error('Async render error:', error);
        });
      } else {
        // Synchronous render completed
        const templateCanvas = this.templateRenderer?.getCanvas();
        if (templateCanvas) {
          this.compositor?.drawCanvas(
            templateCanvas,
            0, 0,
            this.canvas.width || 1920,
            this.canvas.height || 1080
          );
        }
      }

    } catch (error) {
      this.handleRenderError(error);
    }
  }

  /**
   * Export-safe frame rendering that awaits async layer renderers
   * to ensure the compositor has the final pixels before capture.
   */
  async renderFrameAsync(time: number): Promise<void> {
    if (!this.currentProject) {
      return;
    }

    try {
      this.compositor?.clear();

      const renderResult = this.templateRenderer?.render(time);
      if (renderResult && typeof (renderResult as Promise<void>).then === 'function') {
        await renderResult;
      }

      const templateCanvas = this.templateRenderer?.getCanvas();
      if (templateCanvas) {
        this.compositor?.drawCanvas(
          templateCanvas,
          0, 0,
          this.canvas.width || 1920,
          this.canvas.height || 1080
        );
      }
    } catch (error) {
      this.handleRenderError(error);
      throw error;
    }
  }

  private handleRenderError(error: any): void {
    this.compositor?.drawError(error.message || 'Unknown error');
    this.pause();
  }


  getPerformanceStats(): PerformanceStats & {
    qualityLevel: number;
    cacheStats?: { hits: number; misses: number; hitRate: number };
  } {
    const metrics = this.performanceOptimizer.getMetrics();
    const cacheStats = this.templateRenderer?.getCacheStats();

    return {
      fps: Math.round(metrics.fps),
      frameTime: metrics.avgFrameTime,
      renderTime: metrics.avgFrameTime,
      cacheHitRate: cacheStats?.hitRate ?? 0,
      memoryUsage: 0,
      qualityLevel: metrics.qualityLevel,
      cacheStats
    };
  }

  getPerformanceReport(): string {
    return this.performanceOptimizer.generateReport();
  }

  setQualityLevel(level: number): void {
    this.performanceOptimizer.setQualityLevel(level);
  }

  getQualitySettings(): any {
    return this.performanceOptimizer.getQualitySettings();
  }

  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pausedTime;
    }

    const elapsed = performance.now() - this.startTime;
    const duration = this.currentProject ? this.currentProject.duration * 1000 : 0;

    return (elapsed % duration) / 1000;
  }

  setExportMode(isExporting: boolean): void {
    this.isExporting = isExporting;
    this.templateRenderer?.setExportMode(isExporting);
    
    if (isExporting && this.templateRenderer) {
      this.templateRenderer.reset();
    }
  }

  setRenderScale(scale: number): void {
    if (!this.templateRenderer) return;
    const clamped = Math.max(0.25, Math.min(4, scale));
    if (clamped === this.lastRenderScale) return;
    this.lastRenderScale = clamped;
    this.templateRenderer.setRenderScale(clamped);

    const targetW = Math.round((this.canvas.width || 1920) * clamped);
    const targetH = Math.round((this.canvas.height || 1080) * clamped);
    this.templateRenderer.updateCanvasSize(targetW, targetH).catch(err => {
      console.error('Failed to update canvas size for render scale:', err);
    });
  }

  /**
   * Configure a high-DPI backing store while preserving logical project size.
   * Used by preview and supersampled export paths.
   */
  setPreviewPixelRatio(width: number, height: number, pixelRatio: number): void {
    if (!this.templateRenderer) return;

    const clamped = Math.max(1, Math.min(4, pixelRatio));
    const backingWidth = Math.round(width * clamped);
    const backingHeight = Math.round(height * clamped);

    this.canvas.width = backingWidth;
    this.canvas.height = backingHeight;
    if (typeof HTMLCanvasElement !== 'undefined' && this.canvas instanceof HTMLCanvasElement) {
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }

    this.lastRenderScale = clamped;
    this.templateRenderer.setRenderScale(clamped);
    this.templateRenderer.updateCanvasSize(backingWidth, backingHeight).catch(err => {
      console.error('Failed to update preview pixel ratio:', err);
    });
  }

  async preloadDependencies(dependencies: string[]): Promise<void> {
    await this.templateRenderer?.preloadDependencies(dependencies);
  }

  getRenderCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
    return this.templateRenderer?.getCanvas() ?? null;
  }

  /**
   */
  async hotUpdateProject(project: AnimationProject): Promise<void> {
    this.currentProject = project;
    if (project.template) {
      await this.templateRenderer?.updateConfig(project.template);
    }
  }

  dispose(): void {
    this.stop();
    this.templateRenderer?.dispose();
    this.compositor?.dispose();

    if (this.config.enablePerformanceMonitoring) {
      PerformanceMonitor.getInstance().stopMonitoring();
    }

    this.currentProject = null;
  }
}


