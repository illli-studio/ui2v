import assert from 'node:assert/strict';
import {
  createAdapterRoutingPlan,
  createDependencyPlan,
  createDrawCommandStream,
  createVideoFramePlan,
  createRenderPlan,
  createSegmentPlan,
  createSegmentFramePlan,
  inspectStaticCustomCode,
  getDependenciesForRange,
  getFrameCount,
  getFrameTime,
  MultiAdapterHost,
  RuntimeHost,
  sampleFrames,
  TimelineEngine,
  normalizeProject,
  validateRuntimeProject,
} from '../dist/index.mjs';

const runtimeProject = {
  schema: 'uiv-runtime',
  id: 'nested-runtime',
  duration: 5,
  fps: 30,
  resolution: { width: 1280, height: 720 },
  scene: {
    root: {
      id: 'root',
      type: 'root',
      children: [
        {
          id: 'group',
          type: 'group',
          opacity: 0.5,
          transform: { x: 100, y: 40, scaleX: 2, scaleY: 3 },
          children: [
            {
              id: 'child',
              type: 'custom-code',
              startTime: 1,
              duration: 2,
              opacity: 0.5,
              transform: { x: 10, y: 20, rotation: 15 },
              properties: { label: 'hello' },
              motion: [
                {
                  property: 'transform.x',
                  from: 10,
                  to: 30,
                  startTime: 1,
                  duration: 1,
                  easing: 'linear',
                  loop: false,
                  yoyo: false,
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

{
  const normalized = normalizeProject(runtimeProject);
  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const frame = timeline.evaluate(1.5);
  const group = frame.nodes.find(node => node.id === 'group');
  const child = frame.nodes.find(node => node.id === 'child');

  assert.equal(normalized.scene.snapshot().nodes.length, 3);
  assert.ok(group);
  assert.ok(child);
  assert.equal(child.localTime, 0.5);
  assert.equal(child.opacity, 0.25);
  assert.equal(child.localTransform.x, 20);
  assert.equal(child.transform.x, 140);
  assert.equal(child.transform.y, 100);
  assert.ok(Math.abs(child.worldMatrix.e - 140) < 0.000001);
  assert.ok(Math.abs(child.worldMatrix.f - 100) < 0.000001);
  assert.equal(child.properties.label, 'hello');

  const plan = createRenderPlan(frame);
  assert.equal(plan.itemCount, 2);
  const childPlan = plan.items.find(item => item.nodeId === 'child');
  assert.ok(childPlan);
  assert.equal(childPlan.localTime, 0.5);
  assert.equal(childPlan.worldMatrix.e, 140);
  assert.deepEqual(childPlan.dependencies, []);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'production-metadata',
    duration: 6,
    fps: 30,
    resolution: { width: 100, height: 100 },
    theme: {
      font: 'Inter',
      colors: { bg: '#000', text: '#fff' },
      radius: 8,
    },
    datasets: {
      orders: [{ id: 1, value: 42 }],
    },
    assets: {
      logo: './assets/logo.png',
      beat: { src: './audio/beat.mp3', type: 'audio' },
    },
    narration: [
      { id: 'cue-1', time: 1, duration: 3, text: 'Hello' },
    ],
    audio: {
      markers: [
        { id: 'beat-1', time: 1.5, type: 'beat' },
      ],
    },
    camera: {
      zoom: 1,
      z: 0,
      fov: 1000,
      motion: [
        { time: 0, zoom: 1, z: 0 },
        { time: 3, zoom: 1.3, x: 30, z: -200, easing: 'linear' },
      ],
    },
    timeline: {
      segments: [
        { id: 'a', startTime: 0, endTime: 3, transition: { type: 'fade', duration: 0.5 }, camera: { zoom: 1.1 }, code: 'function render() {}' },
        { id: 'b', startTime: 3, endTime: 6, transition: { type: 'wipe', duration: 0.75 }, code: 'function render() {}' },
      ],
    },
    scene: {
      root: { id: 'root', type: 'root', children: [] },
    },
  });
  const frame = new TimelineEngine(normalized.composition, normalized.scene).evaluate(3.25);
  assert.equal(normalized.composition.theme.colors.text, '#fff');
  assert.equal(normalized.composition.assets.logo.type, 'image');
  assert.deepEqual(normalized.composition.datasets.orders, [{ id: 1, value: 42 }]);
  assert.equal(frame.activeSegment?.id, 'b');
  assert.equal(frame.activeNarration[0].id, 'cue-1');
  assert.equal(frame.activeAudioMarkers[0].id, 'beat-1');
  assert.equal(frame.transition?.type, 'wipe');
  assert.equal(frame.transition?.phase, 'in');
  assert.equal(frame.transition?.fromSegmentId, 'a');
  assert.equal(frame.transition?.toSegmentId, 'b');
  assert.ok(frame.transition.progress > 0);
  assert.ok(frame.camera.z < 0);
  assert.ok(frame.camera.zoom > 1);
  assert.ok(frame.camera.effectiveZoom > frame.camera.zoom);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'video-timing',
    duration: 2,
    fps: 24,
    resolution: { width: 100, height: 100 },
    dependencies: ['global-lib'],
    markers: [
      { id: 'start', time: 0 },
      { id: 'beat', time: 1 },
    ],
    segments: [
      { id: 'a', startTime: 0, endTime: 1 },
      { id: 'b', startTime: 1, endTime: 2 },
    ],
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          {
            id: 'library-layer',
            type: 'custom-code',
            dependencies: ['gsap', 'three'],
          },
        ],
      },
    },
  });
  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const frame = timeline.evaluate(1.25);
  const plan = createRenderPlan(frame);

  assert.equal(getFrameCount(normalized.composition), 48);
  assert.equal(getFrameTime(12, 24), 0.5);
  assert.equal(sampleFrames(normalized.composition).length, 48);
  const videoPlan = createVideoFramePlan(normalized.composition, { keyframeIntervalSeconds: 1 });
  assert.equal(videoPlan.length, 48);
  assert.equal(videoPlan[12].renderTime, 0.5);
  assert.equal(videoPlan[12].timestampUs, 500000);
  assert.equal(videoPlan[12].durationUs, 41667);
  assert.equal(videoPlan[24].keyframe, true);
  assert.equal(frame.activeSegment?.id, 'b');
  assert.deepEqual(frame.markers.map(marker => marker.id), ['start', 'beat']);
  assert.deepEqual(frame.dependencies, ['global-lib', 'gsap', 'three']);
  assert.deepEqual(plan.dependencies, ['global-lib', 'gsap', 'three']);
  assert.deepEqual(plan.items[0].dependencies, ['gsap', 'three']);
  const routingPlan = createAdapterRoutingPlan(plan);
  assert.equal(routingPlan.items[0].route.adapterId, 'ui2v.three');
  assert.equal(routingPlan.items[0].route.renderer, 'three');
  assert.deepEqual(routingPlan.routes[0].dependencies, ['gsap', 'three']);
  assert.equal(plan.activeSegmentId, 'b');
  assert.deepEqual(plan.markerIds, ['start', 'beat']);

  const dependencyPlan = createDependencyPlan(normalized.composition, normalized.scene.snapshot());
  assert.deepEqual(dependencyPlan.dependencies, ['global-lib', 'gsap', 'three']);
  assert.equal(dependencyPlan.windows.length, 2);
  assert.deepEqual(dependencyPlan.windows[0].dependencies, ['global-lib', 'gsap', 'three']);
  assert.deepEqual(dependencyPlan.windows[1].dependencies, ['global-lib', 'gsap', 'three']);

  const rangeDependencies = getDependenciesForRange(normalized.composition, normalized.scene.snapshot(), 0.25, 0.5);
  assert.deepEqual(rangeDependencies.dependencies, ['global-lib', 'gsap', 'three']);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'segment-authored-custom-code',
    duration: 9,
    fps: 30,
    resolution: { width: 100, height: 100 },
    dependencies: ['canvas2d'],
    timeline: {
      segments: [
        {
          id: 'intro',
          startTime: 0,
          endTime: 3,
          dependencies: ['animejs'],
          code: 'function render(t, ctx) {}',
        },
        {
          id: 'middle',
          startTime: 3,
          duration: 3,
          dependencies: ['gsap'],
          layers: [
            {
              id: 'middle-code',
              type: 'custom-code',
              startTime: 1,
              duration: 1.5,
              properties: { code: 'function render(t, ctx) {}' },
            },
          ],
        },
        {
          id: 'outro',
          startTime: 6,
          endTime: 9,
          dependencies: ['d3'],
          nodes: [
            {
              id: 'outro-code',
              type: 'custom-code',
              properties: { code: 'function render(t, ctx) {}' },
            },
          ],
        },
      ],
    },
    scene: {
      root: { id: 'root', type: 'root', children: [] },
    },
  });

  const snapshot = normalized.scene.snapshot();
  assert.ok(snapshot.nodes.find(node => node.id === 'intro-custom-code'));
  assert.ok(snapshot.nodes.find(node => node.id === 'middle-code'));
  assert.ok(snapshot.nodes.find(node => node.id === 'outro-code'));

  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const introFrame = timeline.evaluate(1.5);
  const introNode = introFrame.nodes.find(node => node.id === 'intro-custom-code');
  assert.equal(introFrame.activeSegment?.id, 'intro');
  assert.ok(introNode);
  assert.equal(introNode.localTime, 1.5);
  assert.equal(introNode.properties.__runtimeSegmentId, 'intro');
  assert.equal(introNode.properties.__runtimeSegmentLocalTime, 1.5);
  assert.equal(introNode.properties.__runtimeSegmentProgress, 0.5);
  assert.deepEqual(introNode.dependencies, ['animejs']);

  const middleFrame = timeline.evaluate(4.25);
  const middleNode = middleFrame.nodes.find(node => node.id === 'middle-code');
  assert.equal(middleFrame.activeSegment?.id, 'middle');
  assert.ok(middleNode);
  assert.equal(middleNode.localTime, 0.25);
  assert.equal(middleNode.properties.__runtimeSegmentLocalTime, 1.25);
  assert.equal(Math.round(middleNode.properties.__runtimeSegmentProgress * 1000) / 1000, 0.417);
  assert.deepEqual(middleNode.dependencies, ['gsap']);

  const dependencyPlan = createDependencyPlan(normalized.composition, snapshot);
  assert.deepEqual(dependencyPlan.windows.map(window => window.dependencies), [
    ['animejs', 'canvas2d'],
    ['canvas2d', 'gsap'],
    ['canvas2d', 'd3'],
  ]);

  const segmentPlan = createSegmentPlan(normalized.composition, snapshot);
  assert.equal(segmentPlan.segmentCount, 3);
  assert.equal(segmentPlan.coverage, 1);
  assert.deepEqual(segmentPlan.gaps, []);
  assert.deepEqual(segmentPlan.segments.map(segment => segment.authoredNodeIds), [
    ['intro-custom-code'],
    ['middle-code'],
    ['outro-code'],
  ]);
  assert.deepEqual(segmentPlan.segments.map(segment => segment.dependencies), [
    ['animejs', 'canvas2d'],
    ['canvas2d', 'gsap'],
    ['canvas2d', 'd3'],
  ]);

  const segmentFramePlan = createSegmentFramePlan(normalized.composition);
  assert.equal(segmentFramePlan.totalFrames, 270);
  assert.deepEqual(segmentFramePlan.ranges.map(range => [range.segmentId, range.startFrame, range.endFrame, range.frameCount]), [
    ['intro', 0, 89, 90],
    ['middle', 90, 179, 90],
    ['outro', 180, 269, 90],
  ]);
  assert.deepEqual(segmentFramePlan.unassignedFrames, []);
  assert.equal(segmentFramePlan.frames[0].segmentId, 'intro');
  assert.equal(segmentFramePlan.frames[89].segmentProgress, 89 / 90);
  assert.equal(segmentFramePlan.frames[90].segmentId, 'middle');
  assert.equal(segmentFramePlan.frames[90].segmentLocalTime, 0);
  assert.equal(segmentFramePlan.frames[180].segmentId, 'outro');

  const customCodeInspection = inspectStaticCustomCode(snapshot);
  assert.equal(customCodeInspection.total, 3);
  assert.equal(customCodeInspection.withErrors, 0);
  assert.deepEqual(customCodeInspection.items.map(item => [item.nodeId, item.segmentId, item.entrypoint]), [
    ['intro-custom-code', 'intro', 'render-function'],
    ['middle-code', 'middle', 'render-function'],
    ['outro-code', 'outro', 'render-function'],
  ]);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'custom-code-static-inspection',
    duration: 2,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          {
            id: 'wrapped',
            type: 'custom-code',
            properties: {
              code: '```js\nexport default { render(t, context) { gsap.to({}, {}); } }\n```',
            },
          },
          {
            id: 'json-code',
            type: 'custom-code',
            dependencies: ['d3'],
            properties: {
              code: JSON.stringify({ code: 'function createRenderer() { return { render() { d3.select; } }; }' }),
            },
          },
        ],
      },
    },
  });

  const inspection = inspectStaticCustomCode(normalized.scene.snapshot());
  assert.equal(inspection.total, 2);
  const wrapped = inspection.items.find(item => item.nodeId === 'wrapped');
  const jsonCode = inspection.items.find(item => item.nodeId === 'json-code');
  assert.ok(wrapped);
  assert.ok(jsonCode);
  assert.equal(wrapped.entrypoint, 'export-default');
  assert.equal(wrapped.sanitizedChanged, true);
  assert.ok(wrapped.diagnostics.some(diagnostic => diagnostic.code === 'CUSTOM_CODE_MARKDOWN_FENCE'));
  assert.equal(wrapped.diagnostics.some(diagnostic => diagnostic.code === 'CUSTOM_CODE_IMPLICIT_DEPENDENCY'), false);
  assert.deepEqual(wrapped.dependencies, ['gsap']);
  assert.equal(jsonCode.entrypoint, 'createRenderer');
  assert.ok(jsonCode.diagnostics.some(diagnostic => diagnostic.code === 'CUSTOM_CODE_JSON_WRAPPER'));
  assert.deepEqual(jsonCode.dependencies, ['d3']);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'inferred-custom-code-dependencies',
    duration: 2,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          {
            id: 'implicit-libs',
            type: 'custom-code',
            properties: {
              code: [
                'function render(t, context) {',
                '  const v = new THREE.Vector3(1, 2, 3);',
                '  const scale = d3.scaleLinear().domain([0, 1]).range([0, 100]);',
                '  gsap.parseEase("power2.out")(t);',
                '  const noise = simplex.createNoise2D ? simplex.createNoise2D() : null;',
                '  return v.x + scale(t) + (noise ? 1 : 0);',
                '}',
              ].join('\n'),
            },
          },
        ],
      },
    },
  });

  const snapshot = normalized.scene.snapshot();
  const node = snapshot.nodes.find(item => item.id === 'implicit-libs');
  assert.ok(node);
  assert.deepEqual(node.dependencies, ['d3', 'gsap', 'simplex-noise', 'three']);

  const dependencyPlan = createDependencyPlan(normalized.composition, snapshot);
  assert.deepEqual(dependencyPlan.dependencies, ['d3', 'gsap', 'simplex-noise', 'three']);

  const inspection = inspectStaticCustomCode(snapshot);
  const item = inspection.items.find(entry => entry.nodeId === 'implicit-libs');
  assert.ok(item);
  assert.deepEqual(item.dependencies, ['d3', 'gsap', 'simplex-noise', 'three']);
  assert.equal(item.diagnostics.some(diagnostic => diagnostic.code === 'CUSTOM_CODE_IMPLICIT_DEPENDENCY'), false);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'segment-plan-gaps-overlaps',
    duration: 5,
    fps: 30,
    resolution: { width: 100, height: 100 },
    timeline: {
      segments: [
        { id: 'a', startTime: 0, endTime: 1, code: 'function render() {}' },
        { id: 'b', startTime: 2, endTime: 4, code: 'function render() {}' },
        { id: 'c', startTime: 3.5, endTime: 5, code: 'function render() {}' },
      ],
    },
    scene: {
      root: { id: 'root', type: 'root', children: [] },
    },
  });

  const plan = createSegmentPlan(normalized.composition, normalized.scene.snapshot());
  assert.equal(plan.segmentCount, 3);
  assert.deepEqual(plan.gaps.map(gap => [gap.startTime, gap.endTime]), [[1, 2]]);
  assert.deepEqual(plan.overlaps.map(overlap => [overlap.previousId, overlap.nextId, overlap.startTime, overlap.endTime]), [
    ['b', 'c', 3.5, 4],
  ]);
  assert.ok(plan.coverage < 1);
}

