# p5 Flow Garden

A generative garden scene where `p5` owns the visible image: `noise`, `curveVertex`, `ellipse`, seeded randomness, and the offscreen p5 canvas are composited back into ui2v.

## Preview

```bash
node packages/cli/dist/cli.js preview examples/p5-flow-garden/animation.json --pixel-ratio 1
```

## Render

```bash
node packages/cli/dist/cli.js render examples/p5-flow-garden/animation.json -o .tmp/examples/p5-flow-garden.mp4 --quality high
```

