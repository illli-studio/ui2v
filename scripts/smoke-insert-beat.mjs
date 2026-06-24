import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const runtimeInput = resolve(root, 'examples/runtime-storyboard/animation.json');
const templateInput = resolve(root, '.tmp/insert-beat-template-project.json');
const runtimeCopy = resolve(root, '.tmp/insert-beat-runtime-project.json');

mkdirSync(dirname(templateInput), { recursive: true });
writeFileSync(templateInput, readFileSync(resolve(root, 'examples/library-timeline/animation.json'), 'utf8'));
writeFileSync(runtimeCopy, readFileSync(runtimeInput, 'utf8'));

try {
  const listJson = runCli(['list-beats', '--json']);
  const listPayload = JSON.parse(listJson.stdout);
  assert(Array.isArray(listPayload.templates) && listPayload.templates.length >= 6, 'list-beats should expose library and runtime templates');

  const compatibleList = runCli(['insert-beat', runtimeCopy, '--list', '--json']);
  const compatiblePayload = JSON.parse(compatibleList.stdout);
  assert(
    compatiblePayload.templates.every(item => item.compatibleSchemas.includes('uiv-runtime')),
    'insert-beat --list should filter by runtime project schema'
  );

  const insertRuntime = runCli([
    'insert-beat',
    runtimeCopy,
    'runtime-gsap-beat',
    '--time',
    '9.5',
    '--json',
  ]);
  const runtimeResult = JSON.parse(insertRuntime.stdout);
  assert(runtimeResult.success && runtimeResult.insertedId, 'runtime insert-beat should succeed');

  const insertTemplate = runCli([
    'insert-beat',
    templateInput,
    'beat-three',
    '--time',
    '12',
    '--json',
  ]);
  const templateResult = JSON.parse(insertTemplate.stdout);
  assert(templateResult.success && templateResult.endTime === 14, 'template insert-beat should extend duration');

  const invalid = spawnSync(process.execPath, [cli, 'insert-beat', runtimeCopy, 'beat-gsap'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  assert(invalid.status !== 0, 'runtime project should reject template-only beat');
  assert(String(invalid.stderr + invalid.stdout).includes('not compatible'), 'invalid insert should explain schema mismatch');

  console.log('Insert beat smoke passed');
} finally {
  rmSync(templateInput, { force: true });
  rmSync(runtimeCopy, { force: true });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0 && !args.includes('--json')) {
    throw new Error(`ui2v ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
