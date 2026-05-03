/**
 * 
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

export interface BackpressureConfig {
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
   */
  canProceed(): boolean {
    return this.pendingCount < this.config.maxPendingFrames;
  }

  /**
   */
  async waitForCapacity(): Promise<void> {
    if (this.canProceed()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  /**
   */
  frameEnqueued(): void {
    this.pendingCount++;
    
    this.emit('frameEnqueued', this.pendingCount);
    
    if (this.pendingCount >= this.config.maxPendingFrames) {
      this.emit('queueFull', this.pendingCount);
    }
  }

  /**
   */
  frameCompleted(): void {
    if (this.pendingCount > 0) {
      this.pendingCount--;
    }
    
    this.emit('frameCompleted', this.pendingCount);
    
    if (this.canProceed() && this.waitingResolvers.length > 0) {
      this.emit('queueAvailable', this.pendingCount);
      
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   */
  getMaxPendingFrames(): number {
    return this.config.maxPendingFrames;
  }

  /**
   */
  setMaxPendingFrames(max: number): void {
    this.config.maxPendingFrames = max;
    
    while (this.canProceed() && this.waitingResolvers.length > 0) {
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   */
  getWaitingCount(): number {
    return this.waitingResolvers.length;
  }

  /**
   */
  reset(): void {
    this.pendingCount = 0;
    
    while (this.waitingResolvers.length > 0) {
      const resolver = this.waitingResolvers.shift();
      if (resolver) {
        resolver();
      }
    }
  }

  /**
   */
  dispose(): void {
    this.reset();
    this.eventHandlers.clear();
  }

  /**
   */
  on(event: BackpressureEventType, handler: BackpressureEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   */
  off(event: BackpressureEventType, handler: BackpressureEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
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
 */
export function createBackpressureController(
  config?: Partial<BackpressureConfig>
): BackpressureController {
  return new BackpressureController(config);
}
