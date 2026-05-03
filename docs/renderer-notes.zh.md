# Renderer Notes 中文版

[English](renderer-notes.md)

ui2v renderer 采用浏览器优先的设计。它把 Canvas 绘制、兼容 DOM 的动画库和
WebCodecs 视频编码放在真实浏览器环境中执行。

## 主路径

```text
Node.js CLI
  -> @ui2v/producer
  -> Puppeteer browser page
  -> @ui2v/runtime-core frame evaluation
  -> @ui2v/engine Canvas render
  -> WebCodecs MP4 encode
  -> streamed Node.js file write
```

## 为什么浏览器优先

- GSAP、Three.js、D3、Pixi、Fabric、Lottie 和 p5 等动画库本来就围绕浏览器
  API 设计。
- WebCodecs 提供浏览器原生的视频编码能力，主路径不需要 FFmpeg。
- 预览和导出可以共享同一套 runtime timing model。
- CLI 可以避开 Electron 和原生 canvas 绑定。

## Custom Code

`custom-code` layer 可以通过 render context 直接绘制 Canvas。renderer 支持
多种入口形式，包括 `createRenderer()`、带 `render` 的对象、独立 render
函数，以及兼容的 module/class 结构。

## 导出

生产路径当前主要输出 MP4。AVC/H.264 是默认 codec，因为它是 Chromium
WebCodecs 中最通用的路径。HEVC 支持取决于启动的浏览器。

通过 `@ui2v/cli` 的常见用法：

```bash
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --render-scale 2
ui2v preview animation.json --pixel-ratio 2
```

编码后的 MP4 Blob 会从浏览器页面分块流回 Node.js，写入临时文件后再 rename
到目标路径。这样可以避免长视频或高分辨率导出时，把一个巨大的 base64 payload
一次性通过 Puppeteer 返回给 Node。

## 约束

- 浏览器端依赖目前来自 producer import map，可能使用固定的 CDN URL。
- 超大导出仍然取决于当前 Chromium 构建的 WebCodecs codec 支持和可用内存。
