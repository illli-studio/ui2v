# Real Library Timeline

[中文](README.zh.md)

Maintained real-library showcase. This example intentionally lists only
libraries that directly change pixels or motion in the exported canvas. It does
not claim coverage for libraries that are only queried, constructed, or used as
status text.

| Time | Library | Real use |
| --- | --- | --- |
| 0-2s | `gsap` | A paused `gsap.timeline` controls position, rotation, and glow before the canvas draw. |
| 2-4s | `d3` | `d3.scaleLinear`, `d3.line`, and `d3.area` generate the chart geometry drawn into the frame. |
| 4-6s | `THREE` | `THREE.WebGLRenderer` renders a real WebGL cube to an offscreen canvas, then composites it back. |
| 6-8s | `Matter` | `Matter.Engine.update` advances rigid bodies; the layer draws their simulated positions. |
| 8-10s | `rough` | `rough.canvas(mainCanvas)` draws hand-sketched rectangles, circles, and curves directly on the canvas. |

```bash
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```
