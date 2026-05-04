# 架构

[English](architecture.md)

ui2v 是一条基于浏览器的渲染管线，并带有可复用的 runtime core。Node.js 负责编排和文件输出，浏览器负责 Canvas 渲染和 WebCodecs 编码。

## 包结构

```text
@ui2v/core          项目类型、解析、校验和共享工具
@ui2v/runtime-core  场景图、时间线、帧计划和适配器契约
@ui2v/engine        浏览器 Canvas 渲染、自定义代码和 WebCodecs 导出
@ui2v/producer      puppeteer-core 预览/渲染管线和本地静态服务器
@ui2v/cli           面向用户的命令行入口
```

## 渲染流程

```text
JSON project
  -> CLI 读取并校验输入
  -> producer 启动 localhost 静态服务器
  -> puppeteer-core 启动本机 Chrome、Edge 或 Chromium
  -> 浏览器加载 core/runtime/engine bundle
  -> runtime 计算确定性的帧状态
  -> engine 将当前帧渲染到 Canvas
  -> WebCodecs 在浏览器里编码 MP4
  -> producer 接收编码后的数据并写出文件
```

## Runtime 边界

`@ui2v/runtime-core` 不直接渲染像素。它负责规范化项目、计算时间线状态、构建渲染计划、把工作路由给适配器，并可以把单帧降级为与具体渲染器无关的绘制命令。

这种分层让预览、检查和导出共享同一套确定性的时间模型。

## 浏览器边界

`@ui2v/engine` 依赖浏览器 API：DOM、Canvas、可用时的 OffscreenCanvas，以及用于导出的 WebCodecs。它承载 template 图层、custom-code 图层、Canvas 命令执行和视频编码。

## Producer 边界

`@ui2v/producer` 是 Node.js 和浏览器之间的桥。它启动本地服务器、启动浏览器、暴露进度回调、收集诊断信息，并写出最终 MP4。

## 设计原则

1. 让浏览器原生动画库在浏览器原生环境中运行。
2. 预览、检查和渲染共享确定性的 runtime 时间模型。
3. 解析、runtime、渲染、生产管线和 CLI 保持清晰包边界。
4. 主路径不依赖 Electron、FFmpeg 或原生 canvas，便于安装和迁移。
5. runtime 契约面向适配器扩展，后续可支持 Canvas、WebGL、DOM、Lottie、Pixi、Three.js 和 headless 后端。

## 已知限制

- MP4 是主要输出格式。
- AVC/H.264 是默认编码器；HEVC 取决于本地浏览器支持。
- 浏览器端 ESM 依赖目前通过固定 CDN URL 加载。
- 大型渲染仍会先把编码视频以 base64 从浏览器传回 Node。
