export interface PerformanceConfig {
  targetFPS: number;
  minFPS: number;
  sampleSize: number;
  adjustInterval: number;
}

export interface QualitySettings {
  nodeCount: number;
  effectDetail: 'low' | 'medium' | 'high' | 'ultra';
  enableShadows: boolean;
  enableBlur: boolean;
  renderScale: number;
}

export interface PerformanceMetrics {
  fps: number;
  avgFrameTime: number;
  maxFrameTime: number;
  minFrameTime: number;
  droppedFrames: number;
  qualityLevel: number;
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private frameTimes: number[] = [];
  private lastAdjustTime = 0;
  private qualityLevel = 100;
  private qualityPresets: Record<string, QualitySettings> = {
    ultra: {
      nodeCount: 30,
      effectDetail: 'ultra',
      enableShadows: true,
      enableBlur: true,
      renderScale: 1.0
    },
    high: {
      nodeCount: 20,
      effectDetail: 'high',
      enableShadows: true,
      enableBlur: false,
      renderScale: 1.0
    },
    medium: {
      nodeCount: 15,
      effectDetail: 'medium',
      enableShadows: false,
      enableBlur: false,
      renderScale: 0.8
    },
    low: {
      nodeCount: 10,
      effectDetail: 'low',
      enableShadows: false,
      enableBlur: false,
      renderScale: 0.6
    }
  };

  private currentSettings: QualitySettings;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      targetFPS: config?.targetFPS || 60,
      minFPS: config?.minFPS || 30,
      sampleSize: config?.sampleSize || 60,
      adjustInterval: config?.adjustInterval || 2000
    };

    this.currentSettings = { ...this.qualityPresets.ultra };
  }

  recordFrame(frameTime: number): void {
    this.frameTimes.push(frameTime);

    if (this.frameTimes.length > this.config.sampleSize) {
      this.frameTimes.shift();
    }
  }

  getMetrics(): PerformanceMetrics {
    if (this.frameTimes.length === 0) {
      return {
        fps: 0,
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        droppedFrames: 0,
        qualityLevel: this.qualityLevel
      };
    }

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const maxFrameTime = Math.max(...this.frameTimes);
    const minFrameTime = Math.min(...this.frameTimes);
    const fps = 1000 / avgFrameTime;
    const targetFrameTime = 1000 / this.config.targetFPS;
    const droppedFrames = this.frameTimes.filter(t => t > targetFrameTime).length;
    
    return {
      fps,
      avgFrameTime,
      maxFrameTime,
      minFrameTime,
      droppedFrames,
      qualityLevel: this.qualityLevel
    };
  }

  autoAdjust(): boolean {
    const now = Date.now();
    
    if (now - this.lastAdjustTime < this.config.adjustInterval) {
      return false;
    }

    if (this.frameTimes.length < this.config.sampleSize * 0.5) {
      return false;
    }

    this.lastAdjustTime = now;

    const metrics = this.getMetrics();
    const { fps } = metrics;

    let adjusted = false;

    if (fps < this.config.minFPS && this.qualityLevel > 0) {
      this.qualityLevel = Math.max(0, this.qualityLevel - 25);
      adjusted = true;
    }
    else if (fps > this.config.targetFPS * 0.95 && this.qualityLevel < 100) {
      this.qualityLevel = Math.min(100, this.qualityLevel + 10);
      adjusted = true;
    }

    if (adjusted) {
      this.updateSettings();
    }

    return adjusted;
  }

  private updateSettings(): void {
    if (this.qualityLevel >= 75) {
      this.currentSettings = { ...this.qualityPresets.ultra };
    } else if (this.qualityLevel >= 50) {
      this.currentSettings = { ...this.qualityPresets.high };
    } else if (this.qualityLevel >= 25) {
      this.currentSettings = { ...this.qualityPresets.medium };
    } else {
      this.currentSettings = { ...this.qualityPresets.low };
    }
  }

  setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0, Math.min(100, level));
    this.updateSettings();
  }

  getQualitySettings(): QualitySettings {
    return { ...this.currentSettings };
  }

  setQualityPreset(name: string, settings: QualitySettings): void {
    this.qualityPresets[name] = settings;
  }

  getQualityLevel(): number {
    return this.qualityLevel;
  }

  reset(): void {
    this.frameTimes = [];
    this.lastAdjustTime = 0;
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const settings = this.getQualitySettings();

    return `
Performance Report
========
FPS: ${metrics.fps.toFixed(1)}
Avg Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms
Max Frame Time: ${metrics.maxFrameTime.toFixed(2)}ms
Min Frame Time: ${metrics.minFrameTime.toFixed(2)}ms
Dropped Frames: ${metrics.droppedFrames}/${this.frameTimes.length}

Quality Settings
========
Quality Level: ${this.qualityLevel}%
Nodes: ${settings.nodeCount}
Effect Detail: ${settings.effectDetail}
Shadows: ${settings.enableShadows ? 'On' : 'Off'}
Blur: ${settings.enableBlur ? 'On' : 'Off'}
Render Scale: ${(settings.renderScale * 100).toFixed(0)}%
    `.trim();
  }

  /**
   * Determine whether render quality should be reduced.
   */
  shouldDowngrade(): boolean {
    const metrics = this.getMetrics();
    return metrics.fps < this.config.minFPS && this.qualityLevel > 0;
  }

  canUpgrade(): boolean {
    const metrics = this.getMetrics();
    return metrics.fps > this.config.targetFPS * 0.95 && this.qualityLevel < 100;
  }

  getRecommendedMode(): 'webgl' | 'canvas2d' | 'worker' {
    const metrics = this.getMetrics();
    
    if (metrics.fps >= this.config.targetFPS * 0.9) {
      return 'webgl';
    } else if (metrics.fps >= this.config.minFPS) {
      return 'worker';
    } else {
      return 'canvas2d';
    }
  }
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private optimizer: PerformanceOptimizer;
  private enabled = true;

  private constructor() {
    this.optimizer = new PerformanceOptimizer();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  getOptimizer(): PerformanceOptimizer {
    return this.optimizer;
  }

  startMonitoring(_logIntervalMs = 5000): void {
    this.enabled = true;
  }

  stopMonitoring(): void {
    this.enabled = false;
  }

  recordFrame(frameTime: number): void {
    if (this.enabled) {
      this.optimizer.recordFrame(frameTime);
      this.optimizer.autoAdjust();
    }
  }
}
