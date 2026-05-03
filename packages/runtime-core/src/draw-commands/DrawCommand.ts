import type { AdapterRoute, AdapterRoutingPlan, RoutedRenderPlanItem } from '../adapters/AdapterRouter';
import type { RuntimeMatrix2D, RuntimeResolution } from '../types';

export type DrawCommand =
  | ClearCommand
  | SaveCommand
  | RestoreCommand
  | SetTransformCommand
  | SetOpacityCommand
  | DrawLayerCommand
  | CustomCommand;

export interface DrawCommandStream {
  time: number;
  frame: number;
  fps: number;
  size?: RuntimeResolution;
  commandCount: number;
  dependencies: string[];
  commands: DrawCommand[];
}

export interface ClearCommand {
  op: 'clear';
  color?: string;
}

export interface SaveCommand {
  op: 'save';
}

export interface RestoreCommand {
  op: 'restore';
}

export interface SetTransformCommand {
  op: 'setTransform';
  matrix: RuntimeMatrix2D;
}

export interface SetOpacityCommand {
  op: 'setOpacity';
  opacity: number;
}

export interface DrawLayerCommand {
  op: 'drawLayer';
  nodeId: string;
  type: string;
  zIndex: number;
  localTime: number;
  properties: Record<string, unknown>;
  dependencies: string[];
  route?: AdapterRoute;
  source?: unknown;
}

export interface CustomCommand {
  op: 'custom';
  name: string;
  payload?: unknown;
}

export interface DrawCommandOptions {
  backgroundColor?: string;
  includeSaveRestore?: boolean;
  size?: RuntimeResolution;
}

export function createDrawCommandStream(
  routingPlan: AdapterRoutingPlan,
  options: DrawCommandOptions = {}
): DrawCommandStream {
  const commands: DrawCommand[] = [];

  commands.push({ op: 'clear', color: options.backgroundColor });

  for (const item of routingPlan.items) {
    commands.push(...itemToCommands(item, options));
  }

  return {
    time: routingPlan.time,
    frame: routingPlan.frame,
    fps: routingPlan.fps,
    size: options.size,
    dependencies: routingPlan.dependencies,
    commandCount: commands.length,
    commands,
  };
}

export function createDrawCommandsForItem(
  item: RoutedRenderPlanItem,
  options: Pick<DrawCommandOptions, 'includeSaveRestore'> = {}
): DrawCommand[] {
  return itemToCommands(item, options);
}

function itemToCommands(
  item: RoutedRenderPlanItem,
  options: Pick<DrawCommandOptions, 'includeSaveRestore'>
): DrawCommand[] {
  const commands: DrawCommand[] = [];
  const includeSaveRestore = options.includeSaveRestore ?? true;

  if (includeSaveRestore) {
    commands.push({ op: 'save' });
  }

  commands.push(
    { op: 'setTransform', matrix: item.worldMatrix },
    { op: 'setOpacity', opacity: item.opacity },
    {
      op: 'drawLayer',
      nodeId: item.nodeId,
      type: item.type,
      zIndex: item.zIndex,
      localTime: item.localTime,
      properties: item.properties,
      dependencies: item.dependencies,
      route: item.route,
      source: item.source,
    }
  );

  if (includeSaveRestore) {
    commands.push({ op: 'restore' });
  }

  return commands;
}