{
  const validation = validateRuntimeProject({
    schema: 'uiv-runtime',
    id: 'segment-validation',
    duration: 5,
    fps: 30,
    resolution: { width: 100, height: 100 },
    timeline: {
      segments: [
        { id: 'a', startTime: 0, endTime: 1, dependencies: ['animejs'], code: 'function render() {}' },
        { id: 'b', startTime: 2, endTime: 4, layers: [{ id: 'b-code', properties: { code: 'function render() {}' } }] },
        { id: 'c', startTime: 3.5, endTime: 5, dependencies: ['gsap'], code: 'function render() {}' },
      ],
    },
    scene: {
      root: { id: 'root', type: 'root', children: [] },
    },
  });

  assert.equal(validation.valid, true);
  assert.ok(validation.warnings.some(warning => warning.code === 'SEGMENT_GAP'));
  assert.ok(validation.warnings.some(warning => warning.code === 'SEGMENT_OVERLAP'));
}

{
  const validation = validateRuntimeProject({
    schema: 'uiv-runtime',
    id: 'bad-segment-validation',
    duration: 5,
    fps: 30,
    resolution: { width: 100, height: 100 },
    timeline: {
      segments: [
        { id: 'dup', startTime: 0, endTime: 1, code: 'function render() {}' },
        { id: 'dup', startTime: 1, endTime: 2, code: 'function render() {}' },
        { id: 'bad-range', startTime: 3, endTime: 2, code: 123 },
        { id: 'bad-deps', startTime: 2, endTime: 3, dependencies: ['gsap', 7] },
        { id: 'too-late', startTime: 4, endTime: 8, code: 'function render() {}' },
      ],
    },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'dup-custom-code', type: 'custom-code' },
        ],
      },
    },
  });

  assert.equal(validation.valid, false);
  const codes = validation.errors.map(error => error.code);
  assert.ok(codes.includes('DUPLICATE_SEGMENT_ID'));
  assert.ok(codes.includes('SEGMENT_EMPTY_RANGE'));
  assert.ok(codes.includes('INVALID_SEGMENT_CODE'));
  assert.ok(codes.includes('INVALID_DEPENDENCY'));
  assert.ok(codes.includes('SEGMENT_END_AFTER_DURATION'));
  assert.ok(codes.includes('DUPLICATE_GENERATED_NODE_ID'));
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'dependency-windows',
    duration: 4,
    fps: 30,
    resolution: { width: 100, height: 100 },
    dependencies: ['canvas2d'],
    segments: [
      { id: 'intro', startTime: 0, endTime: 1 },
      { id: 'middle', startTime: 1, endTime: 3 },
      { id: 'outro', startTime: 3, endTime: 4 },
    ],
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'intro-layer', type: 'custom-code', startTime: 0, duration: 1, dependencies: ['animejs'] },
          { id: 'middle-layer', type: 'custom-code', startTime: 1.1, duration: 1, dependencies: ['three'] },
          { id: 'late-layer', type: 'custom-code', startTime: 3.05, duration: 0.5, dependencies: ['gsap'] },
        ],
      },
    },
  });

  const plan = createDependencyPlan(normalized.composition, normalized.scene.snapshot());
  assert.deepEqual(plan.windows.map(window => window.id), ['intro', 'middle', 'outro']);
  assert.deepEqual(plan.windows[0].dependencies, ['animejs', 'canvas2d']);
  assert.deepEqual(plan.windows[1].dependencies, ['canvas2d', 'three']);
  assert.deepEqual(plan.windows[2].dependencies, ['canvas2d', 'gsap']);

  const lookAheadPlan = createDependencyPlan(normalized.composition, normalized.scene.snapshot(), { lookAheadSeconds: 0.2 });
  assert.deepEqual(lookAheadPlan.windows[0].dependencies, ['animejs', 'canvas2d', 'three']);
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'adapter-routing',
    duration: 2,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'canvas-node', type: 'custom-code' },
          { id: 'three-node', type: 'custom-code', dependencies: ['three'] },
          { id: 'pixi-node', type: 'custom-code', dependencies: ['pixi.js'] },
          { id: 'explicit-node', type: 'custom-code', properties: { __runtimeAdapter: 'ui2v.special', __runtimeRenderer: 'special' } },
        ],
      },
    },
  });
  const frame = new TimelineEngine(normalized.composition, normalized.scene).evaluate(0.5);
  const plan = createAdapterRoutingPlan(createRenderPlan(frame));
  const routes = Object.fromEntries(plan.items.map(item => [item.nodeId, item.route]));

  assert.equal(routes['canvas-node'].adapterId, 'ui2v.template-canvas');
  assert.equal(routes['three-node'].adapterId, 'ui2v.three');
  assert.equal(routes['pixi-node'].adapterId, 'ui2v.pixi');
  assert.equal(routes['explicit-node'].adapterId, 'ui2v.special');
  assert.equal(routes['explicit-node'].renderer, 'special');
  assert.deepEqual(plan.routes.map(route => route.adapterId).sort(), ['ui2v.pixi', 'ui2v.special', 'ui2v.template-canvas', 'ui2v.three']);

  const commandStream = createDrawCommandStream(plan, {
    backgroundColor: '#000',
    size: normalized.composition.resolution,
  });
  assert.equal(commandStream.commands[0].op, 'clear');
  assert.equal(commandStream.commands[0].color, '#000');
  assert.equal(commandStream.size.width, 100);
  assert.equal(commandStream.commands.filter(command => command.op === 'drawLayer').length, 4);
  const threeDraw = commandStream.commands.find(command => command.op === 'drawLayer' && command.nodeId === 'three-node');
  assert.ok(threeDraw);
  assert.equal(threeDraw.route.adapterId, 'ui2v.three');
  assert.deepEqual(threeDraw.dependencies, ['three']);
}

