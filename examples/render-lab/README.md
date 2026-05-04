# Render Lab Demo Reel

[Chinese](README.zh.md)

A flagship capability reel for ui2v. This example is designed to show the engine
boundary rather than a single product use case: particles, data visualization,
pseudo-3D projection, camera-like depth, runtime HUD overlays, and the final
preview/inspect/render export workflow.

## What It Shows

- Four deterministic scenes over one 12-second timeline
- Particle fields and connected motion graphics without external assets
- Live data storytelling with bars, sparkline overlays, and insight cards
- Pseudo-3D depth using projection math in a Canvas custom-code layer
- Preview, inspect, render, and MP4 export messaging for developer workflows

## Render

From the repository root:

```bash
ui2v validate examples/render-lab/animation.json --verbose
ui2v preview examples/render-lab/animation.json --pixel-ratio 2
ui2v render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high
```

## README Preview Asset

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/render-lab.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/render-lab.gif
```
