# Anime Motion Rig

An `anime.js`-first motion rig. The example uses the injected anime.js v4 timeline/animation API to update orbit, spread, glow, tilt, and scale state before the canvas frame is drawn.

## Preview

```bash
node packages/cli/dist/cli.js preview examples/anime-motion-rig/animation.json --pixel-ratio 1
```

## Render

```bash
node packages/cli/dist/cli.js render examples/anime-motion-rig/animation.json -o .tmp/examples/anime-motion-rig.mp4 --quality high
```

