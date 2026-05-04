# Product Showcase Example

[Chinese](README.zh.md)

A premium SaaS launch-film example for ui2v. It is designed as a copy-and-remix
starting point for founders, AI agents, and devtool teams that want a polished
product announcement video from one JSON file.

The scene uses one custom-code Canvas layer to draw cinematic lighting, a glass
product dashboard, animated metrics, a JSON -> Runtime -> Canvas -> WebCodecs ->
MP4 workflow, and a final launch CTA.

## Files

- `animation.json`: 9-second 1920x1080 product launch video at 30fps

## Why This Example Matters

- Looks like a real launch asset, not only a renderer smoke test
- Easy to customize by replacing product name, copy, metrics, and colors
- Demonstrates UI storytelling, animated dashboards, metric cards, and CTA pacing
- Works well as a README GIF, npm package preview, or social launch clip

## Render

From the repository root:

```bash
ui2v validate examples/product-showcase/animation.json --verbose
ui2v preview examples/product-showcase/animation.json --pixel-ratio 2
ui2v render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high
```

## README Preview Asset

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/product-showcase.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/product-showcase.gif
```
