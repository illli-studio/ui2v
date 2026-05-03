import { existsSync, rmSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const input = resolve(root, 'examples/runtime-core/animation.json');
const output = resolve(root, 'out/smoke/runtime-core.mp4');
const minBytes = 1024;

await mkdir(dirname(output), { recursive: true });
if (existsSync(output)) {
  rmSync(output, { force: true });
}

await run(process.execPath, [
  cli,
  'render',
  input,
  '-o',
  output,
  '--width',
  '640',
  '--height',
  '360',
  '--timeout',
  '180',
  '--no-progress',
]);

if (!existsSync(output)) {
  throw new Error(`Runtime render smoke did not create output file: ${output}`);
}

const size = statSync(output).size;
if (size < minBytes) {
  throw new Error(`Runtime render smoke output is too small: ${size} bytes`);
}

console.log(`Runtime render smoke passed: ${output} (${formatBytes(size)})`);

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', rejectRun);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(new Error(`${command} ${args.join(' ')} failed with ${signal ?? `code ${code}`}`));
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
