# @ui2v/cli

[English](README.md)

用于校验、预览、检查和渲染 ui2v 动画 JSON 项目的命令行入口。

大多数用户建议安装短包名：

```bash
npm install -g ui2v
# or: bun install -g ui2v
ui2v --version
```

也可以直接安装实现包：

```bash
npm install -g @ui2v/cli
```

## 第一次渲染

```bash
ui2v doctor
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

不全局安装也可以运行：

```bash
npx ui2v --version
npx ui2v render animation.json -o output.mp4 --quality high
```

`preview` 会打开本地 Studio UI，左侧可浏览 JSON 项目，支持播放、拖动、播放速度、适配/剧场/全屏模式、runtime debug overlay、当前帧 PNG 快照、复制 CLI 渲染命令和 Export MP4。

## 命令

```bash
ui2v doctor
ui2v init my-video
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v inspect-runtime animation.json --time 0 --time 1
ui2v render animation.json -o output.mp4
ui2v info
```

## 渲染参数

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

`render` 当前主要输出 MP4。AVC/H.264 是默认编码器；只有本机浏览器支持时，才能请求 HEVC。

## 本地浏览器要求

ui2v 使用 `puppeteer-core`，不会下载内置 Chromium。请先本地安装 Chrome、Edge 或 Chromium。如果自动检测失败，可以设置：

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome node packages/cli/dist/cli.js doctor
CHROME_PATH=/path/to/chrome node packages/cli/dist/cli.js doctor
CHROMIUM_PATH=/path/to/chromium node packages/cli/dist/cli.js doctor
EDGE_PATH=/path/to/edge node packages/cli/dist/cli.js doctor
```

## 本地开发

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
```

## 许可

MIT
