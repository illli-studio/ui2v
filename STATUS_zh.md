# ui2v 状态

[English](STATUS.md)

## 当前状态

ui2v 是一个用于结构化动画 JSON 的独立 CLI 渲染器。它通过 `puppeteer-core` 控制本机已安装的 Chrome、Edge 或 Chromium，使用 ui2v Canvas 引擎渲染，通过 WebCodecs 编码 MP4，并由 Node.js 写出结果文件。

主路径不会下载内置 Chromium，也不需要 Electron、FFmpeg、WebGPU 或 `node-canvas`。

## 已完成

- Bun workspace monorepo。
- `@ui2v/core` 项目类型、解析器、校验器和共享工具。
- `@ui2v/runtime-core` 场景图、时间线、帧计划、依赖元数据、适配器路由和绘制命令。
- `@ui2v/engine` 浏览器 Canvas 渲染器、template adapter、custom-code runtime、canvas command executor 和 WebCodecs exporter。
- `@ui2v/producer` 基于本机浏览器的预览和 MP4 渲染管线，并带浏览器发现逻辑。
- `@ui2v/cli` 命令：`doctor`、`init`、`validate`、`preview`、`render`、`inspect-runtime` 和 `info`。
- 更有吸引力的 README showcase 示例和 GIF 预览资源。
- 仓库本地 Codex skills：示例创建、runtime-core 编写、渲染验证和渲染能力说明。
- 示例校验、CLI smoke tests、包元数据检查和 package pack 检查。
- workspace packages 的 MIT 许可元数据。

## 本地验证

当前 workspace 已通过：

```bash
bun run build
bun run test:metadata
bun run test:pack
bun run test:examples
bun run test:validate
bun run test:init
```

完整 smoke 检查可以运行：

```bash
bun run test
```

## 已知限制

- MP4 是主要生产输出格式。
- AVC/H.264 是默认编码器。只有本机浏览器支持时才可以请求 HEVC。
- 浏览器端 ESM 依赖目前通过固定 CDN URL 加载。
- 长视频或高分辨率渲染仍会先以 base64 从浏览器传回 Node，再写入磁盘。
- engine 包仍保留部分旧集成路径的兼容导出。

## 下一步优先级

1. 为浏览器端依赖增加离线/vendor 模式。
2. 将浏览器到 Node 的 base64 传输替换为流式或分块输出。
3. 继续增加 AI 应用、dashboard、devtool、金融、社交广告等垂直场景的高质量示例。
4. 让 preview、render、inspect、README assets 和 skills 始终沿用同一套 runtime/render 工作流。