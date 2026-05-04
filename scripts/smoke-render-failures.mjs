import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = await mkdtemp(join(tmpdir(), 'ui2v-render-failure-'));
const input = join(tempDir, 'broken-custom-code.json');
const output = join(tempDir, 'broken-custom-code.mp4');

const project = {
  id: 'broken-custom-code-smoke',
  mode: 'template',
  duration: 0.2,
  fps: 2,
  resolution: { width: 320, height: 180 },
  template: {
    layers: [
      {
        id: 'bad-layer',
        type: 'custom-code',
        startTime: 0,
        endTime: 0.2,
        properties: {
          code: 'function createRenderer() { return { render() { throw new Error("intentional render failure"); } }; }',
        },
      },
    ],
  },
};

try {
  await writeFile(input, JSON.stringify(project, null, 2));
  const result = await runCli(['packages/cli/dist/cli.js', 'render', input, '-o', output, '--quality', 'low', '--no-progress']);
  if (result.code === 0) {
    throw new Error('Broken custom-code render unexpectedly succeeded');
  }
  const combined = `${result.stdout}\n${result.stderr}`;
  assertIncludes(combined, 'Render failed');
  assertIncludes(combined, 'intentional render failure');
  assertNotIncludes(combined, 'Protocol error (Runtime.callFunctionOn)');
  await assertMissing(output);
  console.log('Render failure smoke passed: custom-code render errors are surfaced');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function runCli(args) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectProcess);
    child.on('close', code => resolveProcess({ code, stdout, stderr }));
  });
}

function assertIncludes(value, needle) {
  if (!value.includes(needle)) {
    throw new Error(`Expected output to include ${JSON.stringify(needle)}.\nOutput:\n${value}`);
  }
}

function assertNotIncludes(value, needle) {
  if (value.includes(needle)) {
    throw new Error(`Expected output not to include ${JSON.stringify(needle)}.\nOutput:\n${value}`);
  }
}

async function assertMissing(file) {
  try {
    await access(file);
  } catch {
    return;
  }
  throw new Error(`Expected failed render not to leave output file: ${file}`);
}
