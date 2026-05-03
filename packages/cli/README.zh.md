# @ui2v/cli

[English](README.md)

用于校验、预览、检查和渲染 ui2v 动画 JSON 项目的命令行入口。

多数用户建议安装短包名：

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
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

不全局安装也可以运行：

```bash
npx ui2v --version
npx ui2v render examples/logo-reveal/animation.json -o logo-reveal.mp4 --quality high
```

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

`render` 当前主要输出 MP4。AVC/H.264 是默认编码器。只有本地浏览器支持时，才可以请求 HEVC。

## 本地开发

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
```

如果找不到浏览器，可以安装 Chrome 或 Edge，设置 `PUPPETEER_EXECUTABLE_PATH`，或者运行：

```bash
npx puppeteer browsers install chrome
```

## 许可

MIT