{
  const calls = [];
  const createAdapter = id => ({
    id,
    capabilities: {
      renderer: id,
      supportsPreview: true,
      supportsExport: true,
      supportsHeadless: true,
      supportsIncrementalUpdate: true,
    },
    initialize() {
      calls.push(`${id}:initialize`);
    },
    render() {
      calls.push(`${id}:render`);
    },
    renderPlan(plan) {
      calls.push(`${id}:renderPlan:${plan.items.map(item => item.nodeId).join('|')}`);
    },
    dispose() {
      calls.push(`${id}:dispose`);
    },
  });

  const host = new MultiAdapterHost({
    schema: 'uiv-runtime',
    id: 'multi-adapter',
    duration: 2,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'canvas-node', type: 'custom-code' },
          { id: 'three-node', type: 'custom-code', dependencies: ['three'] },
          { id: 'pixi-node', type: 'custom-code', dependencies: ['pixi.js'] },
        ],
      },
    },
  }, {
    adapters: {
      'ui2v.template-canvas': createAdapter('ui2v.template-canvas'),
      'ui2v.three': createAdapter('ui2v.three'),
    },
    fallbackAdapterId: 'ui2v.template-canvas',
  });

  const result = await host.render(0.5);
  assert.deepEqual(result.dispatchedAdapters, ['ui2v.template-canvas', 'ui2v.three']);
  assert.deepEqual(result.missingAdapters, ['ui2v.pixi']);
  assert.ok(result.drawCommands.commandCount > 0);
  assert.equal(result.drawCommands.commands[0].op, 'clear');
  assert.ok(calls.includes('ui2v.template-canvas:renderPlan:canvas-node|pixi-node'));
  assert.ok(calls.includes('ui2v.three:renderPlan:three-node'));
  await host.dispose();
  assert.ok(calls.includes('ui2v.template-canvas:dispose'));
  assert.ok(calls.includes('ui2v.three:dispose'));
}

