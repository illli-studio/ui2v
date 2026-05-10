# p5 Flow Garden

一个生成式花园画面，`p5` 真实负责可见图像：`noise`、`curveVertex`、`ellipse`、固定随机种子，以及离屏 p5 canvas 合成回 ui2v 主画布。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/p5-flow-garden/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/p5-flow-garden/animation.json -o .tmp/examples/p5-flow-garden.mp4 --quality high
```

