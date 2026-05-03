# 快速开始

[English](quick-start.md)

这篇文档帮助你通过已发布的 CLI 或本地 workspace 构建，把 ui2v JSON 项目
渲染成视频。

## 环境要求

- Node.js 18 或更高版本
- 本地 workspace 开发需要 Bun 1.0 或更高版本
- Chrome、Edge、Chromium，或 Puppeteer 已安装的 Chromium

主渲染路径使用 Puppeteer、Canvas 和 WebCodecs，不需要 Electron、FFmpeg 或
`node-canvas`。

## 使用已发布 CLI

```bash
npm install -g @ui2v/cli
ui2v doctor
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

不全局安装也可以运行：

```bash
npx @ui2v/cli --version
npx @ui2v/cli render animation.json -o output.mp4
```

## 使用本地 Workspace

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

如果安装时 Puppeteer 下载浏览器失败，而你已经安装了 Chrome 或 Edge，可以跳
过内置浏览器下载：

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell：

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## 浏览器配置

如果 `doctor` 找不到浏览器，可以安装 Chrome 或 Edge，设置
`PUPPETEER_EXECUTABLE_PATH`，或者安装 Puppeteer 浏览器：

```bash
npx puppeteer browsers install chrome
```

## 常用渲染参数

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

`--render-scale` 会先以更高分辨率渲染，再缩放到目标尺寸编码。例如
`--width 1280 --height 720 --render-scale 2` 会先以 2560x1440 渲染，再输
出 1280x720。

## 下一步

- [入门指南](getting-started.zh.md)
- [架构](architecture.zh.md)
- [Runtime Core](runtime-core.zh.md)
- [CLI 参考](../packages/cli/README.zh.md)
