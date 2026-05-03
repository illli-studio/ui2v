# ui2v Runtime Core

Runtime Core is the long-term foundation for ui2v rendering. It separates
animation state from rendering implementation:

```text
Runtime JSON / ui2v JSON
  -> normalizeProject
  -> SceneGraph
  -> TimelineEngine.evaluate(time)
  -> RuntimeFrame
  -> EngineAdapter.render(frame)
```

## Responsibilities

- Scene graph: node hierarchy, traversal, render ordering, snapshots.
- Timeline engine: deterministic frame evaluation from time.
- Motion scheduler: play, pause, seek, and manual export stepping.
- Adapter system: Canvas, WebGL, DOM, export, and future engines plug in here.
- Video frame plan: authoritative export frame times, presentation timestamps,
  frame durations, and keyframe cadence.
- Dependency orchestration: frames and render plans expose the libraries needed
  by currently active nodes so exporters and adapters can preload only what the
  video needs.
- Adapter routing: render plans can be grouped by target renderer so future
  Canvas2D, Three.js, Pixi, Lottie, DOM, and headless adapters can share one
  timeline.
- Multi-adapter execution: routed render plans can be dispatched to multiple
  adapters with a fallback adapter for unsupported routes.
- Draw command stream: routed plans can be lowered into a DOM-free command list
  that Canvas, WebGL, headless, and export adapters can consume.

The core does not draw pixels and does not depend on the DOM.

## Runtime JSON

New projects can use:

```json
{
  "schema": "uiv-runtime",
  "id": "example",
  "duration": 4,
  "fps": 30,
  "resolution": { "width": 960, "height": 540 },
  "scene": {
    "root": {
      "id": "root",
      "type": "root",
      "children": []
    }
  }
}
```

Legacy ui2v template JSON is still accepted by the normalizer.

## ui2v Video Segments

ui2v Runtime can author a video as explicit time segments. This is the preferred
shape for AI-generated UI video because each segment can own its custom code,
dependencies, parameters, and local timeline:

```json
{
  "schema": "uiv-runtime",
  "id": "segmented-video",
  "duration": 9,
  "fps": 30,
  "resolution": { "width": 1280, "height": 720 },
  "timeline": {
    "segments": [
      {
        "id": "opening",
        "startTime": 0,
        "endTime": 3,
        "dependencies": ["animejs"],
        "code": "function render(t, context) { /* 0-3s */ }"
      },
      {
        "id": "middle",
        "startTime": 3,
        "endTime": 6,
        "layers": [
          {
            "id": "middle-code",
            "type": "custom-code",
            "properties": {
              "code": "function render(t, context) { /* 3-6s */ }"
            }
          }
        ]
      },
      {
        "id": "resolve",
        "startTime": 6,
        "endTime": 9,
        "nodes": [
          {
            "id": "resolve-code",
            "type": "custom-code",
            "properties": {
              "code": "export default { render(t, context) {} }"
            }
          }
        ]
      }
    ]
  },
  "scene": {
    "root": { "id": "root", "type": "root", "children": [] }
  }
}
```

During normalization, segment-authored code is expanded into real scene graph
nodes. A segment can use:

- `code` or `customCode` for a single custom-code layer
- `layers`, `nodes`, or `children` for multiple layers inside the segment
- `dependencies` to load libraries only for that time window

Custom code receives segment-aware context:

- `context.localTime`: local time for the current layer
- `context.progress`: 0-1 progress for the current segment when segment data is available
- `context.segment`: active/authored segment id
- `context.segmentTime`: local time inside the segment
- `context.segmentProgress`: explicit segment progress
- `context.segmentData`: optional user data from the segment

This makes `0-3`, `3-6`, `6-9` style video construction a first-class runtime
pattern instead of a fixed template trick.

Runtime Core can also derive exact frame ownership for each segment:

```ts
const plan = createSegmentFramePlan(composition);
```

For a 9 second, 30fps video split into three 3 second segments, the frame ranges
are:

```text
opening: frames 0-89
middle:  frames 90-179
resolve: frames 180-269
```

Each frame entry includes the global render/presentation timing from
`createVideoFramePlan()` plus:

- `segmentId`
- `segmentLocalTime`
- `segmentProgress`
- `segmentFrameIndex`

This gives exporters and progress reporters a deterministic way to report
which ui2v video segment is currently being rendered, preload dependencies by
segment, and debug boundary frames without guessing from floating-point time.

