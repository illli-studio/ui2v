import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseProject } = require('../packages/core/dist/index.js');
const { findBrowserExecutable, startPreviewServer } = require('../packages/producer/dist/index.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const producerRequire = createRequire(resolve(root, 'packages/producer/package.json'));
const input = resolve(root, 'examples/library-timeline/animation.json');
const runtimeInput = resolve(root, 'examples/runtime-storyboard/animation.json');
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
  assert(html.includes('ResizeObserver(scheduleCanvasDisplaySize)'), 'preview canvas should resize when the stage container changes');
  assert(html.includes("max-width:100%; max-height:100%"), 'preview canvas should be constrained by the visible stage');
  assert(html.includes('await runtime.initializeAdapter(adapter);\n      scheduleCanvasDisplaySize();'), 'preview should restore fitted display size after adapter initialization');
  assert(html.includes('id="timelinePanel"'), 'preview HTML should include timeline panel');
  assert(html.includes('id="inspectPanel"'), 'preview HTML should include inspect panel');
  assert(html.includes('/preview/timeline'), 'preview HTML should load timeline model');
  assert(html.includes('/preview/inspect'), 'preview HTML should inspect runtime at playhead');
  assert(html.includes('/preview/patch'), 'preview HTML should persist timeline edits');
  assert(html.includes('ui2v Studio'), 'preview HTML should present the studio workspace');
  assert(html.includes('initJsonEditor'), 'preview HTML should initialize JSON editor asynchronously');
  assert(html.includes('@codemirror/lang-json'), 'preview HTML should attempt CodeMirror JSON editor');
  assert(html.includes('/preview/split'), 'preview HTML should support clip split');
  assert(html.includes('/preview/save-project'), 'preview HTML should save full project JSON');
  assert(html.includes('id="splitClipAction"'), 'preview HTML should include split-at-playhead action');
  assert(html.includes('id="templateStrip"'), 'preview HTML should include beat template strip');
  assert(html.includes('/preview/templates'), 'preview HTML should load beat templates');
  assert(html.includes('id="timelineRippleToggle"'), 'preview HTML should include ripple edit toggle');
  assert(html.includes('timelineEditMode'), 'preview HTML should persist timeline edit mode');
  assert(html.includes('f\' + frame'), 'preview HTML should show frame numbers');
  assert(!html.includes('Snapshot'), 'preview HTML should not include snapshot controls');
  assert(!html.includes('Copy render'), 'preview HTML should not include copy command controls');

  const projectUrl = session.url.replace('/preview.html', '/project.json');
  const attached = await fetch(projectUrl).then(response => response.json());
  assert(attached.options?.width === 1920 && attached.options?.height === 1080, 'preview project defaults should match library timeline resolution');

  const projectsUrl = session.url.replace('/preview.html', '/preview/projects');
  const projects = await fetch(projectsUrl).then(response => response.json());
  assert(Array.isArray(projects.projects), 'project list should be an array');
  assert(projects.projects.some(item => item.label === 'examples/library-timeline/animation.json'), 'project list should include library timeline example');
  assert(projects.projects.some(item => item.label === 'examples/runtime-storyboard/animation.json'), 'project list should include runtime storyboard example');

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

  const browserExecutable = findBrowserExecutable();
  if (browserExecutable) {
    const puppeteer = producerRequire('puppeteer-core');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: browserExecutable,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 1 });
      await page.goto(session.url, { waitUntil: 'networkidle0' });
      await page.waitForSelector('canvas[data-ui2v-ready="true"]');
      const normalFit = await page.evaluate(() => {
        const stage = document.getElementById('stageInner').getBoundingClientRect();
        const canvas = document.getElementById('previewCanvas').getBoundingClientRect();
        return { stageWidth: stage.width, stageHeight: stage.height, canvasWidth: canvas.width, canvasHeight: canvas.height };
      });
      assertPreviewFit(normalFit, 1920 / 1080, 'normal preview');

      await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
      await page.waitForFunction(() => {
        const stage = document.getElementById('stageInner').getBoundingClientRect();
        const canvas = document.getElementById('previewCanvas').getBoundingClientRect();
        return canvas.width > 0 && canvas.width <= stage.width && canvas.height <= stage.height;
      });
      const resizedFit = await page.evaluate(() => {
        const stage = document.getElementById('stageInner').getBoundingClientRect();
        const canvas = document.getElementById('previewCanvas').getBoundingClientRect();
        return { stageWidth: stage.width, stageHeight: stage.height, canvasWidth: canvas.width, canvasHeight: canvas.height };
      });
      assertPreviewFit(resizedFit, 1920 / 1080, 'resized preview');
      await page.close();
    } finally {
      await browser.close();
    }
  }

  const timelineUrl = session.url.replace('/preview.html', `/preview/timeline?path=${encodeURIComponent(runtimeInput)}`);
  const timeline = await fetch(timelineUrl).then(response => response.json());
  assert(timeline.schema === 'uiv-runtime', 'timeline API should expose runtime schema');
  assert(timeline.tracks[0]?.clips?.length >= 3, 'timeline API should expose runtime segments');

  const inspectUrl = session.url.replace('/preview.html', `/preview/inspect?path=${encodeURIComponent(runtimeInput)}&time=1`);
  const inspect = await fetch(inspectUrl).then(response => response.json());
  assert(typeof inspect.frame === 'number', 'inspect API should expose frame number');
  assert(Array.isArray(inspect.dependencies), 'inspect API should expose dependencies');

  const lintUrl = session.url.replace('/preview.html', `/preview/lint?path=${encodeURIComponent(runtimeInput)}`);
  const lintPayload = await fetch(lintUrl).then(response => response.json());
  assert(typeof lintPayload.errorCount === 'number', 'lint API should expose errorCount');
  assert(Array.isArray(lintPayload.lint), 'lint API should expose lint items');

  const patchCopy = resolve(root, '.tmp/preview-patch-project.json');
  mkdirSync(dirname(patchCopy), { recursive: true });
  writeFileSync(patchCopy, readFileSync(runtimeInput, 'utf8'));
  const patchUrl = session.url.replace('/preview.html', '/preview/patch');
  const patchResponse = await fetch(patchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: patchCopy,
      updates: [{ id: 'hook', kind: 'segment', startTime: 0, endTime: 3.1 }],
    }),
  });
  const patchPayload = await patchResponse.json();
  assert(patchResponse.ok, 'timeline patch should succeed for runtime project');
  assert(patchPayload.timeline?.tracks?.[0]?.clips?.[0]?.endTime === 3.1, 'timeline patch should update segment timing');

  const rippleCopy = resolve(root, '.tmp/preview-ripple-project.json');
  writeFileSync(rippleCopy, readFileSync(runtimeInput, 'utf8'));
  const rippleResponse = await fetch(patchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: rippleCopy,
      mode: 'ripple',
      updates: [{ id: 'hook', kind: 'segment', endTime: 2.5 }],
    }),
  });
  const ripplePayload = await rippleResponse.json();
  assert(rippleResponse.ok, 'ripple timeline patch should succeed for runtime project');
  assert(ripplePayload.timeline?.tracks?.[0]?.clips?.[0]?.endTime === 2.5, 'ripple patch should trim edited segment');
  assert(
    ripplePayload.timeline?.tracks?.[0]?.clips?.[1]?.startTime === ripplePayload.timeline?.tracks?.[0]?.clips?.[0]?.endTime,
    'ripple patch should pack adjacent runtime segments edge-to-edge',
  );

  const splitCopy = resolve(root, '.tmp/preview-split-project.json');
  writeFileSync(splitCopy, readFileSync(runtimeInput, 'utf8'));
  const splitUrl = session.url.replace('/preview.html', '/preview/split');
  const splitResponse = await fetch(splitUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: splitCopy,
      id: 'proof',
      kind: 'segment',
      time: 4.8,
    }),
  });
  const splitResult = await splitResponse.json();
  assert(splitResponse.ok, 'split endpoint should succeed for runtime segment');
  assert(splitResult.timeline?.tracks?.[0]?.clips?.length >= 4, 'split should add a runtime segment');

  const templatesUrl = session.url.replace('/preview.html', '/preview/templates?schema=uiv-runtime');
  const templatesPayload = await fetch(templatesUrl).then(response => response.json());
  assert(Array.isArray(templatesPayload.templates) && templatesPayload.templates.length >= 3, 'template catalog should expose runtime beats');

  const insertCopy = resolve(root, '.tmp/preview-insert-project.json');
  writeFileSync(insertCopy, readFileSync(runtimeInput, 'utf8'));
  const insertUrl = session.url.replace('/preview.html', '/preview/insert-template');
  const insertResponse = await fetch(insertUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: insertCopy,
      templateId: 'runtime-canvas-hook',
      startTime: 9.8,
    }),
  });
  const insertResult = await insertResponse.json();
  assert(insertResponse.ok, 'insert-template should succeed for runtime project');
  assert(insertResult.insertedId, 'insert-template should return inserted clip id');

  rmSync(insertCopy, { force: true });
  rmSync(splitCopy, { force: true });
  rmSync(patchCopy, { force: true });
  rmSync(rippleCopy, { force: true });

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

function assertPreviewFit(measurement, expectedRatio, label) {
  const ratio = measurement.canvasWidth / measurement.canvasHeight;
  assert(Math.abs(ratio - expectedRatio) < 0.02, `${label} should preserve project aspect ratio`);
  assert(measurement.canvasWidth <= measurement.stageWidth + 1, `${label} should not overflow stage width`);
  assert(measurement.canvasHeight <= measurement.stageHeight + 1, `${label} should not overflow stage height`);
  assert(measurement.canvasWidth > 0 && measurement.canvasHeight > 0, `${label} should render a visible canvas`);
}
