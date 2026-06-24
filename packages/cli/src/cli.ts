#!/usr/bin/env node

import { Command } from 'commander';
import { renderCommand } from './commands/render';
import { previewCommand } from './commands/preview';
import { validateCommand } from './commands/validate';
import { initCommand } from './commands/init';
import { doctorCommand } from './commands/doctor';
import { infoCommand } from './commands/info';
import { inspectRuntimeCommand } from './commands/inspect-runtime';
import { listBeatsCommand } from './commands/list-beats';
import { insertBeatCommand } from './commands/insert-beat';
import { lintTimelineCommand } from './commands/lint-timeline';
import { getCliVersion } from './version';

const program = new Command();

program
  .name('ui2v')
  .description('CLI for creating, previewing, and rendering ui2v video compositions')
  .version(getCliVersion());

program
  .command('init')
  .description('Initialize a polished ui2v starter video project')
  .argument('[name]', 'Project name', 'my-video')
  .option('-t, --template <template>', 'Template to use (launch; basic is an alias)', 'launch')
  .action(initCommand);

program
  .command('render')
  .description('Render a composition to video')
  .argument('<input>', 'Input project file (JSON)')
  .option('-o, --output <path>', 'Output file path', 'output.mp4')
  .option('-f, --format <format>', 'Output format (mp4)', 'mp4')
  .option('-q, --quality <quality>', 'Quality (low, medium, high, ultra, cinema)', 'high')
  .option('--fps <fps>', 'Override the project frame rate')
  .option('--width <width>', 'Output width')
  .option('--height <height>', 'Output height')
  .option('--render-scale <scale>', 'Supersample render scale before encoding', '1')
  .option('--codec <codec>', 'Video codec (avc, hevc)')
  .option('--bitrate <bitrate>', 'Target video bitrate in bits per second')
  .option('--timeout <seconds>', 'Render timeout in seconds')
  .option('--no-headless', 'Show the browser window while rendering')
  .option('--no-progress', 'Disable progress output')
  .action(renderCommand);

program
  .command('preview')
  .description('Preview a composition in a browser without exporting video')
  .argument('<input>', 'Input project file (JSON)')
  .option('--fps <fps>', 'Preview frame rate')
  .option('--width <width>', 'Preview width')
  .option('--height <height>', 'Preview height')
  .option('--pixel-ratio <ratio>', 'Preview canvas pixel ratio', '2')
  .option('--timeout <seconds>', 'Preview startup timeout in seconds')
  .action(previewCommand);

program
  .command('validate')
  .description('Validate a project file')
  .argument('<input>', 'Input project file (JSON)')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Show warnings')
  .action(validateCommand);

program
  .command('inspect-runtime')
  .description('Inspect the normalized Runtime Core scene graph and sampled frames')
  .argument('<input>', 'Input project file (JSON)')
  .option('--json', 'Output as JSON')
  .option('--full', 'Include full frame plans in JSON output')
  .option('--include-frame-plan', 'Include full frame plans in JSON output')
  .option('--time <seconds>', 'Sample time in seconds (can be repeated)', collectValues, [])
  .option('--look-ahead <seconds>', 'Extend dependency windows for preload planning', '0')
  .action(inspectRuntimeCommand);

program
  .command('list-beats')
  .description('List maintained beat templates available to Studio and insert-beat')
  .option('--schema <schema>', 'Filter by project schema (template or uiv-runtime)')
  .option('--workspace <path>', 'Workspace root used to resolve library-timeline templates')
  .option('--json', 'Output as JSON')
  .action(listBeatsCommand);

program
  .command('insert-beat')
  .description('Insert a maintained beat template into a project JSON file')
  .argument('<input>', 'Input project file (JSON)')
  .argument('[templateId]', 'Beat template id from list-beats')
  .option('--time <seconds>', 'Insert start time in seconds')
  .option('--duration <seconds>', 'Override default beat duration')
  .option('--list', 'List templates compatible with the input project')
  .option('--json', 'Output as JSON')
  .action(insertBeatCommand);

program
  .command('lint-timeline')
  .description('Lint timeline structure, clip timing, dependencies, and segment coverage')
  .argument('<input>', 'Input project file (JSON)')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Include full track model in JSON output')
  .action(lintTimelineCommand);

program
  .command('doctor')
  .description('Check environment and dependencies')
  .action(doctorCommand);

program
  .command('info')
  .description('Show version and environment info')
  .action(infoCommand);

program.parse();

function collectValues(value: string, previous: string[]): string[] {
  return [...previous, value];
}
