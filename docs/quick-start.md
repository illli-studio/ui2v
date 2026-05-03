# Quick Start

[中文](quick-start.zh.md)

This guide gets a ui2v JSON project rendered from either the published CLI or a
local workspace build.

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for local workspace development
- Chrome, Edge, Chromium, or Puppeteer's installed Chromium

The primary render path uses Puppeteer, Canvas, and WebCodecs. It does not
require Electron, FFmpeg, or `node-canvas`.

## Published CLI

```bash
npm install -g @ui2v/cli
ui2v doctor
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

Run without a global install:

```bash
npx @ui2v/cli --version
npx @ui2v/cli render animation.json -o output.mp4
```

## Local Workspace

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

If Puppeteer browser download fails during install and you already have Chrome
or Edge installed, you can skip the bundled browser download:

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell:

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## Browser Setup

If `doctor` cannot find a browser, install Chrome or Edge, set
`PUPPETEER_EXECUTABLE_PATH`, or install Puppeteer's browser:

```bash
npx puppeteer browsers install chrome
```

## Useful Render Options

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

`--render-scale` supersamples frames before encoding. For example,
`--width 1280 --height 720 --render-scale 2` renders internally at 2560x1440
and then downsamples to 1280x720.

## Next Steps

- [Getting Started](getting-started.md)
- [Architecture](architecture.md)
- [Runtime Core](runtime-core.md)
- [CLI Reference](../packages/cli/README.md)
