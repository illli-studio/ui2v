import { existsSync, statSync, rmSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const input = resolve(root, 'examples/basic-text/animation.json');
const output = resolve(root, 'out/smoke/basic-text.mp4');
const minBytes = 1024;

await mkdir(dirname(output), { recursive: true });
if (existsSync(output)) {
  rmSync(output, { force: true });
}

await run(process.execPath, [cli, 'validate', input, '--verbose']);
await run(process.execPath, [
  cli,
  'render',
  input,
  '-o',
  output,
  '--timeout',
  '180',
]);

if (!existsSync(output)) {
  throw new Error(`Render did not create output file: ${output}`);
}

const size = statSync(output).size;
if (size < minBytes) {
  throw new Error(`Render output is too small: ${size} bytes`);
}

console.log(`Smoke render passed: ${output} (${formatBytes(size)})`);

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
