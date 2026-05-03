# ui2v

[中文](README_zh.md)

<p align="center">
  <img src="assets/brand/ui2v-logo.svg" alt="ui2v logo" width="760">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ui2v"><img alt="npm version" src="https://img.shields.io/npm/v/ui2v?color=00d4ff"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-f2aa4c"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-7bd88f">
</p>

ui2v turns structured animation JSON into browser-rendered MP4 video. It starts
a local Chromium browser with Puppeteer, evaluates the project timeline on
Canvas, encodes with WebCodecs, and writes the finished video from Node.js.

The project is useful when you want repeatable motion graphics, launch clips,
data stories, UI demos, product explainers, or generated brand videos that can
be versioned as code.

## Quick Start

Install the short CLI package:

```bash
npm install -g ui2v
ui2v doctor
```

Render the polished starter example:

```bash
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

Run without a global install:

```bash
npx ui2v render examples/logo-reveal/animation.json -o logo-reveal.mp4 --quality high
```

Use a local workspace build:

```bash
bun install
bun run build
node packages/cli/dist/cli.js render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4
```

## What You Can Make

| Example | Best For | Render |
| --- | --- | --- |
| [`examples/logo-reveal`](examples/logo-reveal/README.md) | First run, brand openers, README demo clips | `ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high` |
| [`examples/product-showcase`](examples/product-showcase/README.md) | Product launch videos and feature teasers | `ui2v render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high` |
| [`examples/render-lab`](examples/render-lab/README.md) | Data, particles, pseudo-3D, and multi-scene demos | `ui2v render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high` |
| [`examples/basic-text`](examples/basic-text/README.md) | Minimal validation and environment checks | `ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4` |

## Generate A New Idea

ui2v projects are JSON files, so they are easy to draft with an AI coding tool
and then render locally. A strong prompt usually includes format, duration,
resolution, visual style, scenes, and the exact output file you want.

```text
Create a ui2v animation JSON for a 6-second 1920x1080 product launch video.
Use a custom-code Canvas layer. Make it feel like a premium SaaS release:
dark glass interface, clear product wordmark, animated data cards, light sweep,
and a final CTA. Save it as examples/my-launch/animation.json and include a
README with validate, preview, and render commands.
```

For logo and brand videos, ask for the mark directly:

```text
Create a ui2v logo reveal for ui2v.com. Draw the logo, wordmark, browser-video
pipeline labels, and a progress bar entirely in Canvas. Keep it polished,
readable, and suitable for a GitHub README demo.
```

## Create Your Own Project

```bash
ui2v init my-video
cd my-video
ui2v preview animation.json --pixel-ratio 2
ui2v render animation.json -o output.mp4 --quality high
```

The generated project is intentionally small. For a more impressive starting
point, copy `examples/logo-reveal` or `examples/product-showcase` and edit the
copy, colors, timing, and Canvas drawing code.

## CLI Commands

```bash
ui2v doctor
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v inspect-runtime animation.json
ui2v render animation.json -o output.mp4 --quality high
```

Useful render options:

```bash
ui2v render animation.json -o output.mp4 --width 1280 --height 720
ui2v render animation.json -o output.mp4 --quality ultra --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

## Package Structure

```text
ui2v                 Short install package for the ui2v command
@ui2v/cli            Command-line interface implementation
@ui2v/core           Types, parser, validator, and shared helpers
@ui2v/runtime-core   Scene graph, timeline, frame plans, adapters, commands
@ui2v/engine         Browser Canvas renderer and WebCodecs exporter
@ui2v/producer       Puppeteer-backed preview and MP4 render pipeline
```

## Render Flow

```text
animation.json
  -> CLI parses and validates input
  -> producer starts a local static server
  -> Puppeteer launches Chrome, Edge, or Chromium
  -> browser loads core/runtime/engine bundles
  -> runtime evaluates frame state from a shared timeline
  -> engine renders frames to Canvas
  -> WebCodecs encodes MP4 in the browser
  -> producer writes the video file to disk
```

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for workspace development
- Chrome, Edge, Chromium, or Puppeteer's installed Chromium

The main render path does not require Electron, FFmpeg, or `node-canvas`.

If Puppeteer browser download fails and you already have Chrome or Edge
installed, skip the bundled browser download:

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell:

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## Documentation

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [Renderer Notes](docs/renderer-notes.md)
- [Roadmap](docs/roadmap.md)
- [Open Renderer Preview](docs/open-source-preview-article.md)
- [CLI Reference](packages/cli/README.md)

Chinese versions are available next to each document with `.zh.md` suffix, or
as [`README_zh.md`](README_zh.md) at the repository root.

## Development

```bash
bun run build
bun run test
```

Focused checks:

```bash
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
```

## Current Constraints

- MP4 is the primary production output.
- AVC/H.264 is the default codec. HEVC can be requested only when the launched
  browser supports it.
- Browser ESM dependencies are currently loaded through pinned CDN URLs in the
  producer import map.
- Long or high-resolution renders still transfer encoded video from the browser
  to Node as base64 before writing to disk, which is simple but memory-heavy.

## License

MIT