{
  const calls = [];
  const commandAdapter = {
    id: 'ui2v.command-adapter',
    capabilities: {
      renderer: 'command-test',
      supportsPreview: true,
      supportsExport: true,
      supportsHeadless: true,
      supportsIncrementalUpdate: true,
    },
    initialize() {
      calls.push('initialize');
    },
    render() {
      calls.push('render');
    },
    renderPlan() {
      calls.push('renderPlan');
    },
    renderCommands(commands) {
      calls.push(`renderCommands:${commands.commands.filter(command => command.op === 'drawLayer').length}`);
    },
    dispose() {
      calls.push('dispose');
    },
  };
  const host = new RuntimeHost({
    schema: 'uiv-runtime',
    id: 'command-host',
    duration: 1,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'canvas-node', type: 'custom-code' },
        ],
      },
    },
  }, {
    adapter: commandAdapter,
  });

  await host.render(0);
  assert.deepEqual(calls.slice(0, 2), ['initialize', 'renderCommands:1']);
  assert.equal(calls.includes('renderPlan'), false);
  assert.equal(calls.includes('render'), false);
  await host.dispose();
  assert.ok(calls.includes('dispose'));
}

{
  const calls = [];
  const createCommandAdapter = id => ({
    id,
    capabilities: {
      renderer: id,
      supportsPreview: true,
      supportsExport: true,
      supportsHeadless: true,
      supportsIncrementalUpdate: true,
    },
    initialize() {
      calls.push(`${id}:initialize`);
    },
    render() {
      calls.push(`${id}:render`);
    },
    renderPlan() {
      calls.push(`${id}:renderPlan`);
    },
    renderCommands(commands) {
      calls.push(`${id}:renderCommands:${commands.commands.filter(command => command.op === 'drawLayer').length}`);
    },
    dispose() {
      calls.push(`${id}:dispose`);
    },
  });
  const host = new MultiAdapterHost({
    schema: 'uiv-runtime',
    id: 'multi-command-host',
    duration: 1,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'canvas-node', type: 'custom-code' },
          { id: 'three-node', type: 'custom-code', dependencies: ['three'] },
        ],
      },
    },
  }, {
    adapters: {
      'ui2v.template-canvas': createCommandAdapter('ui2v.template-canvas'),
      'ui2v.three': createCommandAdapter('ui2v.three'),
    },
    fallbackAdapterId: 'ui2v.template-canvas',
  });

  await host.render(0);
  assert.ok(calls.includes('ui2v.template-canvas:renderCommands:1'));
  assert.ok(calls.includes('ui2v.three:renderCommands:1'));
  assert.equal(calls.some(call => call.endsWith(':renderPlan')), false);
  await host.dispose();
}

