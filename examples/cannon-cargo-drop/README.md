# CANNON Cargo Drop

A warehouse cargo scene where `cannon-es` updates real rigid-body positions. The canvas renderer follows `World.step`, `Body`, `Box`, and `Plane` simulation data every frame.

## Preview

```bash
node packages/cli/dist/cli.js preview examples/cannon-cargo-drop/animation.json --pixel-ratio 1
```

## Render

```bash
node packages/cli/dist/cli.js render examples/cannon-cargo-drop/animation.json -o .tmp/examples/cannon-cargo-drop.mp4 --quality high
```

