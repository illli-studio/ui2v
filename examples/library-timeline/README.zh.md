# Real Library Timeline

[English](README.md)

维护版真实库示例。这个例子只声明会直接改变导出画面像素或运动的库，不再把只查询、只构造、只显示状态文字的库算作“已使用”。

| 时间 | 库 | 真实用途 |
| --- | --- | --- |
| 0-2s | `gsap` | 暂停的 `gsap.timeline` 控制位置、旋转和发光，再由 canvas 绘制出来。 |
| 2-4s | `d3` | `d3.scaleLinear`、`d3.line` 和 `d3.area` 生成图表几何路径。 |
| 4-6s | `THREE` | `THREE.WebGLRenderer` 真正渲染 WebGL 立方体到离屏 canvas，再合成回主画布。 |
| 6-8s | `Matter` | `Matter.Engine.update` 推进刚体世界，画面绘制真实模拟位置。 |
| 8-10s | `rough` | `rough.canvas(mainCanvas)` 直接在主画布上画手绘矩形、圆和曲线。 |

```bash
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```