{
  const normalized = normalizeProject({
    schema: 'uiv-runtime',
    id: 'matrix-runtime',
    duration: 2,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          {
            id: 'rotated-parent',
            type: 'group',
            transform: { rotation: 90 },
            children: [
              {
                id: 'rotated-child',
                type: 'custom-code',
                transform: { x: 10, y: 0 },
              },
            ],
          },
        ],
      },
    },
  });
  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const child = timeline.evaluate(0).nodes.find(node => node.id === 'rotated-child');

  assert.ok(child);
  assert.ok(Math.abs(child.worldMatrix.e - 0) < 0.000001);
  assert.ok(Math.abs(child.worldMatrix.f - 10) < 0.000001);
  assert.ok(Math.abs(child.transform.x - 0) < 0.000001);
  assert.ok(Math.abs(child.transform.y - 10) < 0.000001);
}

{
  const normalized = normalizeProject({
    id: 'legacy-template',
    mode: 'template',
    duration: 2,
    fps: 30,
    resolution: { width: 640, height: 360 },
    template: {
      layers: [
        {
          id: 'legacy-layer',
          type: 'custom-code',
          startTime: 0,
          endTime: 2,
          properties: { x: 12, code: 'function createRenderer(){return {render(){}}}' },
        },
      ],
    },
  });
  const timeline = new TimelineEngine(normalized.composition, normalized.scene);
  const frame = timeline.evaluate(0.25);

  assert.equal(frame.nodes.length, 1);
  assert.equal(frame.nodes[0].id, 'legacy-layer');
  assert.equal(frame.nodes[0].transform.x, 12);

  const segmentFramePlan = createSegmentFramePlan(normalized.composition);
  assert.equal(segmentFramePlan.totalFrames, 60);
  assert.equal(segmentFramePlan.ranges[0].segmentId, 'main');
  assert.equal(segmentFramePlan.frames[0].segmentId, 'main');
}

