import * as fs from 'fs-extra';
import chalk from 'chalk';
import { createAdapterRoutingPlan, createDependencyPlan, createDrawCommandStream, createRenderPlan, inspectRuntimeProject, inspectStaticCustomCode, normalizeProject, TimelineEngine, validateRuntimeProject } from '@ui2v/runtime-core';

interface InspectRuntimeOptions {
  json?: boolean;
  full?: boolean;
  includeFramePlan?: boolean;
  time?: string[];
  lookAhead?: string;
}

export async function inspectRuntimeCommand(
  input: string,
  options: InspectRuntimeOptions
): Promise<void> {
  try {
    if (!fs.existsSync(input)) {
      console.error(chalk.red(`Input file not found: ${input}`));
      process.exit(1);
    }

    const project = JSON.parse(await fs.readFile(input, 'utf-8'));
    const validation = validateRuntimeProject(project);
    if (!validation.valid) {
      if (options.json) {
        console.log(JSON.stringify({ valid: false, errors: validation.errors, warnings: validation.warnings }, null, 2));
      } else {
        console.error(chalk.red('Runtime project has validation errors'));
        for (const error of validation.errors) {
          console.error(chalk.red(`  [${error.code}] ${error.message}`));
          console.error(chalk.dim(`    at ${error.path}`));
        }
      }
      process.exit(1);
    }

    const sampleTimes = options.time?.map(value => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid --time value: ${value}`);
      }
      return parsed;
    });
    const inspection = inspectRuntimeProject(project, { sampleTimes });
    const normalized = normalizeProject(project);
    const lookAheadSeconds = parseLookAhead(options.lookAhead);
    const dependencyPlan = createDependencyPlan(
      normalized.composition,
      normalized.scene.snapshot(),
      { lookAheadSeconds }
    );
    const customCodeInspection = inspectStaticCustomCode(normalized.scene.snapshot());
    const timeline = new TimelineEngine(normalized.composition, normalized.scene);
    const routingFrames = inspection.frames.map(frame => {
      const runtimeFrame = timeline.evaluate(frame.time);
      const routingPlan = createAdapterRoutingPlan(createRenderPlan(runtimeFrame));
      const drawCommands = createDrawCommandStream(routingPlan, {
        backgroundColor: normalized.composition.backgroundColor,
        size: normalized.composition.resolution,
      });
      return {
        time: frame.time,
        frame: frame.frame,
        routes: routingPlan.routes,
        drawCommandCount: drawCommands.commandCount,
        drawOps: drawCommands.commands.map(command => command.op),
        items: routingPlan.items.map(item => ({
          nodeId: item.nodeId,
          type: item.type,
          route: item.route,
        })),
      };
    });

    if (options.json) {
      console.log(JSON.stringify(createJsonInspectionPayload({
        warnings: validation.warnings,
        inspection,
        dependencyPlan,
        customCodeInspection,
        routingFrames,
        includeFramePlan: Boolean(options.full || options.includeFramePlan),
      }), null, 2));
      return;
    }

    console.log(chalk.bold(`Runtime: ${inspection.id}`));
    if (inspection.name) {
      console.log(chalk.dim('Name:'), inspection.name);
    }
    console.log(chalk.dim('Duration:'), `${inspection.duration}s`);
    console.log(chalk.dim('FPS:'), inspection.fps);
    console.log(chalk.dim('Resolution:'), `${inspection.resolution.width}x${inspection.resolution.height}`);
    console.log(chalk.dim('Nodes:'), `${inspection.nodeCount} total, max depth ${inspection.maxDepth}`);
    console.log(chalk.dim('Segments:'), `${inspection.segmentPlan.segmentCount} total, coverage ${(inspection.segmentPlan.coverage * 100).toFixed(1)}%`);
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow(`Warnings: ${validation.warnings.length}`));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`  [${warning.code}] ${warning.message}`));
        console.log(chalk.dim(`    at ${warning.path}`));
      }
    }

    console.log(chalk.bold('\nui2v Video Segments'));
    for (const segment of inspection.segmentPlan.segments) {
      const frameRange = inspection.segmentFramePlan.ranges.find(range => range.segmentId === segment.id);
      const label = segment.label ? ` "${segment.label}"` : '';
      const deps = segment.dependencies.length > 0 ? segment.dependencies.join(',') : 'none';
      const authored = segment.authoredNodeIds.length > 0 ? segment.authoredNodeIds.join(',') : 'none';
      const nodes = segment.nodeIds.length > 0 ? segment.nodeIds.join(',') : 'none';
      const frames = frameRange && frameRange.frameCount > 0
        ? ` frames=${frameRange.startFrame}-${frameRange.endFrame} count=${frameRange.frameCount}`
        : ' frames=none';
      const flags = [
        segment.gapFromPrevious > 0 ? `gap=${segment.gapFromPrevious.toFixed(3)}s` : '',
        segment.overlapsPrevious ? 'overlap' : '',
      ].filter(Boolean);
      const flagText = flags.length > 0 ? ` ${chalk.yellow(flags.join(' '))}` : '';
      console.log(`  ${segment.id}${label}: ${segment.startTime.toFixed(3)}-${segment.endTime.toFixed(3)}s duration=${segment.duration.toFixed(3)}s${frames} deps=${deps} authored=${authored} nodes=${nodes}${flagText}`);
    }
    if (inspection.segmentFramePlan.unassignedFrames.length > 0) {
      const preview = inspection.segmentFramePlan.unassignedFrames.slice(0, 12).join(',');
      const more = inspection.segmentFramePlan.unassignedFrames.length > 12 ? ',...' : '';
      console.log(chalk.yellow(`  unassigned frames: ${preview}${more}`));
    }
    for (const gap of inspection.segmentPlan.gaps) {
      console.log(chalk.yellow(`  gap: ${gap.startTime.toFixed(3)}-${gap.endTime.toFixed(3)}s duration=${gap.duration.toFixed(3)}s`));
    }
    for (const overlap of inspection.segmentPlan.overlaps) {
      console.log(chalk.yellow(`  overlap: ${overlap.previousId} -> ${overlap.nextId} ${overlap.startTime.toFixed(3)}-${overlap.endTime.toFixed(3)}s duration=${overlap.duration.toFixed(3)}s`));
    }

    console.log(chalk.bold('\nScene Nodes'));
    for (const node of inspection.nodes) {
      const parent = node.parentId ? ` parent=${node.parentId}` : '';
      console.log(`  ${node.id} (${node.type}) z=${node.zIndex}${parent} children=${node.childCount} motion=${node.motionTrackCount}`);
    }

    console.log(chalk.bold('\nDependency Plan'));
    if (lookAheadSeconds > 0) {
      console.log(chalk.dim(`  lookAhead=${lookAheadSeconds}s`));
    }
    for (const window of dependencyPlan.windows) {
      const deps = window.dependencies.length > 0 ? window.dependencies.join(',') : 'none';
      const nodes = window.nodeIds.length > 0 ? window.nodeIds.join(',') : 'none';
      console.log(`  ${window.id}: ${window.startTime.toFixed(3)}-${window.endTime.toFixed(3)}s deps=${deps} nodes=${nodes}`);
    }

    if (customCodeInspection.total > 0) {
      console.log(chalk.bold('\nCustom Code'));
      console.log(chalk.dim(`  total=${customCodeInspection.total} warnings=${customCodeInspection.withWarnings} errors=${customCodeInspection.withErrors}`));
      for (const item of customCodeInspection.items) {
        const segment = item.segmentId ? ` segment=${item.segmentId}` : '';
        const deps = item.dependencies.length > 0 ? item.dependencies.join(',') : 'none';
        const changed = item.sanitizedChanged ? ' sanitized=yes' : ' sanitized=no';
        const status = item.diagnostics.some(diagnostic => diagnostic.level === 'error')
          ? chalk.red('error')
          : item.diagnostics.some(diagnostic => diagnostic.level === 'warning')
            ? chalk.yellow('warning')
            : chalk.green('ok');
        console.log(`  ${item.nodeId}:${segment} entry=${item.entrypoint}${changed} deps=${deps} status=${status}`);
        if (item.codePreview) {
          console.log(chalk.dim(`    code: ${item.codePreview}`));
        }
        for (const diagnostic of item.diagnostics) {
          const color = diagnostic.level === 'error'
            ? chalk.red
            : diagnostic.level === 'warning'
              ? chalk.yellow
              : chalk.dim;
          console.log(color(`    [${diagnostic.code}] ${diagnostic.message}`));
        }
      }
    }

    console.log(chalk.bold('\nSample Frames'));
    for (const frame of inspection.frames) {
      const runtimeFrame = timeline.evaluate(frame.time);
      const routingPlan = createAdapterRoutingPlan(createRenderPlan(runtimeFrame));
      const drawCommands = createDrawCommandStream(routingPlan, {
        backgroundColor: normalized.composition.backgroundColor,
        size: normalized.composition.resolution,
      });
      const segment = frame.activeSegmentId ? ` segment=${frame.activeSegmentId}` : '';
      const deps = frame.dependencies.length > 0 ? ` deps=${frame.dependencies.join(',')}` : '';
      const markers = frame.markerIds.length > 0 ? ` markers=${frame.markerIds.join(',')}` : '';
      console.log(`  t=${frame.time.toFixed(3)}s frame=${frame.frame} visible=${frame.visibleNodeCount} plan=${frame.renderPlanItemCount} commands=${drawCommands.commandCount}${segment}${deps}${markers}`);
      for (const route of routingPlan.routes) {
        console.log(`    route ${route.renderer}: adapter=${route.adapterId} items=${route.itemCount} nodes=${route.nodeIds.join(',')}`);
      }
      console.log(`    draw ops: ${summarizeOps(drawCommands.commands.map(command => command.op))}`);
      for (const node of frame.nodes) {
        const m = node.worldMatrix;
        console.log(`    ${node.id}: local=${node.localTime.toFixed(3)} opacity=${node.opacity.toFixed(3)} matrix=[${formatMatrix(m)}]`);
      }
    }
  } catch (error) {
    console.error(chalk.red('Runtime inspection failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

function createJsonInspectionPayload({
  warnings,
  inspection,
  dependencyPlan,
  customCodeInspection,
  routingFrames,
  includeFramePlan,
}: {
  warnings: ReturnType<typeof validateRuntimeProject>['warnings'];
  inspection: ReturnType<typeof inspectRuntimeProject>;
  dependencyPlan: ReturnType<typeof createDependencyPlan>;
  customCodeInspection: ReturnType<typeof inspectStaticCustomCode>;
  routingFrames: Array<{
    time: number;
    frame: number;
    routes: unknown;
    drawCommandCount: number;
    drawOps: string[];
    items: unknown;
  }>;
  includeFramePlan: boolean;
}) {
  const segmentFramePlan = includeFramePlan
    ? inspection.segmentFramePlan
    : {
        ranges: inspection.segmentFramePlan.ranges,
        totalFrames: inspection.segmentFramePlan.totalFrames,
        unassignedFrameCount: inspection.segmentFramePlan.unassignedFrames.length,
      };

  return {
    valid: true,
    warnings,
    inspection: {
      ...inspection,
      segmentFramePlan,
    },
    dependencyPlan,
    customCodeInspection,
    routingFrames,
    omitted: includeFramePlan
      ? []
      : ['inspection.segmentFramePlan.frames', 'inspection.segmentFramePlan.unassignedFrames'],
    hints: includeFramePlan
      ? []
      : ['Use --full or --include-frame-plan to include every planned frame in JSON output.'],
  };
}

function parseLookAhead(value: string | undefined): number {
  if (value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --look-ahead value: ${value}`);
  }

  return parsed;
}

function summarizeOps(ops: string[]): string {
  const counts = new Map<string, number>();
  for (const op of ops) {
    counts.set(op, (counts.get(op) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([op, count]) => `${op}x${count}`)
    .join(', ');
}

function formatMatrix(matrix: { a: number; b: number; c: number; d: number; e: number; f: number }): string {
  return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
    .map(value => Number(value.toFixed(3)))
    .join(', ');
}
