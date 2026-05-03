import type { RenderPlan, RenderPlanItem } from '../render-plan/RenderPlan';

export interface AdapterRoute {
  adapterId: string;
  renderer: string;
  reason: string;
}

export interface RoutedRenderPlanItem extends RenderPlanItem {
  route: AdapterRoute;
}

export interface AdapterRoutingPlan extends Omit<RenderPlan, 'items'> {
  items: RoutedRenderPlanItem[];
  routes: AdapterRouteGroup[];
}

export interface AdapterRouteGroup {
  adapterId: string;
  renderer: string;
  itemCount: number;
  dependencies: string[];
  nodeIds: string[];
}

export interface AdapterRoutingOptions {
  defaultAdapterId?: string;
  defaultRenderer?: string;
  rules?: AdapterRoutingRule[];
}

export interface AdapterRoutingRule {
  adapterId: string;
  renderer: string;
  reason?: string;
  nodeTypes?: string[];
  dependencies?: string[];
  property?: string;
}

const DEFAULT_ADAPTER_ID = 'ui2v.template-canvas';
const DEFAULT_RENDERER = 'canvas2d-template';

const DEFAULT_RULES: AdapterRoutingRule[] = [
  {
    adapterId: 'ui2v.three',
    renderer: 'three',
    dependencies: ['three', 'threejs', 'three.js', 'THREE'],
    reason: 'three dependency',
  },
  {
    adapterId: 'ui2v.pixi',
    renderer: 'pixi',
    dependencies: ['pixi', 'pixijs', 'pixi.js', 'PIXI'],
    reason: 'pixi dependency',
  },
  {
    adapterId: 'ui2v.lottie',
    renderer: 'lottie',
    dependencies: ['lottie', 'lottie-web'],
    nodeTypes: ['lottie', 'lottie-layer'],
    reason: 'lottie node or dependency',
  },
  {
    adapterId: 'ui2v.template-canvas',
    renderer: 'canvas2d-template',
    nodeTypes: ['custom-code', 'poster-static', 'image-layer', 'static-text', 'static-image', 'static-shape', 'static-gradient'],
    reason: 'canvas-compatible node',
  },
];

export function createAdapterRoutingPlan(
  plan: RenderPlan,
  options: AdapterRoutingOptions = {}
): AdapterRoutingPlan {
  const rules = options.rules ?? DEFAULT_RULES;
  const defaultRoute: AdapterRoute = {
    adapterId: options.defaultAdapterId ?? DEFAULT_ADAPTER_ID,
    renderer: options.defaultRenderer ?? DEFAULT_RENDERER,
    reason: 'default route',
  };
  const items = plan.items.map(item => ({
    ...item,
    route: resolveRoute(item, rules, defaultRoute),
  }));

  return {
    ...plan,
    items,
    routes: groupRoutes(items),
  };
}

export function resolveAdapterRoute(
  item: RenderPlanItem,
  options: AdapterRoutingOptions = {}
): AdapterRoute {
  return resolveRoute(item, options.rules ?? DEFAULT_RULES, {
    adapterId: options.defaultAdapterId ?? DEFAULT_ADAPTER_ID,
    renderer: options.defaultRenderer ?? DEFAULT_RENDERER,
    reason: 'default route',
  });
}

function resolveRoute(
  item: RenderPlanItem,
  rules: AdapterRoutingRule[],
  defaultRoute: AdapterRoute
): AdapterRoute {
  const requestedAdapter = readString(item.properties.__runtimeAdapter ?? item.properties.adapter);
  const requestedRenderer = readString(item.properties.__runtimeRenderer ?? item.properties.renderer);

  if (requestedAdapter || requestedRenderer) {
    return {
      adapterId: requestedAdapter ?? defaultRoute.adapterId,
      renderer: requestedRenderer ?? requestedAdapter ?? defaultRoute.renderer,
      reason: 'explicit node route',
    };
  }

  const normalizedDependencies = item.dependencies.map(normalizeToken);
  for (const rule of rules) {
    if (matchesRule(item, normalizedDependencies, rule)) {
      return {
        adapterId: rule.adapterId,
        renderer: rule.renderer,
        reason: rule.reason ?? 'routing rule',
      };
    }
  }

  return defaultRoute;
}

function matchesRule(item: RenderPlanItem, normalizedDependencies: string[], rule: AdapterRoutingRule): boolean {
  const typeMatches = rule.nodeTypes?.some(type => normalizeToken(type) === normalizeToken(item.type)) ?? false;
  const dependencyMatches = rule.dependencies?.some(dependency => normalizedDependencies.includes(normalizeToken(dependency))) ?? false;
  const propertyMatches = rule.property ? item.properties[rule.property] !== undefined : false;

  return typeMatches || dependencyMatches || propertyMatches;
}

function groupRoutes(items: RoutedRenderPlanItem[]): AdapterRouteGroup[] {
  const groups = new Map<string, AdapterRouteGroup>();

  for (const item of items) {
    const key = `${item.route.adapterId}:${item.route.renderer}`;
    const current = groups.get(key) ?? {
      adapterId: item.route.adapterId,
      renderer: item.route.renderer,
      itemCount: 0,
      dependencies: [],
      nodeIds: [],
    };
    current.itemCount += 1;
    current.nodeIds.push(item.nodeId);
    current.dependencies = uniqueSorted([...current.dependencies, ...item.dependencies]);
    groups.set(key, current);
  }

  return Array.from(groups.values()).map(group => ({
    ...group,
    nodeIds: group.nodeIds.sort(),
  }));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(value => value.trim().length > 0))).sort();
}
