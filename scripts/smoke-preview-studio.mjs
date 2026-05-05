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
  assert(html.includes('id="stage"'), 'preview HTML should use a fullscreen stage');
  assert(html.includes('id="previewCanvas"'), 'preview HTML should include preview canvas');
  assert(html.includes('id="sidebar"'), 'preview HTML should include a project sidebar');
  assert(html.includes('id="projectList"'), 'preview HTML should include project list');
  assert(html.includes('id="controls"'), 'preview HTML should include bottom controls');
  assert(html.includes('id="topActions"'), 'preview HTML should keep primary actions in the top bar');
  assert(html.includes('/preview/state'), 'preview HTML should poll preview state');
  assert(html.includes('/preview/export-download'), 'preview HTML should export through browser save/download flow');
  assert(html.includes('showSaveFilePicker'), 'preview HTML should use the browser system save picker when available');
  assert(!html.includes('id="exportPanel"'), 'preview HTML should not show a redundant export dialog');
  assert(!html.includes('showDirectoryPicker'), 'preview HTML should not use folder picker flow');
  assert(html.includes("event.code === 'Space'"), 'preview HTML should support spacebar play/pause');
  assert(html.includes("target.tagName === 'INPUT'"), 'spacebar handler should ignore text inputs');
  assert(html.includes("import { UivRuntime } from '/runtime-core/index.mjs'"), 'preview HTML should import runtime from runtime-core');
  assert(html.includes('runtime.renderFrame(currentSecond, adapter)'), 'preview HTML should render through the runtime-core API');
  assert(html.includes('data-ui2v-ready="false"'), 'preview canvas should expose ready state');
  assert(html.includes('requestFullscreen'), 'preview HTML should include fullscreen control');
  assert(html.includes('ui2v Preview'), 'preview HTML should present a focused preview workspace');
  assert(!html.includes('Snapshot'), 'preview HTML should not include snapshot controls');
  assert(!html.includes('Copy render'), 'preview HTML should not include copy command controls');

  const projectUrl = session.url.replace('/preview.html', '/project.json');
  const attached = await fetch(projectUrl).then(response => response.json());
  assert(attached.options?.width === 1920 && attached.options?.height === 1080, 'preview project defaults should start at 1920x1080');

  const projectsUrl = session.url.replace('/preview.html', '/preview/projects');
  const projects = await fetch(projectsUrl).then(response => response.json());
  assert(Array.isArray(projects.projects), 'project list should be an array');
  assert(projects.projects.some(item => item.label === 'examples/hero-ai-launch/animation.json'), 'project list should include hero example');
  assert(projects.projects.some(item => item.label === 'examples/runtime-core/animation.json'), 'project list should include runtime example');

  const stateUrl = session.url.replace('/preview.html', `/preview/state?path=${encodeURIComponent(input)}`);
  const state = await fetch(stateUrl).then(response => response.json());
  assert(state.currentPath === input, 'preview state should include current path');
  assert(typeof state.currentMtimeMs === 'number', 'preview state should include current mtime');
  assert(typeof state.projectListVersion === 'string' && state.projectListVersion.length > 0, 'preview state should include project list version');

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
