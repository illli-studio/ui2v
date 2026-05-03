import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const tmpDir = resolve(root, '.tmp');
const bomFixture = resolve(tmpDir, 'bom-basic-text.json');

mkdirSync(tmpDir, { recursive: true });
writeFileSync(
  bomFixture,
  `\ufeff${readFileSync(resolve(root, 'examples/basic-text/animation.json'), 'utf8')}`,
  'utf8'
);

const cases = [
  resolve(root, 'examples/basic-text/animation.json'),
  resolve(root, 'examples/runtime-core/animation.json'),
  bomFixture,
];

for (const input of cases) {
  const result = spawnSync(process.execPath, [cli, 'validate', input, '--json', '--verbose'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Validate failed for ${input}\n${result.stdout}${result.stderr}`);
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Validate did not emit clean JSON for ${input}\n${result.stdout}${result.stderr}`);
  }

  if (!payload.valid || payload.errorCount !== 0) {
    throw new Error(`Validate reported errors for ${input}\n${result.stdout}`);
  }
}

rmSync(bomFixture, { force: true });

console.log(`Validate smoke passed: ${cases.length} projects`);
