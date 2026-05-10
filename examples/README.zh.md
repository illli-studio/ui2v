# ui2v 示例

[English](README.md)

旧的实验性 examples 已经移除。这个目录现在只保留少量维护版示例，目标是稳定、可检查、好看，并且能作为 AI 生成 ui2v 项目的参考。这些示例展示真实渲染能力，不只是解析器覆盖。

| 示例 | 用途 | 渲染命令 |
| --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.zh.md) | 精致 Canvas 品牌开场，同时也是最小端到端烟测。 | `node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`library-timeline`](library-timeline/README.zh.md) | 按时间线展示真实库渲染：GSAP 运动、D3 几何、THREE WebGL、Matter 物理和 rough 手绘笔触。 | `node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`pixi-signal`](pixi-signal/README.zh.md) | PIXI 救援扫描故事，使用真实 PixiJS Graphics 粒子、光束、节点和扫描环。 | `node packages/cli/dist/cli.js render examples/pixi-signal/animation.json -o .tmp/examples/pixi-signal.mp4 --quality high` |
| [`paper-route`](paper-route/README.zh.md) | Paper.js 路线规划故事，使用真实矢量平滑和路径移动。 | `node packages/cli/dist/cli.js render examples/paper-route/animation.json -o .tmp/examples/paper-route.mp4 --quality high` |
| [`konva-launch-board`](konva-launch-board/README.zh.md) | Konva 产品故事板，由真实 Stage、Layer、Group、Rect、Text、Circle 节点组装。 | `node packages/cli/dist/cli.js render examples/konva-launch-board/animation.json -o .tmp/examples/konva-launch-board.mp4 --quality high` |
| [`anime-motion-rig`](anime-motion-rig/README.zh.md) | anime.js 主角运动绑定例子，由 timeline/animate 状态驱动轨道、展开、发光、倾斜和缩放。 | `node packages/cli/dist/cli.js render examples/anime-motion-rig/animation.json -o .tmp/examples/anime-motion-rig.mp4 --quality high` |
| [`tween-control-room`](tween-control-room/README.zh.md) | TWEEN.js 仪表盘，Group/Tween/easing/repeat/yoyo 在绘制前更新仪表状态。 | `node packages/cli/dist/cli.js render examples/tween-control-room/animation.json -o .tmp/examples/tween-control-room.mp4 --quality high` |
| [`particles-aurora`](particles-aurora/README.zh.md) | tsParticles 极光，初始化真实粒子引擎并合成它的实时 canvas。 | `node packages/cli/dist/cli.js render examples/particles-aurora/animation.json -o .tmp/examples/particles-aurora.mp4 --quality high` |
| [`lottie-status-pack`](lottie-status-pack/README.zh.md) | lottie-web 状态卡片，加载生成的 animationData 并逐帧 seek。 | `node packages/cli/dist/cli.js render examples/lottie-status-pack/animation.json -o .tmp/examples/lottie-status-pack.mp4 --quality high` |
| [`p5-flow-garden`](p5-flow-garden/README.zh.md) | p5.js 生成式花园，真实绘制噪声路径、花瓣和动态光场。 | `node packages/cli/dist/cli.js render examples/p5-flow-garden/animation.json -o .tmp/examples/p5-flow-garden.mp4 --quality high` |
| [`fabric-poster-lab`](fabric-poster-lab/README.zh.md) | Fabric.js 动态海报板，使用 StaticCanvas、Group、形状、文字、渐变和对象 transform。 | `node packages/cli/dist/cli.js render examples/fabric-poster-lab/animation.json -o .tmp/examples/fabric-poster-lab.mp4 --quality high` |
| [`cannon-cargo-drop`](cannon-cargo-drop/README.zh.md) | cannon-es 仓库货箱下落场景，真实物理刚体更新后再由 Canvas 绘制。 | `node packages/cli/dist/cli.js render examples/cannon-cargo-drop/animation.json -o .tmp/examples/cannon-cargo-drop.mp4 --quality high` |
| [`type-systems-map`](type-systems-map/README.zh.md) | 字体/公式信息图，使用 KaTeX、Iconify、opentype.js 展示公式、图标和字形矢量节拍。 | `node packages/cli/dist/cli.js render examples/type-systems-map/animation.json -o .tmp/examples/type-systems-map.mp4 --quality high` |
| [`access-media`](access-media/README.zh.md) | 本地 `access/` 资源：图片、插入视频、音频波形层和 muxed AAC 音轨。 | `node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`runtime-storyboard`](runtime-storyboard/README.zh.md) | runtime-core 分镜，包含 segments、转场、相机 metadata 和 inspect-runtime。 | `node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## 验证

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js validate examples/pixi-signal/animation.json --verbose
node packages/cli/dist/cli.js validate examples/paper-route/animation.json --verbose
node packages/cli/dist/cli.js validate examples/konva-launch-board/animation.json --verbose
node packages/cli/dist/cli.js validate examples/anime-motion-rig/animation.json --verbose
node packages/cli/dist/cli.js validate examples/tween-control-room/animation.json --verbose
node packages/cli/dist/cli.js validate examples/particles-aurora/animation.json --verbose
node packages/cli/dist/cli.js validate examples/lottie-status-pack/animation.json --verbose
node packages/cli/dist/cli.js validate examples/p5-flow-garden/animation.json --verbose
node packages/cli/dist/cli.js validate examples/fabric-poster-lab/animation.json --verbose
node packages/cli/dist/cli.js validate examples/cannon-cargo-drop/animation.json --verbose
node packages/cli/dist/cli.js validate examples/type-systems-map/animation.json --verbose
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
```

## 全部渲染

```bash
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
node packages/cli/dist/cli.js render examples/pixi-signal/animation.json -o .tmp/examples/pixi-signal.mp4 --quality high
node packages/cli/dist/cli.js render examples/paper-route/animation.json -o .tmp/examples/paper-route.mp4 --quality high
node packages/cli/dist/cli.js render examples/konva-launch-board/animation.json -o .tmp/examples/konva-launch-board.mp4 --quality high
node packages/cli/dist/cli.js render examples/anime-motion-rig/animation.json -o .tmp/examples/anime-motion-rig.mp4 --quality high
node packages/cli/dist/cli.js render examples/tween-control-room/animation.json -o .tmp/examples/tween-control-room.mp4 --quality high
node packages/cli/dist/cli.js render examples/particles-aurora/animation.json -o .tmp/examples/particles-aurora.mp4 --quality high
node packages/cli/dist/cli.js render examples/lottie-status-pack/animation.json -o .tmp/examples/lottie-status-pack.mp4 --quality high
node packages/cli/dist/cli.js render examples/p5-flow-garden/animation.json -o .tmp/examples/p5-flow-garden.mp4 --quality high
node packages/cli/dist/cli.js render examples/fabric-poster-lab/animation.json -o .tmp/examples/fabric-poster-lab.mp4 --quality high
node packages/cli/dist/cli.js render examples/cannon-cargo-drop/animation.json -o .tmp/examples/cannon-cargo-drop.mp4 --quality high
node packages/cli/dist/cli.js render examples/type-systems-map/animation.json -o .tmp/examples/type-systems-map.mp4 --quality high
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
```
