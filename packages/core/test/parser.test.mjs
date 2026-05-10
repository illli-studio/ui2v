import assert from 'node:assert/strict';
import { parseProject, normalizeResolution, ProjectParseError } from '../dist/index.mjs';

const baseProject = {
  id: 'parser-test',
  mode: 'template',
  duration: 1,
  fps: 30,
  resolution: { width: 1280, height: 720 },
  template: { layers: [] },
};

assert.deepEqual(normalizeResolution({ width: '1920', height: '1080' }), { width: 1920, height: 1080 });
assert.deepEqual(parseProject(JSON.stringify(baseProject)).resolution, { width: 1280, height: 720 });
const projectWithMetadata = parseProject(JSON.stringify({ ...baseProject, title: 'Parser Title', description: 'Parser description.' }));
assert.equal(projectWithMetadata.title, 'Parser Title');
assert.equal(projectWithMetadata.description, 'Parser description.');

for (const resolution of [
  { width: 0, height: 720 },
  { width: 1280, height: 0 },
  { width: -1280, height: 720 },
  { width: 1280.5, height: 720 },
  { width: Number.NaN, height: 720 },
  { width: Number.POSITIVE_INFINITY, height: 720 },
]) {
  assert.throws(
    () => parseProject(JSON.stringify({ ...baseProject, resolution })),
    error => error instanceof ProjectParseError && error.code === 'INVALID_RESOLUTION',
    'invalid object resolution should be rejected before rendering',
  );
}

console.log('Core parser tests passed');
