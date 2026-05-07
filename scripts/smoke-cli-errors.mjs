import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const example = resolve(root, 'examples/basic-smoke/animation.json');

const cases = [
  {
    args: ['render', example, '--quality', 'maximum'],
    expected: 'Invalid quality: maximum',
  },
  {
    args: ['render', example, '--format', 'webm'],
    expected: 'Only mp4 output is currently supported',
  },
  {
    args: ['render', example, '--codec', 'vp9'],
    expected: 'Only avc and hevc codecs are currently supported',
  },
  {
    args: ['render', example, '--fps', '0'],
    expected: '--fps must be a positive integer',
  },
  {
    args: ['preview', example, '--pixel-ratio', '0'],
    expected: '--pixel-ratio must be a positive number',
  },

  {
    args: ['render', example, '--width', '999999'],
    expected: '--width must be less than or equal to 7680',
  },
  {
    args: ['render', example, '--render-scale', '99'],
    expected: '--render-scale must be less than or equal to 4',
  },
  {
    args: ['preview', example, '--fps', '999'],
    expected: '--fps must be less than or equal to 240',
  },
];

for (const testCase of cases) {
  const result = spawnSync(process.execPath, [cli, ...testCase.args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    throw new Error(`Expected failure for ui2v ${testCase.args.join(' ')}\n${output}`);
  }

  if (!output.includes(testCase.expected)) {
    throw new Error(
      `Expected "${testCase.expected}" for ui2v ${testCase.args.join(' ')}\n${output}`
    );
  }
}

console.log(`CLI error smoke passed: ${cases.length} invalid invocations`);
