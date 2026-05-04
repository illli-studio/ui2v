# Quick Start

[中文](quick-start.zh.md)

This guide gets a ui2v JSON project rendered from either the published CLI or a
local workspace build.

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for local workspace development
- A locally installed Chrome, Edge, or Chromium executable

The primary render path uses `puppeteer-core`, Canvas, and WebCodecs. It does
not download a bundled Chromium and does not require Electron, FFmpeg, or
`node-canvas`.

## Published CLI

Install the scoped CLI package. It still exposes the `ui2v` command after
installation.

```bash
npm install -g @ui2v/cli
# or: bun install -g @ui2v/cli
ui2v doctor
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

Run without a global install:

```bash
npx @ui2v/cli --version
npx @ui2v/cli render examples/hero-ai-launch/animation.json -o hero-ai-launch.mp4 --quality high
```

## Local Workspace

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/hero-ai-launch/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

No browser is downloaded during install. `ui2v` uses your local Chrome, Edge, or
Chromium installation through `puppeteer-core`.

## Browser Setup

If `doctor` cannot find a browser, install Chrome/Edge/Chromium or set one of
these environment variables: `PUPPETEER_EXECUTABLE_PATH`, `CHROME_PATH`,
`CHROMIUM_PATH`, or `EDGE_PATH`.

## Useful Render Options

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --width 1920 --height 1080 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
ui2v preview animation.json --pixel-ratio 2
```

`--render-scale` supersamples frames before encoding. For example,
`--width 1920 --height 1080 --render-scale 2` renders internally at 3840x2160
and then downsamples to 1920x1080.

## Choose An Example

- Start with [`examples/hero-ai-launch`](../examples/hero-ai-launch/README.md) for the most impressive README hero demo.
- Use [`examples/product-showcase`](../examples/product-showcase/README.md) for a customizable SaaS/app launch-video structure.
- Use [`examples/render-lab`](../examples/render-lab/README.md) to stress-test data, particles, and pseudo-3D.
- Use [`examples/basic-text`](../examples/basic-text/README.md) only when you need the smallest sanity check.

## Next Steps

- [Getting Started](getting-started.md)
- [Architecture](architecture.md)
- [Runtime Core](runtime-core.md)
- [CLI Reference](../packages/cli/README.md)
