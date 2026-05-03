import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/cli/dist/cli.js');
const failures = [];

const renderHelp = runCli(['render', '--help']);
const previewHelp = runCli(['preview', '--help']);
const inspectRuntimeHelp = runCli(['inspect-runtime', '--help']);

expectIncludes(renderHelp, '--render-scale <scale>', 'render help');
expectIncludes(renderHelp, '--quality <quality>', 'render help');
expectIncludes(renderHelp, '--fps <fps>', 'render help');
expectIncludes(renderHelp, '--codec <codec>', 'render help');
expectIncludes(previewHelp, '--pixel-ratio <ratio>', 'preview help');
expectIncludes(previewHelp, '--fps <fps>', 'preview help');
expectIncludes(inspectRuntimeHelp, '--full', 'inspect-runtime help');
expectIncludes(inspectRuntimeHelp, '--include-frame-plan', 'inspect-runtime help');
expectExcludes(renderHelp, 'webm', 'render help');
expectExcludes(renderHelp, 'prores', 'render help');
expectExcludes(renderHelp, 'vp9', 'render help');

const docs = [
  'docs/renderer-notes.md',
  'docs/quick-start.md',
  'docs/getting-started.md',
  'packages/cli/README.md',
];

for (const file of docs) {
  const text = readFileSync(resolve(root, file), 'utf8');
  expectIncludes(text, '@ui2v/cli', file);
  expectIncludes(text, '--render-scale', file);
  expectIncludes(text, '--pixel-ratio', file);
  if (file !== 'packages/cli/README.md') {
    expectIncludes(text, '--quality low|medium|high|ultra|cinema', file);
  }
}

if (failures.length > 0) {
  throw new Error(`CLI surface validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
}

console.log('CLI surface validation passed');

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) {
    failures.push(`ui2v ${args.join(' ')} failed with code ${result.status}\n${indent(output.trim())}`);
  }
  return output;
}

function expectIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    failures.push(`${label}: missing "${needle}"`);
  }
}

function expectExcludes(text, needle, label) {
  if (text.includes(needle)) {
    failures.push(`${label}: should not mention unsupported "${needle}"`);
  }
}

function indent(text) {
  return text
    .split(/\r?\n/)
    .map(line => `  ${line}`)
    .join('\n');
}
