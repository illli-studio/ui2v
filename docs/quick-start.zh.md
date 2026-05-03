# 快速开始

[English](quick-start.md)

这篇文档会带你用已发布的 CLI 或本地 workspace 构建，把 ui2v JSON 项目渲染成视频。

## 环境要求

- Node.js 18 或更新版本
- 本地 workspace 开发需要 Bun 1.0 或更新版本
- Chrome、Edge、Chromium，或 Puppeteer 安装的 Chromium

主渲染链路使用 Puppeteer、Canvas 和 WebCodecs，不需要 Electron、FFmpeg 或 `node-canvas`。

## 使用已发布 CLI

短包名 `ui2v` 会安装命令，并依赖真正的实现包 `@ui2v/cli`。

```bash
npm install -g ui2v
# or: bun install -g ui2v
ui2v doctor
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

也可以不全局安装：

```bash
npx ui2v --version
npx ui2v render examples/logo-reveal/animation.json -o logo-reveal.mp4 --quality high
```

## 使用本地 Workspace

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/logo-reveal/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

如果安装时 Puppeteer 下载浏览器失败，而你已经安装了 Chrome 或 Edge，可以跳过内置浏览器下载：

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell：

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## 浏览器配置

如果 `doctor` 找不到浏览器，可以安装 Chrome 或 Edge，设置 `PUPPETEER_EXECUTABLE_PATH`，或安装 Puppeteer 浏览器：

```bash
npx puppeteer browsers install chrome
```

## 常用渲染参数

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
ui2v preview animation.json --pixel-ratio 2
```

`--render-scale` 会先以更高分辨率渲染，再缩放到目标尺寸编码。例如 `--width 1280 --height 720 --render-scale 2` 会先以 2560x1440 渲染，再输出 1280x720。

## 选择示例

- 从 [`examples/logo-reveal`](../examples/logo-reveal/README.zh.md) 开始，得到一个精美品牌开场。
- 用 [`examples/product-showcase`](../examples/product-showcase/README.zh.md) 作为产品发布视频结构。
- 用 [`examples/render-lab`](../examples/render-lab/README.zh.md) 压测数据、粒子和伪 3D 效果。
- 用 [`examples/basic-text`](../examples/basic-text/README.zh.md) 做最小环境检查。

## 下一步

- [入门指南](getting-started.zh.md)
- [架构](architecture.zh.md)
- [Runtime Core](runtime-core.zh.md)
- [CLI 参考](../packages/cli/README.zh.md)
