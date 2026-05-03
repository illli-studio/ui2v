# Basic Text 示例

[English](README.md)

这是一个用于快速检查环境的 ui2v 项目。它用 custom-code Canvas 图层渲染 4 秒 1080p 字幕动效，包含动态卡片、扫描线和时间线进度条。

如果你只是想确认校验、预览、浏览器渲染和 MP4 导出是否正常，可以先跑这个示例。

## 文件

- `animation.json`: 5 秒、1920x1080、30fps 的动画项目

## 使用方式

在当前目录运行：

```bash
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v render animation.json -o output.mp4
```

在仓库根目录使用已发布 CLI：

```bash
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json --pixel-ratio 2
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

在仓库根目录使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```
