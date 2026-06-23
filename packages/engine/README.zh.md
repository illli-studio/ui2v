# @ui2v/engine

[English](README.md)

ui2v 的浏览器渲染引擎。它将项目渲染到 Canvas，并通过 WebCodecs 支持浏览器
原生 MP4 导出。它也负责 `custom-code` 图层的浏览器/npm 依赖按需加载。

**核心库（有维护示例）：** `d3`、`gsap`、`animejs`、`three`、`pixi.js`、`matter-js`、`lottie-web`。

**扩展库：** `fabric`、`konva`、`paper`、`p5`、`tsparticles`、`cannon-es`、`roughjs`、`@tweenjs/tween.js`、`katex`、`iconify`、`opentype.js`、`split-type`。

**实验库（loader 在，暂无维护示例）：** `postprocessing`、`simplex-noise`、`mathjs`。

浏览器/npm 库通过固定的 CDN import map（`BROWSER_LIBRARY_IMPORT_MAP`）按需加载，不再是 CLI 安装时的 npm 硬依赖。

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
