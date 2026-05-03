# Render Lab 旗舰示例

[English](README.md)

这是一个 1920x1080 的旗舰演示，用来展示 ui2v 的价值：结构化 JSON 驱动高分辨率视频，包含粒子、数据可视化、伪 3D 深度、运行时流程图形和导出进度。

## 展示内容

- 多场景确定性时间线
- 由 Canvas 指令绘制的数据可视化
- 不依赖外部素材的粒子和深度效果
- 预览、检查、渲染工作流提示
- 适合压测渲染器的较长示例

## 使用方式

在仓库根目录运行：

```bash
ui2v validate examples/render-lab/animation.json --verbose
ui2v preview examples/render-lab/animation.json --pixel-ratio 2
ui2v render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```
