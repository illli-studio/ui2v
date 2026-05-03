import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const packages = [
  { dir: 'packages/core', maxFiles: 8 },
  { dir: 'packages/runtime-core', maxFiles: 8 },
  { dir: 'packages/engine', maxFiles: 8 },
  { dir: 'packages/producer', maxFiles: 8 },
  { dir: 'packages/cli', maxFiles: 14 },
];

const requiredFiles = [
  'package.json',
  'README.md',
  'dist/index.js',
  'dist/index.mjs',
  'dist/index.d.ts',
  'dist/index.d.mts',
];

const forbiddenPathParts = [
  'src/',
  'test/',
  'tests/',
  '__tests__/',
  'node_modules/',
  'examples/',
  'scripts/',
  'out/',
  'tmp/',
  '.tsbuildinfo',
];

const failures = [];

for (const pkg of packages) {
  validatePackagePack(pkg);
}

if (failures.length > 0) {
  throw new Error(`Package pack validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
}

console.log(`Package pack validation passed: ${packages.length} packages`);

function validatePackagePack(pkg) {
  const dir = resolve(pkg.dir);
  const packageJson = resolve(dir, 'package.json');
  if (!existsSync(packageJson)) {
    failures.push(`${pkg.dir}: missing package.json`);
    return;
  }

  const result = spawnSync('bun', ['pm', 'pack', '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) {
    failures.push(`${pkg.dir}: bun pack failed\n${indent(output.trim())}`);
    return;
  }

  const packedFiles = parsePackedFiles(output);
  if (packedFiles.length === 0) {
    failures.push(`${pkg.dir}: no packed files detected`);
    return;
  }

  for (const file of requiredFiles) {
    if (!packedFiles.includes(file)) {
      failures.push(`${pkg.dir}: pack output missing ${file}`);
    }
  }

  if (pkg.dir === 'packages/cli' && !packedFiles.includes('dist/cli.js')) {
    failures.push(`${pkg.dir}: pack output missing CLI binary dist/cli.js`);
  }

  if (packedFiles.length > pkg.maxFiles) {
    failures.push(`${pkg.dir}: expected at most ${pkg.maxFiles} packed files, got ${packedFiles.length}`);
  }

  for (const file of packedFiles) {
    const normalized = file.replace(/\\/g, '/');
    for (const forbidden of forbiddenPathParts) {
      if (normalized.includes(forbidden)) {
        failures.push(`${pkg.dir}: pack output includes forbidden path ${file}`);
      }
    }
  }
}

function parsePackedFiles(output) {
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('packed '))
    .map(line => {
      const parts = line.split(/\s+/);
      return parts.slice(2).join(' ');
    })
    .filter(Boolean);
}

function indent(text) {
  return text
    .split(/\r?\n/)
    .map(line => `  ${line}`)
    .join('\n');
}
