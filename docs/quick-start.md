# Quick Start

Get a ui2v render running from the published CLI or from the local workspace.

## Prerequisites

- Node.js >= 18
- Bun >= 1.0 for local workspace development
- Chrome, Edge, or Puppeteer's bundled Chromium

The main render path does not require Electron, FFmpeg, or node-canvas.

## Install The Published CLI

```bash
npm install -g @ui2v/cli
ui2v doctor
```

The npm package is `@ui2v/cli`; the installed command is `ui2v`.

Run without a global install:

```bash
npx @ui2v/cli --version
```

## Local Install And Build

```bash
bun install
bun run build
```

## Check The Environment

```bash
node packages/cli/dist/cli.js doctor
```

If no browser is found, install Chrome or Edge, set `PUPPETEER_EXECUTABLE_PATH`,
or run:

```bash
npx puppeteer browsers install chrome
```

## Validate An Example

```bash
ui2v validate examples/basic-text/animation.json --verbose
```

## Preview

```bash
ui2v preview examples/basic-text/animation.json
```

Open the printed preview URL in a browser. The preview UI includes play/pause,
restart, and scrubbing controls.

Preview renders at a 2x canvas pixel ratio by default for a sharper browser
view. Use `--pixel-ratio 1` for lower GPU usage, or raise it up to
`--pixel-ratio 4` when checking fine details:

```bash
ui2v preview examples/basic-text/animation.json --pixel-ratio 3
```

## Render MP4

```bash
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

Useful render options:

```bash
--quality low|medium|high|ultra|cinema
--fps 30
--width 1280 --height 720
--render-scale 2
--codec avc
--bitrate 8000000
--timeout 300
--no-headless
```

`--render-scale` supersamples frames before encoding. For example,
`--width 1280 --height 720 --render-scale 2` renders internally at 2560x1440,
then downsamples to a 1280x720 video for cleaner edges and text.

## Next Steps

- [CLI Reference](../packages/cli/README.md)
- [Examples](../examples/)
- [Architecture](./architecture.md)
- [Runtime Core](./runtime-core.md)
