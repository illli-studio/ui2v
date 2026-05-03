# Render Lab Flagship Example

[Chinese](README.zh.md)

A 1920x1080 flagship demo built to show why ui2v is useful: structured JSON
drives a high-resolution video with particles, data visualization, pseudo-3D
depth, runtime-style pipeline graphics, and export progress.

## What It Shows

- Multi-scene deterministic timeline
- Data visualization drawn from Canvas instructions
- Particle and depth effects without external assets
- Preview, inspect, and render workflow messaging
- A longer demo suitable for stress testing the renderer

## Usage

From the repository root:

```bash
ui2v validate examples/render-lab/animation.json --verbose
ui2v preview examples/render-lab/animation.json --pixel-ratio 2
ui2v render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```