## Video Timing

Runtime Core owns export timing through `createVideoFramePlan()`:

```ts
const plan = createVideoFramePlan({ duration: 4, fps: 30 });
```

Each planned frame contains:

- `index`
- `renderTime`
- `presentationTime`
- `duration`
- `timestampUs`
- `durationUs`
- `keyframe`

The WebCodecs exporter and chunked export engine now consume this plan instead
of recalculating frame times independently. This keeps preview, inspection, and
video export on the same timing model.

## Library Dependencies

Runtime nodes can declare dependencies:

```json
{
  "id": "orbit",
  "type": "custom-code",
  "dependencies": ["gsap", "three"]
}
```

`TimelineEngine.evaluate(time)` exposes the dependencies required by the active
frame. `createRenderPlan(frame)` also preserves per-item dependencies. The
template canvas adapter forwards these dependencies into the template layer, and
`TemplateRenderer` preloads only the requested libraries instead of eagerly
loading every supported animation package.

This is the first step toward segment-aware library loading and multi-engine
routing, where a single composition can coordinate Canvas2D, GSAP, Three.js,
Pixi, Lottie, and other adapters from one deterministic runtime.

## Adapter Routing

Runtime Core can turn a `RenderPlan` into an `AdapterRoutingPlan`:

```ts
const frame = runtime.evaluate(1.25);
const plan = createRenderPlan(frame);
const routing = createAdapterRoutingPlan(plan);
```

Each item gets a route:

- `adapterId`
- `renderer`
- `reason`

The default router sends Canvas-compatible nodes to `ui2v.template-canvas`, and
routes renderer-specific dependencies such as `three`, `pixi`, and `lottie` to
their future adapters. Nodes can also request a route explicitly:

```json
{
  "id": "hero-3d",
  "type": "custom-code",
  "properties": {
    "__runtimeAdapter": "ui2v.three",
    "__runtimeRenderer": "three"
  }
}
```

The current canvas adapter still renders through the existing template engine,
but it now preserves `__runtimeRoute` metadata on layers. This lets inspection,
export planning, and future multi-adapter execution use the same routing plan.

## Multi-Adapter Host

`MultiAdapterHost` is the execution coordinator for routed plans:

```ts
const host = new MultiAdapterHost(project, {
  adapters: {
    "ui2v.template-canvas": canvasAdapter,
    "ui2v.three": threeAdapter
  },
  fallbackAdapterId: "ui2v.template-canvas"
});

await host.render(1.25);
```

For each frame it:

- evaluates the timeline
- creates a render plan
- creates an adapter routing plan
- groups items by resolved adapter
- dispatches each group to the matching adapter
- sends unsupported routes to the fallback adapter when configured

The render result reports both `dispatchedAdapters` and `missingAdapters`, which
is useful for debugging partial adapter coverage during video export.

## Draw Commands

Runtime Core can lower an `AdapterRoutingPlan` into a `DrawCommandStream`:

```ts
const commands = createDrawCommandStream(routing, {
  backgroundColor: composition.backgroundColor,
  size: composition.resolution
});
```

The first command set supports:

- `clear`
- `save`
- `restore`
- `setTransform`
- `setOpacity`
- `drawLayer`
- `custom`

This is still renderer-neutral. `drawLayer` carries the node id, type,
properties, dependencies, world matrix, opacity, and route metadata needed by a
backend. The CLI inspector now shows command counts and operation summaries for
sampled frames, so a single inspection can trace:

```text
scene -> timeline frame -> render plan -> routing plan -> draw commands
```

Adapters can now implement `renderCommands(stream, frame)`. `RuntimeHost` and
`MultiAdapterHost` prefer that method when it exists, then fall back to
`renderPlan()` and finally `render()`. The current `TemplateCanvasAdapter`
already implements this path by converting `drawLayer` commands back into
template layers before delegating to the existing canvas renderer. This makes
command execution real today while keeping the migration safe.

The engine package also provides `CanvasDrawCommandExecutor`. It directly
executes the canvas-native command subset:

- `clear`
- `save`
- `restore`
- `setTransform`
- `setOpacity`
- `custom`

`drawLayer` is intentionally delegated through a callback so existing layer
renderers can be reused while the command executor takes over more primitive
operations. `TemplateCanvasAdapter` now uses this executor and records the last
command execution summary for debugging.
