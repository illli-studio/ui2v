import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const templateInput = resolve(root, 'examples/library-timeline/animation.json');
const runtimeInput = resolve(root, 'examples/runtime-storyboard/animation.json');

const templateResult = runCli(['lint-timeline', templateInput, '--json']);
const templatePayload = JSON.parse(templateResult.stdout);
assert(templatePayload.schema === 'template', 'template lint should detect schema');
assert(Array.isArray(templatePayload.lint), 'template lint should return lint items');
assert(templatePayload.errorCount === 0, 'library-timeline should have no timeline errors');

const runtimeResult = runCli(['lint-timeline', runtimeInput, '--json']);
const runtimePayload = JSON.parse(runtimeResult.stdout);
assert(runtimePayload.schema === 'uiv-runtime', 'runtime lint should detect schema');
assert(runtimePayload.clipCount >= 3, 'runtime lint should expose segment clips');
assert(runtimePayload.errorCount === 0, 'runtime-storyboard should have no timeline errors');

console.log('Lint timeline smoke passed');

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`ui2v ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
