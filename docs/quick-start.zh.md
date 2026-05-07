# 快速开始

[English](quick-start.md)

这篇文档会带你用已发布的 CLI 或本地 workspace 构建，把 ui2v JSON 项目渲染成视频。

## 环境要求

- Node.js 18 或更新版本
- 本地 workspace 开发需要 Bun 1.0 或更新版本
- 本机已安装 Chrome、Edge 或 Chromium

主渲染链路使用 `puppeteer-core`、本机 Chrome/Edge/Chromium、Canvas 和 WebCodecs；不会下载内置 Chromium，也不需要 Electron、FFmpeg 或 `node-canvas`。

## 使用已发布 CLI

安装 `@ui2v/cli` 这个带作用域的 CLI 包，它在安装后仍然提供 `ui2v` 命令。

```bash
npm install -g @ui2v/cli
# or: bun install -g @ui2v/cli
ui2v doctor
ui2v validate examples/library-timeline/animation.json --verbose
ui2v preview examples/library-timeline/animation.json --pixel-ratio 2
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

也可以不全局安装：

```bash
npx @ui2v/cli --version
npx @ui2v/cli render examples/library-timeline/animation.json -o library-timeline.mp4 --quality high
```

## 使用本地 Workspace

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

安装依赖时不会下载内置浏览器。ui2v 通过 `puppeteer-core` 使用本机 Chrome、Edge 或 Chromium。

## 浏览器配置

如果 `doctor` 找不到浏览器，可以安装 Chrome/Edge/Chromium，或设置 `PUPPETEER_EXECUTABLE_PATH`、`CHROME_PATH`、`CHROMIUM_PATH`、`EDGE_PATH`。

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome ui2v doctor
```

Windows PowerShell：

```powershell
$env:PUPPETEER_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; ui2v doctor
```

## 常用渲染选项

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --width 1920 --height 1080 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
ui2v preview animation.json --pixel-ratio 2
```

`--render-scale` 会在编码前进行超采样。例如 `--width 1920 --height 1080 --render-scale 2` 会以 3840x2160 内部尺寸渲染，再降采样到 1920x1080。

## 选择一个示例

- 从 [`examples/library-timeline`](../examples/library-timeline/README.zh.md) 开始，它展示按时间线真实应用多个浏览器/npm 库。
- 用 [`examples/access-media`](../examples/access-media/README.zh.md) 测试本地图片、视频、音频波形和导出 MP4 音轨。
- 用 [`examples/runtime-storyboard`](../examples/runtime-storyboard/README.zh.md) 检查 runtime segments、转场、相机 metadata 和 inspect-runtime。
- 只需要最小环境检查时，使用 [`examples/basic-smoke`](../examples/basic-smoke/README.zh.md)。

## 下一步

- [入门指南](getting-started.zh.md)
- [架构](architecture.zh.md)
- [Runtime Core](runtime-core.zh.md)
- [CLI 参考](../packages/cli/README.zh.md)
