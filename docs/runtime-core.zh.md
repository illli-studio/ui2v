# Runtime Core

[English](runtime-core.md)

`@ui2v/runtime-core` 是 ui2v 不依赖 DOM 的基础层。它描述某个时间点的合成
状态，但不决定像素如何绘制。

## 职责

- 归一化旧版 ui2v template JSON 和新版 runtime JSON。
- 构建 composition 和 scene graph。
- 在任意时间点计算时间线状态。
- 生成确定性的视频帧计划。
- 跟踪当前帧和渲染计划需要的依赖。
- 将渲染项路由到适配器。
- 协调多适配器渲染。
- 将路由计划降低为与渲染器无关的绘制命令。

## Runtime 管线

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

Core 有意避开 DOM、Canvas、WebGL 和导出 API，这些能力属于 adapter 和 engine
包。

## 视频帧计划

导出器需要权威帧时间时，可以使用 `createVideoFramePlan()`：

```ts
import { createVideoFramePlan } from '@ui2v/runtime-core';

const frames = createVideoFramePlan({ duration: 4, fps: 30 });
```

每一帧都包含 render time、presentation time、微秒级 timestamp、微秒级
duration、帧序号和关键帧元数据。

## 分段

Runtime JSON 可以把视频描述为显式时间段。这很适合生成式 UI 视频，因为每个
片段都可以拥有自己的依赖、自定义代码、参数和局部时间。

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

`createSegmentFramePlan()` 会把每个输出帧映射回 segment id、segment 局部
时间、segment 进度和 segment 局部帧序号。

## 依赖

节点可以声明依赖：

```json
{
  "id": "orbit",
  "type": "custom-code",
  "dependencies": ["gsap", "three"]
}
```

Runtime 会暴露活跃依赖，让渲染器只预加载当前帧或片段真正需要的库。

## 适配器路由

`createAdapterRoutingPlan()` 会按目标后端分组渲染项。默认路由会把 Canvas
兼容任务发送到 `ui2v.template-canvas`；元数据可以把未来任务路由到 Three.js、
Pixi、Lottie、DOM 或其他适配器。

```json
{
  "properties": {
    "__runtimeAdapter": "ui2v.three",
    "__runtimeRenderer": "three"
  }
}
```

## 绘制命令

`createDrawCommandStream()` 会把路由计划降低为 `clear`、`save`、`restore`、
`setTransform`、`setOpacity`、`drawLayer` 和 `custom` 等命令。

适配器可以实现 `renderCommands(stream, frame)`，直接消费这个中立格式。
