import assert from 'node:assert/strict';
import { CodeSanitizer, createCodePreview, createEntrypointProbe, errorToDiagnostic, normalizeEntrypoint, prepareCustomCode } from '../dist/index.mjs';

function detect(code) {
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console
  };
  const fn = new Function(...Object.keys(sandbox), `'use strict';\n${code}\n${createEntrypointProbe()}`);
  return normalizeEntrypoint(fn(...Object.values(sandbox)));
}

{
  const prepared = prepareCustomCode('```js\nexport default function Layer() {}\n```');
  assert.match(prepared.sanitized, /exports\.default = function Layer/);
  assert.equal(prepared.changed, true);
  assert.ok(prepared.preview.includes('exports.default'));
  assert.ok(prepared.diagnostics.some((item) => item.message.includes('Markdown fence')));
}

{
  const prepared = prepareCustomCode(JSON.stringify({ code: 'function render(t, ctx) { ctx.ok = t; }' }));
  assert.equal(prepared.source, 'function render(t, ctx) { ctx.ok = t; }');
  assert.ok(prepared.diagnostics.some((item) => item.message.includes('JSON wrapper')));
}

{
  assert.equal(detect('function createRenderer() { return { render() {} }; }').type, 'factory');
  assert.equal(detect('function createAnimation() { return { render() {} }; }').type, 'factory');
  assert.equal(detect('function render() {}').type, 'render-function');
  assert.equal(detect('module.exports = { render() {} };').type, 'object');
  assert.equal(detect('exports.default = { render() {} };').type, 'object');
  assert.equal(detect('const x = 1 + 1;').type, 'script');
}

{
  const sanitized = CodeSanitizer.sanitize([
    "import * as THREE from 'three';",
    "import { scaleLinear, axisBottom as bottomAxis } from 'd3';",
    "import 'paper';",
    "export default function Layer() {}",
  ].join('\n'));
  assert.match(sanitized, /const THREE = require\('three'\);/);
  assert.match(sanitized, /const \{scaleLinear, axisBottom: bottomAxis\} = require\('d3'\);/);
  assert.match(sanitized, /require\('paper'\);/);
  assert.match(sanitized, /exports\.default = function Layer/);
}

{
  assert.equal(createCodePreview('  const   x = 1;\\n\\n const y = 2;  '), 'const x = 1;\\n\\n const y = 2;');
  assert.equal(createCodePreview('abcdef', 4), 'abc…');
  const diagnostic = errorToDiagnostic('compile', new Error('bad syntax'), { frame: 12, time: 0.4 });
  assert.equal(diagnostic.level, 'error');
  assert.equal(diagnostic.stage, 'compile');
  assert.equal(diagnostic.frame, 12);
  assert.equal(diagnostic.time, 0.4);
  assert.match(diagnostic.message, /bad syntax/);
}

console.log('custom-code-runtime tests passed');
