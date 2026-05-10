# Lottie Status Pack

A status-card scene that loads generated Lottie `animationData` through `lottie-web`, seeks it every frame, and uses the live animation state as part of the visual story.

## Preview

```bash
node packages/cli/dist/cli.js preview examples/lottie-status-pack/animation.json --pixel-ratio 1
```

## Render

```bash
node packages/cli/dist/cli.js render examples/lottie-status-pack/animation.json -o .tmp/examples/lottie-status-pack.mp4 --quality high
```

