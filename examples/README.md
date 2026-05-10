# ui2v Examples

[中文](README.zh.md)

The old experimental examples have been removed. This folder now keeps only a
small maintained set that should stay polished, inspectable, and useful as AI
generation references. These examples are designed to show real renderer
capability, not only parser coverage.

| Example | Purpose | Render |
| --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.md) | Premium Canvas opener that still works as the smallest end-to-end smoke test. | `node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`library-timeline`](library-timeline/README.md) | Timeline-first real-library showcase: GSAP motion, D3 geometry, THREE WebGL, Matter physics, and rough canvas strokes. | `node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`pixi-signal`](pixi-signal/README.md) | PIXI rescue-sweep story with real PixiJS Graphics particles and scan rings. | `node packages/cli/dist/cli.js render examples/pixi-signal/animation.json -o .tmp/examples/pixi-signal.mp4 --quality high` |
| [`paper-route`](paper-route/README.md) | Paper.js route-planning story with real vector smoothing and path travel. | `node packages/cli/dist/cli.js render examples/paper-route/animation.json -o .tmp/examples/paper-route.mp4 --quality high` |
| [`konva-launch-board`](konva-launch-board/README.md) | Konva product-board story assembled from real Stage, Layer, Group, Rect, Text, and Circle nodes. | `node packages/cli/dist/cli.js render examples/konva-launch-board/animation.json -o .tmp/examples/konva-launch-board.mp4 --quality high` |
| [`anime-motion-rig`](anime-motion-rig/README.md) | anime.js-first motion rig where timeline/animate state drives orbit, spread, glow, tilt, and scale. | `node packages/cli/dist/cli.js render examples/anime-motion-rig/animation.json -o .tmp/examples/anime-motion-rig.mp4 --quality high` |
| [`tween-control-room`](tween-control-room/README.md) | TWEEN.js dashboard where Group/Tween/easing/repeat/yoyo update gauge states before drawing. | `node packages/cli/dist/cli.js render examples/tween-control-room/animation.json -o .tmp/examples/tween-control-room.mp4 --quality high` |
| [`particles-aurora`](particles-aurora/README.md) | tsParticles aurora that initializes the real particle engine and composites its live canvas. | `node packages/cli/dist/cli.js render examples/particles-aurora/animation.json -o .tmp/examples/particles-aurora.mp4 --quality high` |
| [`lottie-status-pack`](lottie-status-pack/README.md) | lottie-web status cards with generated animationData loaded and seeked each frame. | `node packages/cli/dist/cli.js render examples/lottie-status-pack/animation.json -o .tmp/examples/lottie-status-pack.mp4 --quality high` |
| [`p5-flow-garden`](p5-flow-garden/README.md) | Generative garden where p5.js draws noise paths, petals, and the animated light field. | `node packages/cli/dist/cli.js render examples/p5-flow-garden/animation.json -o .tmp/examples/p5-flow-garden.mp4 --quality high` |
| [`fabric-poster-lab`](fabric-poster-lab/README.md) | Kinetic poster board built from Fabric.js StaticCanvas, groups, shapes, text, gradients, and transforms. | `node packages/cli/dist/cli.js render examples/fabric-poster-lab/animation.json -o .tmp/examples/fabric-poster-lab.mp4 --quality high` |
| [`cannon-cargo-drop`](cannon-cargo-drop/README.md) | Warehouse cargo scene where cannon-es simulates falling rigid bodies before canvas renders them. | `node packages/cli/dist/cli.js render examples/cannon-cargo-drop/animation.json -o .tmp/examples/cannon-cargo-drop.mp4 --quality high` |
| [`type-systems-map`](type-systems-map/README.md) | Typography infographic using KaTeX, Iconify, and opentype.js for formula, icon, and vector-glyph beats. | `node packages/cli/dist/cli.js render examples/type-systems-map/animation.json -o .tmp/examples/type-systems-map.mp4 --quality high` |
| [`access-media`](access-media/README.md) | Local `access/` assets: image, inserted video, waveform layer, and muxed audio. | `node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`runtime-storyboard`](runtime-storyboard/README.md) | Runtime-core storyboard with segments, transitions, camera metadata, and inspect output. | `node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## Validate

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

## Render All

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
