# Render Lab Demo Reel

[English](README.md)

这是 ui2v 的旗舰能力展示示例。它不是单一产品场景，而是用来展示引擎边界：粒子、数据可视化、伪 3D 投影、类似相机的空间深度、runtime HUD 覆层，以及最终 preview / inspect / render 导出流程。

## 展示内容

- 一个 12 秒时间线里的四个确定性场景
- 不依赖外部素材的粒子场和连接动效
- 包含柱状图、sparkline 和 insight cards 的数据叙事
- 在 custom-code Canvas 图层中用投影数学实现伪 3D 深度
- 面向开发者工作流的 preview、inspect、render 和 MP4 export 信息

## 渲染

在仓库根目录运行：

```bash
ui2v validate examples/render-lab/animation.json --verbose
ui2v preview examples/render-lab/animation.json --pixel-ratio 2
ui2v render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high
```

## README 预览素材

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/render-lab.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/render-lab.gif
```
