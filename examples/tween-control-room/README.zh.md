# TWEEN Control Room

一个仪表盘场景，`TWEEN.js` 真实负责数值状态。`TWEEN.Group`、`Tween`、easing、repeat、yoyo 会在每帧 canvas 绘制前更新仪表状态。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/tween-control-room/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/tween-control-room/animation.json -o .tmp/examples/tween-control-room.mp4 --quality high
```

