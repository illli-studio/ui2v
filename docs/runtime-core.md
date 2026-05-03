# Runtime Core

[中文](runtime-core.zh.md)

`@ui2v/runtime-core` is the DOM-free foundation of ui2v. It describes what a
composition is at a given time without deciding how pixels are drawn.

## Responsibilities

- Normalize legacy ui2v template JSON and newer runtime JSON.
- Build a composition and scene graph.
- Evaluate timeline state at any time.
- Create deterministic video frame plans.
- Track active dependencies for the current frame and render plan.
- Route render items to adapters.
- Coordinate multi-adapter rendering.
- Lower routed plans into renderer-neutral draw commands.

## Runtime Pipeline

```text
JSON project
  -> normalizeProject()
  -> SceneGraph
  -> TimelineEngine.evaluate(time)
  -> RuntimeFrame
  -> createRenderPlan(frame)
  -> createAdapterRoutingPlan(plan)
  -> createDrawCommandStream(routing)
```

The core deliberately avoids DOM, Canvas, WebGL, and export APIs. Those belong
to adapters and engine packages.

## Video Frame Plans

Use `createVideoFramePlan()` when an exporter needs authoritative frame timing:

```ts
import { createVideoFramePlan } from '@ui2v/runtime-core';

const frames = createVideoFramePlan({ duration: 4, fps: 30 });
```

Each frame includes render time, presentation time, timestamp in microseconds,
duration in microseconds, frame index, and keyframe metadata.

## Segments

Runtime JSON can describe a video as explicit timeline segments. This works
well for generated UI videos because each segment can own dependencies, custom
code, parameters, and local time.

```json
{
  "schema": "uiv-runtime",
  "id": "segmented-video",
  "duration": 9,
  "fps": 30,
  "timeline": {
    "segments": [
      { "id": "opening", "startTime": 0, "endTime": 3 },
      { "id": "middle", "startTime": 3, "endTime": 6 },
      { "id": "resolve", "startTime": 6, "endTime": 9 }
    ]
  }
}
```

`createSegmentFramePlan()` maps every output frame back to its segment id,
segment-local time, segment progress, and segment-local frame index.

## Dependencies

Nodes can declare dependencies:

```json
{
  "id": "orbit",
  "type": "custom-code",
  "dependencies": ["gsap", "three"]
}
```

The runtime exposes active dependencies so renderers can preload only what is
needed for the current frame or segment.

## Adapter Routing

`createAdapterRoutingPlan()` groups render items by target backend. The default
route sends Canvas-compatible work to `ui2v.template-canvas`; metadata can route
future work to Three.js, Pixi, Lottie, DOM, or other adapters.

```json
{
  "properties": {
    "__runtimeAdapter": "ui2v.three",
    "__runtimeRenderer": "three"
  }
}
```

## Draw Commands

`createDrawCommandStream()` lowers routed plans into commands such as `clear`,
`save`, `restore`, `setTransform`, `setOpacity`, `drawLayer`, and `custom`.

Adapters may implement `renderCommands(stream, frame)` to consume this neutral
format directly.
