/**
 * MemoryManager - 内存监控和管理组件
 * 
 * 负责监控内存使用情况，在内存压力过大时触发暂停/恢复机制，
 * 并在必要时触发垃圾回收。
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
  /** 暂停阈值百分比 (默认 80%) */
  pauseThreshold: number;
  /** 恢复阈值百分比 (默认 70%) */
  resumeThreshold: number;
  /** 临界阈值百分比，触发 chunk 大小减半 (默认 95%) */
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
   * 开始内存监控
   * @param intervalMs 轮询间隔，默认 500ms
   */
  startMonitoring(intervalMs: number = DEFAULT_POLLING_INTERVAL): void {
    if (this.intervalId !== null) {
      return; // 已经在监控中
    }

    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, intervalMs);

    // 立即执行一次检查
    this.checkMemory();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPaused = false;
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentUsage(): MemoryUsage {
    if (this.lastUsage) {
      return this.lastUsage;
    }
    return this.measureMemory();
  }

  /**
   * 检查是否超过指定阈值
   */
  isOverThreshold(thresholdPercent: number): boolean {
    const usage = this.getCurrentUsage();
    return usage.usagePercent >= thresholdPercent;
  }

  /**
   * 检查当前是否处于暂停状态
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * 触发垃圾回收（如果可用）
   * 注意：gc() 只在特定环境下可用（如 Node.js --expose-gc 或某些浏览器开发工具）
   */
  async triggerGC(): Promise<void> {
    // 尝试使用全局 gc 函数（如果可用）
    if (typeof globalThis !== 'undefined' && 'gc' in globalThis && typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
    
    // 给 GC 一些时间执行
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 更新内存使用情况
    this.lastUsage = this.measureMemory();
  }

  /**
   * 释放所有资源并重置状态
   */
  releaseAll(): void {
    this.stopMonitoring();
    this.eventHandlers.clear();
    this.lastUsage = null;
    this.isPaused = false;
  }

  /**
   * 注册事件处理器
   */
  on(event: MemoryEventType, handler: MemoryEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: MemoryEventType, handler: MemoryEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 获取配置的阈值
   */
  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  /**
   * 更新阈值配置
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 获取最大内存限制 (MB)
   */
  getMaxMemoryMB(): number {
    return this.maxMemoryMB;
  }

  /**
   * 设置最大内存限制 (MB)
   */
  setMaxMemoryMB(maxMemoryMB: number): void {
    this.maxMemoryMB = maxMemoryMB;
  }

  // ============ Private Methods ============

  /**
   * 测量当前内存使用情况
   */
  private measureMemory(): MemoryUsage {
    // 使用 performance.memory API（Chrome 特有）
    const memory = (performance as any).memory;
    
    if (memory) {
      const usedJSHeapSize = memory.usedJSHeapSize;
      const totalJSHeapSize = memory.totalJSHeapSize;
      const jsHeapSizeLimit = memory.jsHeapSizeLimit;
      
      // 计算相对于配置的最大内存的使用百分比
      const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;
      const usagePercent = (usedJSHeapSize / maxMemoryBytes) * 100;
      
      return {
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        usagePercent: Math.min(usagePercent, 100), // 限制最大为 100%
      };
    }
    
    // 如果 performance.memory 不可用，返回默认值
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercent: 0,
    };
  }

  /**
   * 检查内存并触发相应事件
   */
  private checkMemory(): void {
    const usage = this.measureMemory();
    this.lastUsage = usage;
    
    const { pauseThreshold, resumeThreshold, criticalThreshold } = this.thresholds;
    
    // 触发更新事件
    this.emit('update', usage);
    
    // 检查临界阈值 (95%)
    if (usage.usagePercent >= criticalThreshold) {
      this.emit('critical', usage);
      // 临界状态下也触发 GC
      this.triggerGC();
      return;
    }
    
    // 检查暂停阈值 (80%)
    if (!this.isPaused && usage.usagePercent >= pauseThreshold) {
      this.isPaused = true;
      this.emit('pause', usage);
      // 触发 GC
      this.triggerGC();
      return;
    }
    
    // 检查恢复阈值 (70%)
    if (this.isPaused && usage.usagePercent < resumeThreshold) {
      this.isPaused = false;
      this.emit('resume', usage);
    }
  }

  /**
   * 触发事件
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
 * 创建 MemoryManager 实例
 */
export function createMemoryManager(
  maxMemoryMB: number = 512,
  thresholds?: Partial<MemoryThresholds>
): MemoryManager {
  return new MemoryManager(maxMemoryMB, thresholds);
}
