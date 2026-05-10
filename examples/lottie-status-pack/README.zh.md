# Lottie Status Pack

一个状态卡片场景，通过 `lottie-web` 加载生成的 Lottie `animationData`，每帧 seek 动画状态，并把它作为视觉叙事的一部分。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/lottie-status-pack/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/lottie-status-pack/animation.json -o .tmp/examples/lottie-status-pack.mp4 --quality high
```

