# @ui2v/engine

[English](README.md)

ui2v 的浏览器渲染引擎。它将项目渲染到 Canvas，并通过 WebCodecs 支持浏览器
原生 MP4 导出。

## 安装

```bash
npm install @ui2v/engine
```

## 使用

```ts
import { Ui2vEngine } from '@ui2v/engine';
import type { AnimationProject } from '@ui2v/core';

const canvas = document.querySelector('canvas')!;
const engine = new Ui2vEngine(canvas);

await engine.loadProject(project as AnimationProject);
await engine.renderFrameAsync(1.25);
engine.dispose();
```

## 关键导出

- `Ui2vEngine`：浏览器 Canvas 渲染。
- `TemplateCanvasAdapter`：对接 runtime-core adapter。
- `CustomCodeRenderer`：渲染 `custom-code` template 图层。
- `CanvasDrawCommandExecutor`：执行 runtime 绘制命令流。
- `WebCodecsExporter`：浏览器原生 MP4 编码。

## 说明

- 这个包依赖 DOM、Canvas、WebCodecs 等浏览器 API。
- 独立 CLI 主路径不需要 Electron、FFmpeg 或 `node-canvas`。
- 包内仍保留部分旧 ui2v 集成路径的兼容导出。

## 许可证

MIT
