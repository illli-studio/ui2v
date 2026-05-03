import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseProject, validateProjectStructure } from '../packages/core/dist/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const tempRoot = mkdtempSync(resolve(tmpdir(), 'ui2v-init-'));
const projectName = 'hello-ui2v';
const projectDir = resolve(tempRoot, projectName);
const input = resolve(projectDir, 'animation.json');
const readmePath = resolve(projectDir, 'README.md');
const output = resolve(projectDir, 'output.mp4');
const minBytes = 1024;

try {
  await run(process.execPath, [cli, 'init', projectName], tempRoot);

  if (!existsSync(input)) {
    throw new Error(`Init did not create animation.json: ${input}`);
  }

  if (!existsSync(readmePath)) {
    throw new Error(`Init did not create README.md: ${readmePath}`);
  }

  const readme = await readFile(readmePath, 'utf8');
  for (const expected of ['--pixel-ratio', '--render-scale']) {
    if (!readme.includes(expected)) {
      throw new Error(`Generated README.md is missing ${expected}`);
    }
  }

  const project = parseProject(await readFile(input, 'utf8'));
  const validation = validateProjectStructure(project);
  if (!validation.valid) {
    throw new Error(`Generated project is invalid: ${validation.errors.map(issue => issue.message).join('; ')}`);
  }

  await mkdir(dirname(output), { recursive: true });
  await run(process.execPath, [
    cli,
    'render',
    input,
    '-o',
    output,
    '--timeout',
    '180',
  ], root);

  if (!existsSync(output)) {
    throw new Error(`Generated project did not render output: ${output}`);
  }

  const size = statSync(output).size;
  if (size < minBytes) {
    throw new Error(`Generated project render is too small: ${size} bytes`);
  }

  console.log(`Init smoke passed: ${input} rendered to ${formatBytes(size)}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
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
