# 入门指南

[English](getting-started.md)

ui2v 会通过真实浏览器渲染结构化动画 JSON。本说明介绍基本工作流、项目结构和常见排查方式。

## 工作流

1. 编写或生成 `animation.json` 项目。
2. 使用 `ui2v validate` 校验。
3. 使用 `ui2v preview` 在浏览器中预览。
4. 使用 `ui2v render` 渲染 MP4。
5. 调试时使用 `ui2v inspect-runtime` 检查时间线状态。

## 最小项目

```json
{
  "id": "basic-text",
  "mode": "template",
  "duration": 2,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "template": {
    "layers": [
      {
        "id": "text-layer",
        "type": "custom-code",
        "startTime": 0,
        "endTime": 2,
        "properties": {
          "code": "function createRenderer() { return { render(t, context) { const ctx = context.mainContext; ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, context.width, context.height); ctx.fillStyle = '#fff'; ctx.fillText('ui2v', 40, 80); } }; }"
        }
      }
    ]
  }
}
```

`custom-code` 图层可以暴露 `createRenderer()`、单独的 render 函数、带 `render` 方法的对象，或运行时支持的模块/类形态。

## 校验

```bash
ui2v validate animation.json --verbose
```

校验会在浏览器渲染器启动前检查项目顶层结构、时间、分辨率和图层结构。

## 预览

```bash
ui2v preview animation.json --pixel-ratio 2
```

预览页面包含播放、暂停、重播、拖动进度条，并可按 `d` 切换调试面板。

## 渲染

```bash
ui2v render animation.json -o output.mp4 --quality high --codec avc
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --render-scale 2
```

默认生产输出是 AVC/H.264 编码的 MP4。只有本地浏览器支持时才可以请求 HEVC。

## 检查 Runtime

```bash
ui2v inspect-runtime animation.json --time 0 --time 1 --json
```

检查命令会输出归一化 composition、采样帧状态、依赖信息、路由元数据和绘制命令摘要。

## 排查

优先运行 `ui2v doctor`。多数环境问题来自浏览器发现、WebCodecs 支持或编码器协商。

ui2v 使用 `puppeteer-core`，安装依赖时不会下载内置 Chromium。如果 `doctor` 找不到浏览器，请安装 Chrome/Edge/Chromium，或设置 `PUPPETEER_EXECUTABLE_PATH`、`CHROME_PATH`、`CHROMIUM_PATH`、`EDGE_PATH`。

## 相关文档

- [快速开始](quick-start.zh.md)
- [架构](architecture.zh.md)
- [Runtime Core](runtime-core.zh.md)
- [路线图](roadmap.zh.md)