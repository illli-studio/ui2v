# ui2v Examples

[中文](README.zh.md)

This folder is the practical gallery for ui2v. Every maintained example should be:

- visually understandable from the first preview
- valid JSON that can be rendered by the local CLI
- useful as an AI-generation reference
- backed by real renderer or library behavior, not a dependency list that never changes pixels

Run the gallery in the local Preview Studio:

```bash
node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1
```

## Effect Map

| Example | What You Should See | Real APIs / Renderer Path | Preview |
| --- | --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.md) | A polished launch card with glow, type, gradients, and motion. | Canvas 2D custom-code | `node packages/cli/dist/cli.js preview examples/basic-smoke/animation.json --pixel-ratio 1` |
| [`access-media`](access-media/README.md) | Image panel, inserted video, animated waveform, and exported audio. | `image-layer`, `video-layer`, `audio-layer`, `audio.tracks` | `node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1` |
| [`library-timeline`](library-timeline/README.md) | A multi-shot library showcase where each time segment has a visible job. | GSAP/SplitType, D3/math, THREE/postprocessing, Matter/simplex/Iconify | `node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 1` |
| [`runtime-storyboard`](runtime-storyboard/README.md) | Segmented runtime story with transitions, camera metadata, and inspectable frames. | Runtime Core adapter and timeline segments | `node packages/cli/dist/cli.js preview examples/runtime-storyboard/animation.json --pixel-ratio 1` |
| [`pixi-signal`](pixi-signal/README.md) | Radar rescue scene with particles, sweep beams, scan rings, and signal nodes. | PixiJS Graphics, containers, canvas compositing | `node packages/cli/dist/cli.js preview examples/pixi-signal/animation.json --pixel-ratio 1` |
| [`paper-route`](paper-route/README.md) | Delivery route with smoothed vector paths, checkpoints, and a moving point. | Paper.js paths, groups, symbols, smoothing | `node packages/cli/dist/cli.js preview examples/paper-route/animation.json --pixel-ratio 1` |
| [`konva-launch-board`](konva-launch-board/README.md) | Product board assembled from object nodes and animated panel states. | Konva Stage, Layer, Group, Rect, Text, Circle | `node packages/cli/dist/cli.js preview examples/konva-launch-board/animation.json --pixel-ratio 1` |
| [`anime-motion-rig`](anime-motion-rig/README.md) | Orbit, spread, glow, tilt, and scale states driven by anime.js. | anime.js timeline/animate | `node packages/cli/dist/cli.js preview examples/anime-motion-rig/animation.json --pixel-ratio 1` |
| [`tween-control-room`](tween-control-room/README.md) | Control-room gauges and cards with easing, repeat, and yoyo motion. | TWEEN.js Group/Tween/easing | `node packages/cli/dist/cli.js preview examples/tween-control-room/animation.json --pixel-ratio 1` |
| [`particles-aurora`](particles-aurora/README.md) | Aurora-like live particle field composited into the scene. | tsParticles engine canvas | `node packages/cli/dist/cli.js preview examples/particles-aurora/animation.json --pixel-ratio 1` |
| [`lottie-status-pack`](lottie-status-pack/README.md) | Generated status cards with frame-accurate Lottie seeking. | lottie-web animationData | `node packages/cli/dist/cli.js preview examples/lottie-status-pack/animation.json --pixel-ratio 1` |
| [`p5-flow-garden`](p5-flow-garden/README.md) | Generative garden, flow lines, petals, and light field. | p5.js drawing loop | `node packages/cli/dist/cli.js preview examples/p5-flow-garden/animation.json --pixel-ratio 1` |
| [`fabric-poster-lab`](fabric-poster-lab/README.md) | Kinetic poster built from editable object primitives and gradients. | Fabric.js StaticCanvas, groups, gradients | `node packages/cli/dist/cli.js preview examples/fabric-poster-lab/animation.json --pixel-ratio 1` |
| [`cannon-cargo-drop`](cannon-cargo-drop/README.md) | Warehouse cargo falling under rigid-body physics. | cannon-es physics world | `node packages/cli/dist/cli.js preview examples/cannon-cargo-drop/animation.json --pixel-ratio 1` |
| [`type-systems-map`](type-systems-map/README.md) | Technical type-system map with formulas, icons, and glyph outlines. | KaTeX, Iconify, opentype.js | `node packages/cli/dist/cli.js preview examples/type-systems-map/animation.json --pixel-ratio 1` |

## Suggested Tour

Start with these four if you are evaluating ui2v quickly:

1. `access-media`: verifies image, video, audio, waveform, and muxing.
2. `library-timeline`: shows how multiple browser/npm libraries can own separate timeline beats.
3. `runtime-storyboard`: shows segmented Runtime Core authoring and inspection.
4. `type-systems-map`: proves typography/formula/icon/glyph rendering works in one composition.

## Validate All

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

Or use the release check:

```bash
node scripts/validate-examples.mjs
```

## Render All

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

## Authoring Notes

- Put project-owned media beside the JSON in `access/`.
- Prefer explicit `title` and `description` metadata; Preview Studio shows them.
- For multi-library clips, split the timeline by visual beat.
- Keep custom code deterministic from `time`, `progress`, and seeded randomness.
- Use `runtime-storyboard` as the reference when you need segments, transitions, and camera metadata.
