import { normalizeProject } from './normalize/normalizeProject';
import { createDependencyPlan, getDependenciesForRange, type DependencyPlanOptions } from './dependencies/DependencyPlan';
import { MotionScheduler } from './scheduler/MotionScheduler';
import { TimelineEngine } from './timeline/TimelineEngine';
import type { EngineAdapter } from './types';

export interface UivRuntimeOptions {
  adapter?: EngineAdapter;
}

export class UivRuntime {
  readonly composition;
  readonly scene;
  readonly timeline: TimelineEngine;
  readonly scheduler: MotionScheduler;

  constructor(project: Parameters<typeof normalizeProject>[0], options: UivRuntimeOptions = {}) {
    const normalized = normalizeProject(project);
    this.composition = normalized.composition;
    this.scene = normalized.scene;
    this.timeline = new TimelineEngine(this.composition, this.scene);
    this.scheduler = new MotionScheduler(this.timeline, {
      adapter: options.adapter,
    });
  }

  async initializeAdapter(adapter: EngineAdapter): Promise<void> {
    await adapter.initialize({
      composition: this.composition,
      scene: this.scene.snapshot(),
    });
  }

  evaluate(time: number) {
    return this.timeline.evaluate(time);
  }

  getDependencyPlan(options?: DependencyPlanOptions) {
    return createDependencyPlan(this.composition, this.scene.snapshot(), options);
  }

  getDependenciesForRange(startTime: number, endTime: number) {
    return getDependenciesForRange(this.composition, this.scene.snapshot(), startTime, endTime);
  }

  async renderFrame(time: number, adapter: EngineAdapter) {
    const frame = this.evaluate(time);
    await adapter.render(frame);
    return frame;
  }
}
