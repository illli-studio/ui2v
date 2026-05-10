# CANNON Cargo Drop

一个仓库货箱下落场景，`cannon-es` 真实更新刚体位置。Canvas 每帧根据 `World.step`、`Body`、`Box`、`Plane` 的模拟数据绘制货箱。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/cannon-cargo-drop/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/cannon-cargo-drop/animation.json -o .tmp/examples/cannon-cargo-drop.mp4 --quality high
```

