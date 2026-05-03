import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const runtimeExample = resolve(root, 'examples/runtime-core/animation.json');
const legacyExample = resolve(root, 'examples/basic-text/animation.json');

const jsonResult = run(['inspect-runtime', runtimeExample, '--json', '--time', '0', '--time', '1']);
const payload = JSON.parse(jsonResult.stdout);

if (!payload.valid || payload.inspection.id !== 'runtime-core-demo') {
  throw new Error(`Unexpected inspect-runtime JSON payload\n${jsonResult.stdout}`);
}

if (payload.inspection.frames.length !== 2) {
  throw new Error(`Expected two sampled frames\n${jsonResult.stdout}`);
}

if (Array.isArray(payload.inspection.segmentFramePlan.frames)) {
  throw new Error(`Expected default JSON output to omit full segment frame plan\n${jsonResult.stdout}`);
}

if (!payload.hints?.some(item => item.includes('--full'))) {
  throw new Error(`Expected JSON output to explain how to include the full frame plan\n${jsonResult.stdout}`);
}

if (!Array.isArray(payload.routingFrames) || payload.routingFrames.length !== 2) {
  throw new Error(`Expected routing frame summaries\n${jsonResult.stdout}`);
}

const fullJsonResult = run(['inspect-runtime', runtimeExample, '--json', '--full', '--time', '0']);
const fullPayload = JSON.parse(fullJsonResult.stdout);
if (!Array.isArray(fullPayload.inspection.segmentFramePlan.frames) || fullPayload.inspection.segmentFramePlan.frames.length === 0) {
  throw new Error(`Expected --full JSON output to include segment frame plan frames\n${fullJsonResult.stdout}`);
}

const textResult = run(['inspect-runtime', legacyExample, '--time', '0']);
if (!textResult.stdout.includes('ui2v Video Segments')) {
  throw new Error(`Text output did not use ui2v segment naming\n${textResult.stdout}`);
}

console.log('Runtime inspection smoke passed');

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`ui2v ${args.join(' ')} failed\n${result.stdout}${result.stderr}`);
  }

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
