# Kitchen Sink Gallery 示例

这是一个 24 秒的能力展厅示例，用更清晰的分镜替代之前过长、过杂的压力测试动画。它展示了字体动效、仪表盘图表、系统编排和导出流程，同时保持画面可读。

## 文件

- `animation.json`: 24 秒、1920x1080、30fps 的 gallery 动画

## 使用方式

在仓库根目录运行：

```bash
ui2v validate examples/kitchen-sink/animation.json --verbose
ui2v preview examples/kitchen-sink/animation.json --pixel-ratio 2
ui2v render examples/kitchen-sink/animation.json -o .tmp/kitchen-sink-gallery.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/kitchen-sink/animation.json --verbose
node packages/cli/dist/cli.js preview examples/kitchen-sink/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/kitchen-sink/animation.json -o .tmp/kitchen-sink-gallery.mp4 --quality high
```
