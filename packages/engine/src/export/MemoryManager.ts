/**
 * 
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

export interface MemoryThresholds {
  pauseThreshold: number;
  resumeThreshold: number;
  criticalThreshold: number;
}

export type MemoryEventType = 'pause' | 'resume' | 'critical' | 'update';

export interface MemoryEvent {
  type: MemoryEventType;
  usage: MemoryUsage;
  timestamp: number;
}

export type MemoryEventHandler = (event: MemoryEvent) => void;

const DEFAULT_THRESHOLDS: MemoryThresholds = {
  pauseThreshold: 80,
  resumeThreshold: 70,
  criticalThreshold: 95,
};

const DEFAULT_POLLING_INTERVAL = 500; // ms

export class MemoryManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private thresholds: MemoryThresholds;
  private maxMemoryMB: number;
  private isPaused: boolean = false;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();
  private lastUsage: MemoryUsage | null = null;

  constructor(maxMemoryMB: number = 512, thresholds: Partial<MemoryThresholds> = {}) {
    this.maxMemoryMB = maxMemoryMB;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   */
  startMonitoring(intervalMs: number = DEFAULT_POLLING_INTERVAL): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, intervalMs);

    this.checkMemory();
  }

  /**
   */
  stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPaused = false;
  }

  /**
   */
  getCurrentUsage(): MemoryUsage {
    if (this.lastUsage) {
      return this.lastUsage;
    }
    return this.measureMemory();
  }

  /**
   */
  isOverThreshold(thresholdPercent: number): boolean {
    const usage = this.getCurrentUsage();
    return usage.usagePercent >= thresholdPercent;
  }

  /**
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   */
  async triggerGC(): Promise<void> {
    if (typeof globalThis !== 'undefined' && 'gc' in globalThis && typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.lastUsage = this.measureMemory();
  }

  /**
   */
  releaseAll(): void {
    this.stopMonitoring();
    this.eventHandlers.clear();
    this.lastUsage = null;
    this.isPaused = false;
  }

  /**
   */
  on(event: MemoryEventType, handler: MemoryEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   */
  off(event: MemoryEventType, handler: MemoryEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   */
  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  /**
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   */
  getMaxMemoryMB(): number {
    return this.maxMemoryMB;
  }

  /**
   */
  setMaxMemoryMB(maxMemoryMB: number): void {
    this.maxMemoryMB = maxMemoryMB;
  }

  // ============ Private Methods ============

  /**
   */
  private measureMemory(): MemoryUsage {
    const memory = (performance as any).memory;
    
    if (memory) {
      const usedJSHeapSize = memory.usedJSHeapSize;
      const totalJSHeapSize = memory.totalJSHeapSize;
      const jsHeapSizeLimit = memory.jsHeapSizeLimit;
      
      const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;
      const usagePercent = (usedJSHeapSize / maxMemoryBytes) * 100;
      
      return {
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        usagePercent: Math.min(usagePercent, 100),
      };
    }
    
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercent: 0,
    };
  }

  /**
   */
  private checkMemory(): void {
    const usage = this.measureMemory();
    this.lastUsage = usage;
    
    const { pauseThreshold, resumeThreshold, criticalThreshold } = this.thresholds;
    
    this.emit('update', usage);
    
    if (usage.usagePercent >= criticalThreshold) {
      this.emit('critical', usage);
      this.triggerGC();
      return;
    }
    
    if (!this.isPaused && usage.usagePercent >= pauseThreshold) {
      this.isPaused = true;
      this.emit('pause', usage);
      this.triggerGC();
      return;
    }
    
    if (this.isPaused && usage.usagePercent < resumeThreshold) {
      this.isPaused = false;
      this.emit('resume', usage);
    }
  }

  /**
   */
  private emit(type: MemoryEventType, usage: MemoryUsage): void {
    const event: MemoryEvent = {
      type,
      usage,
      timestamp: Date.now(),
    };
    
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`MemoryManager: Error in ${type} event handler:`, error);
        }
      });
    }
  }
}

/**
 */
export function createMemoryManager(
  maxMemoryMB: number = 512,
  thresholds?: Partial<MemoryThresholds>
): MemoryManager {
  return new MemoryManager(maxMemoryMB, thresholds);
}
