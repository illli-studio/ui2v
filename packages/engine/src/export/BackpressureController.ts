/**
 * BackpressureController - 背压控制器
 * 
 * 防止编码队列溢出，通过限制待处理帧数量来控制渲染和编码之间的流量。
 * 当编码速度跟不上渲染速度时，会暂停渲染直到有足够的容量。
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

export interface BackpressureConfig {
  /** 最大待处理帧数，默认 5 */
  maxPendingFrames: number;
}

export type BackpressureEventType = 'queueFull' | 'queueAvailable' | 'frameEnqueued' | 'frameCompleted';

export interface BackpressureEvent {
  type: BackpressureEventType;
  pendingCount: number;
  maxPending: number;
  timestamp: number;
}

export type BackpressureEventHandler = (event: BackpressureEvent) => void;

const DEFAULT_CONFIG: BackpressureConfig = {
  maxPendingFrames: 5,
};

export class BackpressureController {
  private config: BackpressureConfig;
  private pendingCount: number = 0;
  private waitingResolvers: Array<() => void> = [];
  private eventHandlers: Map<BackpressureEventType, Set<BackpressureEventHandler>> = new Map();

  constructor(config: Partial<BackpressureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检查是否可以继续渲染（队列未满）
   */
  canProceed(): boolean {
    return this.pendingCount < this.config.maxPendingFrames;
  }

  /**
   * 等待直到可以继续渲染
   * 如果队列已满，返回一个 Promise，在有容量时 resolve
   */
  async waitForCapacity(): Promise<void> {
    if (this.canProceed()) {
      return Promise.resolve();
    }

    // 队列已满，等待容量
    return new Promise<void>((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  /**
   * 记录帧入队（开始编码）
   */
  frameEnqueued(): void {
    this.pendingCount++;
    
    this.emit('frameEnqueued', this.pendingCount);
    
    // 检查是否达到最大容量
    if (this.pendingCount >= this.config.maxPendingFrames) {
      this.emit('queueFull', this.pendingCount);
    }
  }

  /**
   * 记录帧完成（编码完成）
   */
  frameCompleted(): void {
    if (this.pendingCount > 0) {
      this.pendingCount--;
    }
    
    this.emit('frameCompleted', this.pendingCount);
    
    // 如果有等待的渲染器，通知它们可以继续
    if (this.canProceed() && this.waitingResolvers.length > 0) {
      this.emit('queueAvailable', this.pendingCount);
      
      // 释放一个等待的渲染器
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   * 获取当前待处理帧数
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * 获取最大待处理帧数配置
   */
  getMaxPendingFrames(): number {
    return this.config.maxPendingFrames;
  }

  /**
   * 设置最大待处理帧数
   */
  setMaxPendingFrames(max: number): void {
    this.config.maxPendingFrames = max;
    
    // 如果新的限制更大，可能需要释放等待的渲染器
    while (this.canProceed() && this.waitingResolvers.length > 0) {
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   * 获取等待中的渲染器数量
   */
  getWaitingCount(): number {
    return this.waitingResolvers.length;
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.pendingCount = 0;
    
    // 释放所有等待的渲染器
    while (this.waitingResolvers.length > 0) {
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this.reset();
    this.eventHandlers.clear();
  }

  /**
   * 注册事件处理器
   */
  on(event: BackpressureEventType, handler: BackpressureEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: BackpressureEventType, handler: BackpressureEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 获取队列状态信息（用于监控）
   */
  getStatus(): {
    pendingCount: number;
    maxPending: number;
    waitingCount: number;
    isFull: boolean;
    utilizationPercent: number;
  } {
    return {
      pendingCount: this.pendingCount,
      maxPending: this.config.maxPendingFrames,
      waitingCount: this.waitingResolvers.length,
      isFull: !this.canProceed(),
      utilizationPercent: (this.pendingCount / this.config.maxPendingFrames) * 100,
    };
  }

  // ============ Private Methods ============

  /**
   * 触发事件
   */
  private emit(type: BackpressureEventType, pendingCount: number): void {
    const event: BackpressureEvent = {
      type,
      pendingCount,
      maxPending: this.config.maxPendingFrames,
      timestamp: Date.now(),
    };
    
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`BackpressureController: Error in ${type} event handler:`, error);
        }
      });
    }
  }
}

/**
 * 创建 BackpressureController 实例
 */
export function createBackpressureController(
  config?: Partial<BackpressureConfig>
): BackpressureController {
  return new BackpressureController(config);
}
