# 渲染器说明

[English](ui2v-renderer-readme.md)

ui2v 渲染器采用浏览器优先设计。它使用浏览器擅长的能力：Canvas 绘制、兼容
DOM 的动画库，以及 WebCodecs 视频编码。

## 主路径

```text
Node.js CLI
  -> @ui2v/producer
  -> Puppeteer browser page
  -> @ui2v/runtime-core 帧计算
  -> @ui2v/engine Canvas 渲染
  -> WebCodecs MP4 编码
  -> Node.js 写入文件
```

## 为什么浏览器优先

- GSAP、Three.js、D3、Pixi、Fabric、Lottie 和 p5 等动画库本来就围绕浏览器
  API 设计。
- WebCodecs 提供浏览器原生视频编码，主路径不必依赖 FFmpeg。
- 预览和导出可以共享同一套运行时时间模型。
- CLI 可以避开 Electron 和原生 canvas 绑定。

## 自定义代码

`custom-code` 图层可以通过 render context 直接绘制 Canvas。渲染器支持多种
入口形式，包括 `createRenderer()`、带 `render` 的对象、独立 render 函数，
以及兼容的模块/类结构。

## 导出

生产路径当前主要输出 MP4。AVC/H.264 是默认编码器，因为它是 Chromium
WebCodecs 中最通用的路径。HEVC 支持取决于启动的浏览器。

## 限制

- 浏览器端依赖目前来自 producer import map，可能使用固定 CDN URL。
- 编码结果目前会先以 base64 返回 Node，再写入文件。
- 在流式输出完成前，长视频或高分辨率渲染建议使用保守的分辨率、fps 和质量设置。
