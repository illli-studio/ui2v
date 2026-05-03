# Render Lab Flagship Example

[中文](README.zh.md)

A 1920x1080 flagship demo built to show why ui2v is useful: structured JSON
drives a high-resolution video with particles, data visualization, pseudo-3D
depth, runtime-style pipeline graphics, and export progress.

## What It Shows

- 1080p production canvas
- Multi-scene deterministic timeline
- Data visualization drawn from code
- Particle and depth effects without external assets
- Preview/inspect/render workflow messaging

## Usage

From the repository root with a local build:

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```
