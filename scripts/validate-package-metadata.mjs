import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirs = [
  'packages/cli',
  'packages/core',
  'packages/engine',
  'packages/producer',
  'packages/runtime-core',
];
const textFiles = [
  'CONTRIBUTING.md',
  'STATUS.md',
  'docs/ui2v-renderer-readme.md',
  'docs/runtime-core.md',
  'packages/cli/src/commands/info.ts',
  'packages/cli/src/commands/init.ts',
  'packages/cli/src/commands/project.ts',
  'packages/engine/src/export/WebCodecsExporter.ts',
  'packages/engine/src/export/ChunkedExportEngine.ts',
  'packages/engine/src/index.ts',
  'packages/engine/src/export/index.ts',
  'packages/producer/src/index.ts',
  'packages/producer/src/renderer.ts',
];
const placeholders = [
  'your-org',
  'TODO',
  'TBD',
  'Apache-2.0',
  'ui2v-renderer',
  'UI2V Renderer',
  'UI2V',
  'MP4ExporterRenderer',
  'exportAnimationWithCancel',
  'resolveProjectAssetTokens',
];
const blockedSourcePatterns = [
  {
    pattern: /console\.(log|debug)\(/,
    description: 'default console.log/debug output',
  },
];
const blockedSourceFiles = new Set([
  'packages/engine/src/export/WebCodecsExporter.ts',
  'packages/engine/src/export/ChunkedExportEngine.ts',
]);
const workspacePackageVersions = new Map();

const failures = [];

await validateRootPackage();
await validateTextFiles();

for (const packageDir of packageDirs) {
  const pkg = await readJson(resolve(root, packageDir, 'package.json'));
  workspacePackageVersions.set(pkg.name, pkg.version);
}

for (const packageDir of packageDirs) {
  await validateWorkspacePackage(packageDir);
}

if (failures.length > 0) {
  throw new Error(`Package metadata validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
}

console.log(`Package metadata validation passed: ${packageDirs.length} packages`);

async function validateRootPackage() {
  const packageJsonPath = resolve(root, 'package.json');
  const pkg = await readJson(packageJsonPath);

  requireField(pkg, 'name', 'package.json');
  requireField(pkg, 'version', 'package.json');
  requireField(pkg, 'license', 'package.json');

  if (pkg.license !== 'MIT') {
    failures.push(`package.json: expected MIT license, got ${pkg.license}`);
  }
}

async function validateWorkspacePackage(packageDir) {
  const label = packageDir.replace(/\\/g, '/');
  const packageJsonPath = resolve(root, packageDir, 'package.json');
  const readmePath = resolve(root, packageDir, 'README.md');

  if (!existsSync(packageJsonPath)) {
    failures.push(`${label}: missing package.json`);
    return;
  }

  const pkg = await readJson(packageJsonPath);
  requireField(pkg, 'name', `${label}/package.json`);
  requireField(pkg, 'version', `${label}/package.json`);
  requireField(pkg, 'description', `${label}/package.json`);
  requireField(pkg, 'license', `${label}/package.json`);
  requireField(pkg, 'repository', `${label}/package.json`);
  requireField(pkg, 'bugs', `${label}/package.json`);
  requireField(pkg, 'homepage', `${label}/package.json`);
  requireField(pkg, 'types', `${label}/package.json`);

  if (pkg.license !== 'MIT') {
    failures.push(`${label}/package.json: expected MIT license, got ${pkg.license}`);
  }

  if (!pkg.exports?.['.']) {
    failures.push(`${label}/package.json: missing exports["."]`);
  }

  if (pkg.name.startsWith('@') && pkg.publishConfig?.access !== 'public') {
    failures.push(`${label}/package.json: scoped npm packages must set publishConfig.access to public`);
  }

  validateDependencyVersions(pkg, label);

  if (!Array.isArray(pkg.files) || !pkg.files.includes('dist') || !pkg.files.includes('README.md')) {
    failures.push(`${label}/package.json: files must include dist and README.md`);
  } else {
    for (const file of pkg.files) {
      if (!existsSync(resolve(root, packageDir, file))) {
        failures.push(`${label}/package.json: files entry does not exist: ${file}`);
      }
    }
  }

  if (!existsSync(readmePath)) {
    failures.push(`${label}: missing README.md`);
  }

  const metadataText = JSON.stringify(pkg);
  checkPlaceholders(metadataText, `${label}/package.json`);

  if (existsSync(readmePath)) {
    const readme = await readFile(readmePath, 'utf8');
    checkPlaceholders(readme, `${label}/README.md`);
  }

  if (pkg.bin) {
    await validatePackageBins(pkg, packageDir, label);
  }
}

async function validateTextFiles() {
  for (const file of textFiles) {
    const path = resolve(root, file);
    if (!existsSync(path)) {
      failures.push(`${file}: missing`);
      continue;
    }
    checkPlaceholders(await readFile(path, 'utf8'), file, blockedSourceFiles.has(file));
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function requireField(value, field, label) {
  if (!value?.[field]) {
    failures.push(`${label}: missing ${field}`);
  }
}

function validateDependencyVersions(pkg, label) {
  const sections = ['dependencies', 'optionalDependencies', 'peerDependencies'];
  for (const section of sections) {
    const dependencies = pkg[section] ?? {};
    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') {
        failures.push(`${label}/package.json: ${section}.${name} must be a string version`);
        continue;
      }

      if (version.startsWith('workspace:')) {
        failures.push(`${label}/package.json: ${section}.${name} uses workspace protocol, which is not publishable to npm consumers`);
      }

      const localVersion = workspacePackageVersions.get(name);
      if (localVersion && version !== localVersion && version !== `^${localVersion}` && version !== `~${localVersion}`) {
        failures.push(`${label}/package.json: ${section}.${name} should reference local package version ${localVersion}, got ${version}`);
      }
    }
  }
}

async function validatePackageBins(pkg, packageDir, label) {
  const bins = typeof pkg.bin === 'string'
    ? [[pkg.name, pkg.bin]]
    : Object.entries(pkg.bin);

  for (const [name, binPath] of bins) {
    if (typeof binPath !== 'string') {
      failures.push(`${label}/package.json: bin.${name} must be a string path`);
      continue;
    }

    const absoluteBin = resolve(root, packageDir, binPath);
    if (!existsSync(absoluteBin)) {
      failures.push(`${label}/package.json: bin.${name} target does not exist: ${binPath}`);
      continue;
    }

    const binText = await readFile(absoluteBin, 'utf8');
    if (!binText.startsWith('#!/usr/bin/env node')) {
      failures.push(`${label}/package.json: bin.${name} target must start with a Node shebang`);
    }
  }
}

function checkPlaceholders(text, label, checkSourcePatterns = false) {
  for (const placeholder of placeholders) {
    if (text.includes(placeholder)) {
      failures.push(`${label}: contains placeholder or stale metadata "${placeholder}"`);
    }
  }

  if (checkSourcePatterns) {
    for (const { pattern, description } of blockedSourcePatterns) {
      if (pattern.test(text)) {
        failures.push(`${label}: contains ${description}`);
      }
    }
  }
}
