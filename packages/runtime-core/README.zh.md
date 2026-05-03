# @ui2v/runtime-core

[English](README.md)

ui2v composition 的 DOM-free 运行时基础。

Runtime Core 负责场景图归一化、时间线计算、确定性帧计划、依赖元数据、适配器
路由、多适配器协调，以及与渲染器无关的绘制命令。它本身不画像素。

## 安装

```bash
npm install @ui2v/runtime-core
```

## 帧计划

```ts
import { createVideoFramePlan } from '@ui2v/runtime-core';

const frames = createVideoFramePlan({ duration: 4, fps: 30 });
```

导出器应渲染 `frame.renderTime`，并使用 `frame.timestampUs` 和
`frame.durationUs` 编码。

## 适配器路由

```ts
import { createAdapterRoutingPlan, createRenderPlan } from '@ui2v/runtime-core';

const routing = createAdapterRoutingPlan(createRenderPlan(frame));
```

路由元数据让 Canvas、Three.js、Pixi、Lottie、DOM 和未来适配器共享同一条时间线。

## 绘制命令

```ts
import { createDrawCommandStream } from '@ui2v/runtime-core';

const stream = createDrawCommandStream(routing, {
  backgroundColor: composition.backgroundColor,
  size: composition.resolution,
});
```

初始命令集包括 `clear`、`save`、`restore`、`setTransform`、`setOpacity`、
`drawLayer` 和 `custom`。

## 许可证

MIT
