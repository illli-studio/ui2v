# ui2v

[English](README.md)

ui2v 是一个面向结构化动画 JSON 的独立命令行渲染器。它通过 Puppeteer 启动
本地 Chromium 系浏览器，使用 ui2v Canvas 引擎渲染每一帧，通过 WebCodecs
编码 MP4，并由 Node.js 写入输出文件。

这个仓库包含开源渲染栈：CLI、运行时模型、浏览器渲染引擎、producer 管线、
示例和文档。它不是完整桌面应用源码。

## 可以做什么

- 在渲染前校验 ui2v 动画 JSON。
- 在本地浏览器中预览项目，支持播放、暂停和拖动进度。
- 从 template 和 custom-code 图层渲染 MP4。
- 检查归一化运行时状态、帧计划、依赖窗口、适配器路由和绘制命令摘要。
- 基于可复用 package 构建自己的工具或自动化流程。

## 环境要求

- Node.js 18 或更高版本
- 本地 workspace 开发需要 Bun 1.0 或更高版本
- Chrome、Edge、Chromium，或 Puppeteer 已安装的 Chromium

主渲染路径不需要 Electron、FFmpeg 或 `node-canvas`。

## 安装

安装已发布 CLI：

```bash
npm install -g @ui2v/cli
ui2v --version
```

不全局安装也可以运行：

```bash
npx @ui2v/cli --version
```

从当前 workspace 构建：

```bash
bun install
bun run build
```

如果 Puppeteer 下载浏览器失败，而你已经安装了 Chrome 或 Edge，可以跳过内置
浏览器下载：

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell：

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## 快速开始

```bash
ui2v doctor
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## 包结构

```text
@ui2v/core          类型、解析器、校验器和共享工具
@ui2v/runtime-core  场景图、时间线、帧计划、适配器和绘制命令
@ui2v/engine        浏览器 Canvas 渲染器和 WebCodecs 导出器
@ui2v/producer      基于 Puppeteer 的预览和 MP4 渲染管线
@ui2v/cli           安装为 ui2v 的命令行入口
```

## 渲染流程

```text
animation.json
  -> CLI 解析并校验输入
  -> producer 启动本地静态服务器
  -> Puppeteer 启动 Chrome、Edge 或 Chromium
  -> 浏览器加载 core/runtime/engine bundle
  -> runtime 从共享时间线计算帧状态
  -> engine 将帧渲染到 Canvas
  -> WebCodecs 在浏览器中编码 MP4
  -> producer 将视频文件写入磁盘
```

## 文档

- [快速开始](docs/quick-start.zh.md)
- [入门指南](docs/getting-started.zh.md)
- [架构](docs/architecture.zh.md)
- [Runtime Core](docs/runtime-core.zh.md)
- [路线图](docs/roadmap.zh.md)
- [渲染器说明](docs/ui2v-renderer-readme.zh.md)
- [开源渲染器预览](docs/open-source-preview-article.zh.md)

英文版本与各文档放在同一目录，根文档为 `README.md`。

## 开发

```bash
bun run build
bun run test
```

常用专项检查：

```bash
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
```

## 当前限制

- MP4 是主要生产输出格式。
- AVC/H.264 是默认编码器。只有本地浏览器支持时才可以请求 HEVC。
- 浏览器端 ESM 依赖目前通过 producer import map 中固定的 CDN URL 加载。
- 长视频或高分辨率视频目前会先以 base64 从浏览器传回 Node，再写入磁盘；
  实现简单，但对内存不够友好。

## 许可证

MIT
