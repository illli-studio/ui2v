import type { RuntimeClock } from '../types';

export class ManualClock implements RuntimeClock {
  private currentTime = 0;
  private nextId = 1;
  private callbacks = new Map<number, () => void>();

  now(): number {
    return this.currentTime;
  }

  setTime(milliseconds: number): void {
    this.currentTime = milliseconds;
  }

  advance(milliseconds: number): void {
    this.currentTime += milliseconds;
    const callbacks = Array.from(this.callbacks.values());
    this.callbacks.clear();
    callbacks.forEach(callback => callback());
  }

  requestTick(callback: () => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }

  cancelTick(id: number): void {
    this.callbacks.delete(id);
  }
}

