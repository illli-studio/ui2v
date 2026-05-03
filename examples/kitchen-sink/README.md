# Kitchen Sink Gallery Example

A curated 24-second showcase that replaces the older long stress animation
with a cleaner capability tour. It demonstrates typography, dashboard charts,
system orchestration, and export workflow scenes without overwhelming the
viewer.

## Files

- `animation.json`: 24-second 1920x1080 gallery animation at 30fps

## Usage

From the repository root:

```bash
ui2v validate examples/kitchen-sink/animation.json --verbose
ui2v preview examples/kitchen-sink/animation.json --pixel-ratio 2
ui2v render examples/kitchen-sink/animation.json -o .tmp/kitchen-sink-gallery.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/kitchen-sink/animation.json --verbose
node packages/cli/dist/cli.js preview examples/kitchen-sink/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/kitchen-sink/animation.json -o .tmp/kitchen-sink-gallery.mp4 --quality high
```
