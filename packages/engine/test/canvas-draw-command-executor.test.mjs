import assert from 'node:assert/strict';
import { CanvasDrawCommandExecutor, TemplateCanvasAdapter } from '../dist/index.mjs';

const calls = [];
const context = {
  fillStyle: '',
  globalAlpha: 1,
  save: () => calls.push('save'),
  restore: () => calls.push('restore'),
  setTransform: (...args) => calls.push(`setTransform:${args.join(',')}`),
  fillRect: (...args) => calls.push(`fillRect:${args.join(',')}`),
  clearRect: (...args) => calls.push(`clearRect:${args.join(',')}`),
};
const canvas = {
  width: 320,
  height: 180,
  getContext: () => context,
};

const executor = new CanvasDrawCommandExecutor({
  canvas,
  context,
  onDrawLayer(command) {
    calls.push(`drawLayer:${command.nodeId}`);
  },
  onCustomCommand(command) {
    calls.push(`custom:${command.name}`);
  },
});

const result = await executor.execute({
  time: 0,
  frame: 0,
  fps: 30,
  commandCount: 7,
  dependencies: [],
  commands: [
    { op: 'clear', color: '#111' },
    { op: 'save' },
    { op: 'setTransform', matrix: { a: 1, b: 0, c: 0, d: 1, e: 12, f: 24 } },
    { op: 'setOpacity', opacity: 0.5 },
    { op: 'drawLayer', nodeId: 'layer-a', type: 'custom-code', zIndex: 1, localTime: 0, properties: {}, dependencies: [] },
    { op: 'custom', name: 'after-layer' },
    { op: 'restore' },
  ],
});

assert.equal(result.commandCount, 7);
assert.equal(result.drawLayerCount, 1);
assert.equal(result.customCommandCount, 1);
assert.equal(result.skippedDrawLayerCount, 0);
assert.deepEqual(calls, [
  'setTransform:1,0,0,1,0,0',
  'fillRect:0,0,320,180',
  'save',
  'setTransform:1,0,0,1,12,24',
  'drawLayer:layer-a',
  'custom:after-layer',
  'restore',
]);
assert.equal(context.globalAlpha, 0.5);

const transitionCalls = [];
const transitionContext = {
  fillStyle: '',
  globalAlpha: 1,
  save: () => transitionCalls.push('save'),
  restore: () => transitionCalls.push('restore'),
  setTransform: (...args) => transitionCalls.push(`setTransform:${args.join(',')}`),
  fillRect: (...args) => transitionCalls.push(`fillRect:${args.join(',')}`),
  clearRect: (...args) => transitionCalls.push(`clearRect:${args.join(',')}`),
};
const transitionExecutor = new CanvasDrawCommandExecutor({
  canvas,
  context: transitionContext,
  onCustomCommand(command) {
    transitionCalls.push(`external:${command.name}`);
  },
});

const transitionResult = await transitionExecutor.execute({
  time: 1,
  frame: 30,
  fps: 30,
  commandCount: 1,
  dependencies: [],
  commands: [
    {
      op: 'custom',
      name: 'runtime-transition-overlay',
      payload: {
        transition: { type: 'wipe', phase: 'in', progress: 0.25, direction: 'left' },
        size: { width: 320, height: 180 },
        backgroundColor: '#000',
      },
    },
  ],
});

assert.equal(transitionResult.customCommandCount, 1);
assert.equal(transitionCalls.includes('external:runtime-transition-overlay'), false);
assert.deepEqual(transitionCalls.slice(0, 3), [
  'save',
  'setTransform:1,0,0,1,0,0',
  'fillRect:0,0,240,180',
]);
assert.equal(transitionCalls.at(-1), 'restore');

const adapter = new TemplateCanvasAdapter({ canvas });
const capturedLayers = [];
adapter.engine = {
  hotUpdateProject(project) {
    capturedLayers.push(...project.template.layers);
  },
  renderFrameAsync() {},
};
adapter.project = {
  id: 'camera-test',
  mode: 'template',
  duration: 1,
  fps: 30,
  resolution: { width: 320, height: 180 },
  template: { layers: [] },
};
await adapter.render({
  time: 0,
  frame: 0,
  fps: 30,
  progress: 0,
  markers: [],
  dependencies: [],
  activeNarration: [],
  activeAudioMarkers: [],
  camera: { x: 10, y: 0, zoom: 2, rotation: 0 },
  composition: {
    id: 'camera-test',
    duration: 1,
    fps: 30,
    resolution: { width: 320, height: 180 },
    variables: {},
    theme: {},
    datasets: {},
    assets: {},
    narration: [],
    markers: [],
    segments: [],
    dependencies: [],
    camera: {},
    sourceProject: {},
  },
  nodes: [
    {
      id: 'camera-layer',
      type: 'custom-code',
      zIndex: 0,
      visible: true,
      opacity: 1,
      localTime: 0,
      localTransform: {},
      transform: {},
      localMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      worldMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      properties: {},
      dependencies: [],
    },
  ],
});
assert.equal(Math.round(capturedLayers[0].properties.__runtimeWorldMatrix.a), 2);
assert.equal(Math.round(capturedLayers[0].properties.__runtimeWorldMatrix.e), -150);

console.log('canvas draw command executor tests passed');
