# @ui2v/runtime-core

Runtime Core is the DOM-free foundation for ui2v compositions.

It owns:

- Scene graph normalization and traversal
- Timeline evaluation
- Motion scheduling
- Engine adapter contracts
- Deterministic video frame plans
- Frame-level and render-plan dependency metadata
- Adapter routing plans
- Multi-adapter execution coordination
- Renderer-neutral draw command streams

It deliberately does not render pixels. Canvas, WebGL, DOM, export, and preview
implementations plug in through adapters.

## Video Export Timing

Use `createVideoFramePlan()` when an exporter needs authoritative render times,
presentation timestamps, frame durations, and keyframe cadence:

```ts
import { createVideoFramePlan } from '@ui2v/runtime-core';

const frames = createVideoFramePlan({ duration: 4, fps: 30 });
```

Exporters should render `frame.renderTime` and encode with
`frame.timestampUs` / `frame.durationUs`.

## Dependency Orchestration

Runtime nodes can declare library dependencies. `TimelineEngine` aggregates the
dependencies needed for the current frame, while `createRenderPlan()` preserves
per-item dependencies for adapters. This allows renderers to preload only the
libraries required by active nodes instead of loading every supported animation
library up front.

## Adapter Routing

Use `createAdapterRoutingPlan()` to group a render plan by target renderer:

```ts
import { createAdapterRoutingPlan, createRenderPlan } from '@ui2v/runtime-core';

const routing = createAdapterRoutingPlan(createRenderPlan(frame));
```

Routing is metadata-only in Runtime Core. It does not draw pixels. Current
defaults route Canvas-compatible nodes to `ui2v.template-canvas` and reserve
renderer-specific routes for `three`, `pixi`, and `lottie` nodes or
dependencies. Nodes can override routing with `__runtimeAdapter` and
`__runtimeRenderer` properties.

## Multi-Adapter Host

Use `MultiAdapterHost` when a composition should dispatch routed render items to
multiple adapters:

```ts
import { MultiAdapterHost } from '@ui2v/runtime-core';

const host = new MultiAdapterHost(project, {
  adapters: {
    'ui2v.template-canvas': canvasAdapter,
    'ui2v.three': threeAdapter,
  },
  fallbackAdapterId: 'ui2v.template-canvas',
});

const result = await host.render(1.25);
```

`result.dispatchedAdapters` shows which adapters rendered the frame.
`result.missingAdapters` shows routes that were not registered and were skipped
or sent to the fallback adapter.

## Draw Commands

Use `createDrawCommandStream()` to lower a routed plan into a renderer-neutral
command list:

```ts
import { createDrawCommandStream } from '@ui2v/runtime-core';

const stream = createDrawCommandStream(routingPlan, {
  backgroundColor: composition.backgroundColor,
  size: composition.resolution,
});
```

The initial command set includes `clear`, `save`, `restore`, `setTransform`,
`setOpacity`, `drawLayer`, and `custom`. Adapters can consume this stream
directly or use it as an inspection/export intermediate representation.

Adapters may implement `renderCommands(stream, frame)`. Runtime hosts prefer it
over `renderPlan()` and `render()`, which allows adapters to gradually migrate
from node-level rendering to command-stream rendering.

The engine package includes a `CanvasDrawCommandExecutor` that directly executes
canvas-native commands and delegates `drawLayer` through a callback, allowing
existing layer renderers to be reused during migration.