{
  const legacyFramePlan = createSegmentFramePlan({
    duration: 2,
    fps: 30,
  });
  assert.equal(legacyFramePlan.totalFrames, 60);
  assert.equal(legacyFramePlan.ranges[0].segmentId, 'main');
  assert.equal(legacyFramePlan.ranges[0].frameCount, 60);
  assert.deepEqual(legacyFramePlan.unassignedFrames, []);
}

{
  const result = validateRuntimeProject({
    schema: 'uiv-runtime',
    id: 'bad-runtime',
    duration: 1,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'dup', type: 'custom-code' },
          { id: 'dup', type: 'custom-code' },
          {
            id: 'bad-motion',
            type: 'custom-code',
            motion: [{ property: 'opacity', startTime: 0, duration: 0 }],
          },
        ],
      },
    },
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'DUPLICATE_NODE_ID'));
  assert.ok(result.errors.some(error => error.code === 'INVALID_MOTION_DURATION'));
}

{
  assert.throws(() => normalizeProject({
    schema: 'uiv-runtime',
    id: 'bad-normalize',
    duration: 1,
    fps: 30,
    resolution: { width: 100, height: 100 },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [
          { id: 'same', type: 'custom-code' },
          { id: 'same', type: 'custom-code' },
        ],
      },
    },
  }), /DUPLICATE_NODE_ID/);
}

console.log('runtime-core behavior tests passed');
