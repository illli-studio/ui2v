import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseProject } = require('../packages/core/dist/index.js');
const { startPreviewServer } = require('../packages/producer/dist/index.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, 'examples/hero-ai-launch/animation.json');
const runtimeInput = resolve(root, 'examples/runtime-core/animation.json');
const invalidInput = resolve(root, '.tmp/preview-invalid-project.json');
mkdirSync(dirname(invalidInput), { recursive: true });
writeFileSync(invalidInput, JSON.stringify({ id: 'invalid-preview-project', duration: 1, fps: 30, resolution: { width: 1920, height: 1080 } }, null, 2));
const project = parseProject(readFileSync(input, 'utf8'));
const session = await startPreviewServer(project, {
  sourcePath: input,
  workspaceRoot: root,
  exportDir: resolve(root, '.tmp/examples'),
  pixelRatio: 1,
});

try {
  const html = await fetch(session.url).then(response => response.text());
  assert(html.includes('Preview Library'), 'preview HTML should include project library');
  assert(html.includes('Export MP4'), 'preview HTML should include export action');
  assert(html.includes('Fullscreen'), 'preview HTML should include fullscreen control');
  assert(html.includes('Theater'), 'preview HTML should include theater control');
  assert(html.includes('fitMode'), 'preview HTML should include fit mode control');
  assert(html.includes('playbackRate'), 'preview HTML should include playback speed control');
  assert(html.includes('Save current frame'), 'preview HTML should include snapshot export');
  assert(html.includes('Copy CLI command'), 'preview HTML should include copy command action');
  assert(html.includes('--render-scale'), 'copied render command should use real CLI render-scale flag');
  assert(!html.includes('--scale '), 'copied render command should not use unsupported scale flag');

  const projectUrl = session.url.replace('/preview.html', '/project.json');
  const attached = await fetch(projectUrl).then(response => response.json());
  assert(attached.options?.width === 1920 && attached.options?.height === 1080, 'preview project defaults should start at 1920x1080');

  const projectsUrl = session.url.replace('/preview.html', '/preview/projects');
  const projects = await fetch(projectsUrl).then(response => response.json());
  assert(Array.isArray(projects.projects), 'project list should be an array');
  assert(projects.projects.some(item => item.label === 'examples/hero-ai-launch/animation.json'), 'project list should include hero example');
  assert(projects.projects.some(item => item.label === 'examples/runtime-core/animation.json'), 'project list should include runtime example');

  const loadUrl = session.url.replace('/preview.html', `/preview/load?path=${encodeURIComponent(runtimeInput)}`);
  const loaded = await fetch(loadUrl).then(response => response.json());
  assert(loaded.project?.schema === 'uiv-runtime', 'runtime project should load through preview API');
  assert(loaded.options?.width === 1920 && loaded.options?.height === 1080, 'runtime project should keep its own dimensions');

  const invalidUrl = session.url.replace('/preview.html', `/preview/load?path=${encodeURIComponent(invalidInput)}`);
  const invalidResponse = await fetch(invalidUrl);
  const invalid = await invalidResponse.json();
  assert(!invalidResponse.ok, 'invalid project load should fail');
  assert(String(invalid.error).includes('Project mode'), 'invalid project error should explain schema validation');

  const blockedUrl = session.url.replace('/preview.html', `/preview/load?path=${encodeURIComponent(resolve(root, '..', 'outside.json'))}`);
  const blockedResponse = await fetch(blockedUrl);
  const blocked = await blockedResponse.json();
  assert(!blockedResponse.ok, 'outside workspace load should fail');
  assert(String(blocked.error).includes('workspace root'), 'outside workspace error should mention workspace root');

  console.log(`Preview Studio smoke passed: ${projects.projects.length} projects`);
} finally {
  await session.close();
  rmSync(invalidInput, { force: true });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
