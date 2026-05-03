import { createAdapterRoutingPlan, type AdapterRoutingOptions, type AdapterRoutingPlan } from './adapters/AdapterRouter';
import { createDependencyPlan, getDependenciesForRange, type DependencyPlanOptions } from './dependencies/DependencyPlan';
import { createDrawCommandStream, type DrawCommandStream } from './draw-commands/DrawCommand';
import { normalizeProject } from './normalize/normalizeProject';
import { createRenderPlan, type RenderPlan } from './render-plan/RenderPlan';
import { MotionScheduler } from './scheduler/MotionScheduler';
import { TimelineEngine } from './timeline/TimelineEngine';
import type { EngineAdapter, RuntimeClock, RuntimeFrame } from './types';

export interface MultiAdapterHostOptions {
  adapters: Record<string, EngineAdapter>;
  fallbackAdapterId?: string;
  routing?: AdapterRoutingOptions;
  clock?: RuntimeClock;
}

export interface MultiAdapterRenderResult {
  frame: RuntimeFrame;
  renderPlan: RenderPlan;
  routingPlan: AdapterRoutingPlan;
  drawCommands: DrawCommandStream;
  dispatchedAdapters: string[];
  missingAdapters: string[];
}

export class MultiAdapterHost {
  readonly composition;
  readonly scene;
  readonly timeline: TimelineEngine;
  readonly scheduler: MotionScheduler;

  private readonly adapters: Map<string, EngineAdapter>;
  private readonly fallbackAdapterId?: string;
  private readonly routing?: AdapterRoutingOptions;
  private initialized = false;

  constructor(project: Parameters<typeof normalizeProject>[0], options: MultiAdapterHostOptions) {
    const normalized = normalizeProject(project);
    this.composition = normalized.composition;
    this.scene = normalized.scene;
    this.timeline = new TimelineEngine(this.composition, this.scene);
    this.adapters = new Map(Object.entries(options.adapters));
    this.fallbackAdapterId = options.fallbackAdapterId;
    this.routing = options.routing;
    this.scheduler = new MotionScheduler(this.timeline, {
      adapter: this.fallbackAdapterId ? this.adapters.get(this.fallbackAdapterId) : undefined,
      clock: options.clock,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.initialize({
      composition: this.composition,
      scene: this.scene.snapshot(),
    })));
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

  getRoutingPlan(time: number): AdapterRoutingPlan {
    return createAdapterRoutingPlan(createRenderPlan(this.evaluate(time)), this.routing);
  }

  async render(time: number): Promise<MultiAdapterRenderResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const frame = this.timeline.evaluate(time);
    const renderPlan = createRenderPlan(frame);
    const routingPlan = createAdapterRoutingPlan(renderPlan, this.routing);
    const drawCommands = createDrawCommandStream(routingPlan, {
      backgroundColor: this.composition.backgroundColor,
      size: this.composition.resolution,
    });
    const dispatchedAdapters: string[] = [];
    const missingAdapters: string[] = [];

    const dispatchGroups = new Map<string, typeof routingPlan.items>();
    const routeDependencies = new Map<string, string[]>();

    for (const item of routingPlan.items) {
      const requestedAdapterId = item.route.adapterId;
      const resolvedAdapterId = this.adapters.has(requestedAdapterId)
        ? requestedAdapterId
        : this.resolveFallbackAdapterId(requestedAdapterId, missingAdapters);

      if (!resolvedAdapterId) {
        continue;
      }

      dispatchGroups.set(resolvedAdapterId, [...(dispatchGroups.get(resolvedAdapterId) ?? []), item]);
      routeDependencies.set(resolvedAdapterId, uniqueSorted([
        ...(routeDependencies.get(resolvedAdapterId) ?? []),
        ...item.dependencies,
      ]));
    }

    for (const [adapterId, items] of dispatchGroups.entries()) {
      const adapter = this.adapters.get(adapterId);
      if (!adapter) {
        continue;
      }

      const routePlan = {
        ...renderPlan,
        dependencies: routeDependencies.get(adapterId) ?? [],
        itemCount: items.length,
        items,
      };

      if (routePlan.items.length === 0) {
        continue;
      }

      if (adapter.renderCommands) {
        const routeCommandStream = createDrawCommandStream({
          ...routingPlan,
          dependencies: routePlan.dependencies,
          itemCount: routePlan.itemCount,
          items,
          routes: routingPlan.routes.filter(route => route.adapterId === adapterId),
        }, {
          backgroundColor: this.composition.backgroundColor,
          size: this.composition.resolution,
        });
        await adapter.renderCommands(routeCommandStream, frame);
      } else if (adapter.renderPlan) {
        await adapter.renderPlan(routePlan, frame);
      } else {
        await adapter.render(frame);
      }
      dispatchedAdapters.push(adapter.id);
    }

    return {
      frame,
      renderPlan,
      routingPlan,
      drawCommands,
      dispatchedAdapters: Array.from(new Set(dispatchedAdapters)).sort(),
      missingAdapters: Array.from(new Set(missingAdapters)).sort(),
    };
  }

  async resizeAll(): Promise<void> {
    await Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.resize?.(this.composition.resolution)));
  }

  async dispose(): Promise<void> {
    await Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.dispose()));
    this.initialized = false;
  }

  private resolveFallbackAdapterId(requestedAdapterId: string, missingAdapters: string[]): string | undefined {
    missingAdapters.push(requestedAdapterId);
    return this.fallbackAdapterId && this.adapters.has(this.fallbackAdapterId)
      ? this.fallbackAdapterId
      : undefined;
  }
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(value => value.trim().length > 0))).sort();
}
