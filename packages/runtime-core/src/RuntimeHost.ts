import { normalizeProject } from './normalize/normalizeProject';
import { createAdapterRoutingPlan } from './adapters/AdapterRouter';
import { createDependencyPlan, getDependenciesForRange, type DependencyPlanOptions } from './dependencies/DependencyPlan';
import { createDrawCommandStream } from './draw-commands/DrawCommand';
import { createRenderPlan } from './render-plan/RenderPlan';
import { MotionScheduler } from './scheduler/MotionScheduler';
import { TimelineEngine } from './timeline/TimelineEngine';
import type { EngineAdapter, RuntimeClock } from './types';

export interface RuntimeHostOptions {
  adapter?: EngineAdapter;
  clock?: RuntimeClock;
}

export class RuntimeHost {
  readonly composition;
  readonly scene;
  readonly timeline: TimelineEngine;
  readonly scheduler: MotionScheduler;

  private adapter?: EngineAdapter;
  private initialized = false;

  constructor(project: Parameters<typeof normalizeProject>[0], options: RuntimeHostOptions = {}) {
    const normalized = normalizeProject(project);
    this.composition = normalized.composition;
    this.scene = normalized.scene;
    this.timeline = new TimelineEngine(this.composition, this.scene);
    this.adapter = options.adapter;
    this.scheduler = new MotionScheduler(this.timeline, {
      adapter: options.adapter,
      clock: options.clock,
    });
  }

  async initialize(): Promise<void> {
    if (!this.adapter || this.initialized) {
      return;
    }

    await this.adapter.initialize({
      composition: this.composition,
      scene: this.scene.snapshot(),
    });
    this.initialized = true;
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

  async render(time: number) {
    if (!this.adapter) {
      throw new Error('RuntimeHost.render requires an EngineAdapter');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const frame = this.timeline.evaluate(time);
    const plan = createRenderPlan(frame);
    if (this.adapter.renderCommands) {
      const routingPlan = createAdapterRoutingPlan(plan);
      await this.adapter.renderCommands(createDrawCommandStream(routingPlan, {
        backgroundColor: this.composition.backgroundColor,
        size: this.composition.resolution,
      }), frame);
    } else if (this.adapter.renderPlan) {
      await this.adapter.renderPlan(plan, frame);
    } else {
      await this.adapter.render(frame);
    }
    return frame;
  }

  async dispose(): Promise<void> {
    await this.adapter?.dispose();
    this.initialized = false;
  }
}
