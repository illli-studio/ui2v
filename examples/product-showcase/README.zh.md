# Product Showcase 示例

[English](README.md)

这是一个产品发布片风格的 ui2v 示例。它用一个 custom-code Canvas 图层完成多层背景、设备框、标题文案、指标卡片、CTA 区域和 JSON -> Canvas -> MP4 流程标签。

## 文件

- `animation.json`: 9 秒、1920x1080、30fps 的产品展示动画

## 特性

- 带设备框的产品主视觉
- 按时间线入场的标题、副标题、指标和 CTA
- 解释 JSON -> Canvas -> MP4 的流程标签
- 适合成片输出的 1080p 画布

## 使用方式

在仓库根目录运行：

```bash
ui2v validate examples/product-showcase/animation.json --verbose
ui2v preview examples/product-showcase/animation.json --pixel-ratio 2
ui2v render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```
