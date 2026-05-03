import type { EngineAdapter, RuntimeClock, RuntimeFrame, SchedulerState } from '../types';
import { TimelineEngine } from '../timeline/TimelineEngine';

export interface MotionSchedulerOptions {
  clock?: RuntimeClock;
  adapter?: EngineAdapter;
  loop?: boolean;
}

export class MotionScheduler {
  private state: SchedulerState = {
    status: 'idle',
    time: 0,
    frame: 0,
  };
  private tickId: number | null = null;
  private startClockTime = 0;
  private startRuntimeTime = 0;

  constructor(
    private readonly timeline: TimelineEngine,
    private readonly options: MotionSchedulerOptions = {}
  ) {}

  getState(): SchedulerState {
    return { ...this.state };
  }

  play(startTime = this.state.time): void {
    if (!this.options.clock) {
      throw new Error('MotionScheduler.play requires a RuntimeClock');
    }

    this.state.status = 'playing';
    this.startClockTime = this.options.clock.now();
    this.startRuntimeTime = startTime;
    this.scheduleNextTick();
  }

  pause(): void {
    this.cancelScheduledTick();
    this.state.status = 'paused';
  }

  stop(): void {
    this.cancelScheduledTick();
    this.state = {
      status: 'stopped',
      time: 0,
      frame: 0,
    };
  }

  seek(time: number): RuntimeFrame {
    const frame = this.timeline.evaluate(time);
    this.state.time = frame.time;
    this.state.frame = frame.frame;
    return frame;
  }

  async renderFrame(time: number): Promise<RuntimeFrame> {
    const frame = this.seek(time);
    await this.options.adapter?.render(frame);
    return frame;
  }

  private scheduleNextTick(): void {
    const clock = this.options.clock;
    if (!clock || this.state.status !== 'playing') {
      return;
    }

    this.tickId = clock.requestTick(() => {
      const elapsed = (clock.now() - this.startClockTime) / 1000;
      const frame = this.seek(this.startRuntimeTime + elapsed);
      this.options.adapter?.render(frame);
      this.scheduleNextTick();
    });
  }

  private cancelScheduledTick(): void {
    if (this.tickId !== null && this.options.clock) {
      this.options.clock.cancelTick(this.tickId);
      this.tickId = null;
    }
  }
}

