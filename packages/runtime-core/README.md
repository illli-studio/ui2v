# @ui2v/runtime-core

[Chinese](README.zh.md)

DOM-free runtime foundation for ui2v compositions.

Runtime Core owns scene graph normalization, timeline evaluation, deterministic
frame plans, dependency metadata, adapter routing, multi-adapter coordination,
and renderer-neutral draw commands. It does not draw pixels.

## Install

```bash
npm install @ui2v/runtime-core
```

## Frame Plans

```ts
import { createVideoFramePlan } from '@ui2v/runtime-core';

const frames = createVideoFramePlan({ duration: 4, fps: 30 });
```

Exporters should render `frame.renderTime` and encode with
`frame.timestampUs` and `frame.durationUs`.

## Adapter Routing

```ts
import { createAdapterRoutingPlan, createRenderPlan } from '@ui2v/runtime-core';

const routing = createAdapterRoutingPlan(createRenderPlan(frame));
```

Routing metadata lets Canvas, Three.js, Pixi, Lottie, DOM, and future adapters
share one timeline.

## Draw Commands

```ts
import { createDrawCommandStream } from '@ui2v/runtime-core';

const stream = createDrawCommandStream(routing, {
  backgroundColor: composition.backgroundColor,
  size: composition.resolution,
});
```

The initial command set includes `clear`, `save`, `restore`, `setTransform`,
`setOpacity`, `drawLayer`, and `custom`.

## License

MIT
