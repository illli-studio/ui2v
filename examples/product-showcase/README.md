# Product Showcase Example

[Chinese](README.zh.md)

A launch-film style ui2v example for product videos. It demonstrates layered
background drawing, animated device framing, timeline-driven copy, metric
cards, and a CTA area, all rendered from one custom-code Canvas layer.

## Files

- `animation.json`: 9-second 1920x1080 product showcase at 30fps

## Features

- Product hero composition with a device-like frame
- Timed title, subtitle, metrics, and CTA motion
- Pipeline labels that explain JSON -> Canvas -> MP4
- Production-friendly 1080p output

## Usage

From the repository root:

```bash
ui2v validate examples/product-showcase/animation.json --verbose
ui2v preview examples/product-showcase/animation.json --pixel-ratio 2
ui2v render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```
