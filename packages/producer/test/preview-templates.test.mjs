import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { insertPreviewTemplate, listPreviewTemplates } = require('../dist/index.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const templateProject = JSON.parse(readFileSync(resolve(root, 'examples/library-timeline/animation.json'), 'utf8'));
const runtimeProject = JSON.parse(readFileSync(resolve(root, 'examples/runtime-storyboard/animation.json'), 'utf8'));

const templates = listPreviewTemplates(root);
assert(templates.some(item => item.id === 'beat-gsap'), 'catalog should include library-timeline GSAP beat');
assert(templates.some(item => item.id === 'runtime-canvas-hook'), 'catalog should include builtin runtime hook');

const templateInsert = insertPreviewTemplate(structuredClone(templateProject), {
  templateId: 'beat-d3',
  startTime: 12,
  duration: 2,
}, root);
assert(templateInsert.insertedId.startsWith('beat-d3'), 'template insert should create a beat layer id');
assert(templateInsert.endTime === 14, 'template insert should extend project duration when needed');
assert(
  templateInsert.project.template.layers.some(layer => layer.id === templateInsert.insertedId),
  'template insert should append a new layer'
);

const runtimeInsert = insertPreviewTemplate(structuredClone(runtimeProject), {
  templateId: 'runtime-gsap-beat',
  startTime: 9.5,
}, root);
assert(
  runtimeInsert.project.timeline.segments.some(segment => segment.id === runtimeInsert.insertedId),
  'runtime insert should append a new segment'
);
assert(runtimeInsert.endTime > 9.5, 'runtime insert should honor requested start time');

console.log('preview-templates.test.mjs passed');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
