# ui2v 示例

[English](README.md)

这个目录是 ui2v 的实践展示区。每个维护中的示例都应该满足：

- 第一眼能看懂画面效果
- JSON 可以被本地 CLI 校验和渲染
- 可以作为 AI 生成 ui2v 项目的参考
- 真实使用渲染器或第三方库，而不是只写依赖名、不改变画面

在本地 Preview Studio 中浏览示例：

```bash
node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1
```

## 效果地图

| 示例 | 你应该看到什么 | 真实 API / 渲染路径 | 预览 |
| --- | --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.zh.md) | 带光效、文字、渐变和运动的精致发布卡。 | Canvas 2D custom-code | `node packages/cli/dist/cli.js preview examples/basic-smoke/animation.json --pixel-ratio 1` |
| [`access-media`](access-media/README.zh.md) | 图片面板、插入视频、动态波形和导出音轨。 | `image-layer`、`video-layer`、`audio-layer`、`audio.tracks` | `node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1` |
| [`library-timeline`](library-timeline/README.zh.md) | 多镜头库能力展示，每个时间段都有明确视觉任务。 | GSAP/SplitType、D3/math、THREE/postprocessing、Matter/simplex/Iconify | `node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 1` |
| [`runtime-storyboard`](runtime-storyboard/README.zh.md) | 带转场、相机 metadata 和可检查帧的分段故事。 | Runtime Core adapter 和 timeline segments | `node packages/cli/dist/cli.js preview examples/runtime-storyboard/animation.json --pixel-ratio 1` |
| [`pixi-signal`](pixi-signal/README.zh.md) | 救援雷达：粒子、扫描光束、扩散环和信号节点。 | PixiJS Graphics、containers、canvas 合成 | `node packages/cli/dist/cli.js preview examples/pixi-signal/animation.json --pixel-ratio 1` |
| [`paper-route`](paper-route/README.zh.md) | 平滑矢量路线、检查点和移动点。 | Paper.js paths、groups、symbols、smoothing | `node packages/cli/dist/cli.js preview examples/paper-route/animation.json --pixel-ratio 1` |
| [`konva-launch-board`](konva-launch-board/README.zh.md) | 由对象节点搭建的产品发布板。 | Konva Stage、Layer、Group、Rect、Text、Circle | `node packages/cli/dist/cli.js preview examples/konva-launch-board/animation.json --pixel-ratio 1` |
| [`anime-motion-rig`](anime-motion-rig/README.zh.md) | anime.js 驱动的轨道、展开、发光、倾斜和缩放。 | anime.js timeline/animate | `node packages/cli/dist/cli.js preview examples/anime-motion-rig/animation.json --pixel-ratio 1` |
| [`tween-control-room`](tween-control-room/README.zh.md) | 带 easing、repeat 和 yoyo 的控制室仪表盘。 | TWEEN.js Group/Tween/easing | `node packages/cli/dist/cli.js preview examples/tween-control-room/animation.json --pixel-ratio 1` |
| [`particles-aurora`](particles-aurora/README.zh.md) | 实时粒子引擎合成出的极光。 | tsParticles engine canvas | `node packages/cli/dist/cli.js preview examples/particles-aurora/animation.json --pixel-ratio 1` |
| [`lottie-status-pack`](lottie-status-pack/README.zh.md) | 每帧 seek 的 Lottie 状态卡。 | lottie-web animationData | `node packages/cli/dist/cli.js preview examples/lottie-status-pack/animation.json --pixel-ratio 1` |
| [`p5-flow-garden`](p5-flow-garden/README.zh.md) | 生成式花园、流线、花瓣和动态光场。 | p5.js drawing loop | `node packages/cli/dist/cli.js preview examples/p5-flow-garden/animation.json --pixel-ratio 1` |
| [`fabric-poster-lab`](fabric-poster-lab/README.zh.md) | 由可编辑对象和渐变组成的动态海报。 | Fabric.js StaticCanvas、groups、gradients | `node packages/cli/dist/cli.js preview examples/fabric-poster-lab/animation.json --pixel-ratio 1` |
| [`cannon-cargo-drop`](cannon-cargo-drop/README.zh.md) | 刚体物理驱动的仓库货箱下落。 | cannon-es physics world | `node packages/cli/dist/cli.js preview examples/cannon-cargo-drop/animation.json --pixel-ratio 1` |
| [`type-systems-map`](type-systems-map/README.zh.md) | 带公式、图标和字形轮廓的技术信息图。 | KaTeX、Iconify、opentype.js | `node packages/cli/dist/cli.js preview examples/type-systems-map/animation.json --pixel-ratio 1` |

## 推荐浏览顺序

如果想快速评估 ui2v，建议先看这四个：

1. `access-media`：验证图片、视频、音频、波形和 mux。
2. `library-timeline`：展示多个浏览器/npm 库如何分别负责时间线片段。
3. `runtime-storyboard`：展示 Runtime Core 的分段编排和检查能力。
4. `type-systems-map`：证明公式、图标、字体和字形轮廓能在同一个合成中工作。

## 全部校验

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
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
```

也可以使用发布检查：

```bash
node scripts/validate-examples.mjs
```

## 全部渲染

```bash
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
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
```

## 编写建议

- 项目自己的媒体放在 JSON 旁边的 `access/` 目录。
- 尽量填写 `title` 和 `description`，Preview Studio 会展示它们。
- 多库视频要按视觉节拍拆时间线。
- custom-code 尽量只依赖 `time`、`progress` 和固定种子的随机数，保证可复现。
- 需要分段、转场、相机 metadata 时，以 `runtime-storyboard` 作为参考。
