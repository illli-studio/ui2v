# ui2v

[中文](README_zh.md)

ui2v is a standalone command-line renderer for structured animation JSON. It
launches a local Chromium-based browser with Puppeteer, renders frames through
the ui2v Canvas engine, encodes MP4 with WebCodecs, and writes the result from
Node.js.

This repository contains the open renderer stack: CLI, runtime model, browser
engine, producer pipeline, examples, and documentation. It is not the full
desktop application.

## What You Can Do

- Validate ui2v animation JSON before rendering.
- Preview a project in a local browser with playback and scrubbing controls.
- Render MP4 output from template and custom-code layers.
- Inspect normalized runtime state, frame plans, dependency windows, adapter
  routes, and draw command summaries.
- Build on reusable packages for custom tooling or automation.

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for local workspace development
- Chrome, Edge, Chromium, or Puppeteer's installed Chromium

The main render path does not require Electron, FFmpeg, or `node-canvas`.

## Install

Install the published CLI:

```bash
npm install -g @ui2v/cli
ui2v --version
```

Run without a global install:

```bash
npx @ui2v/cli --version
```

Build from this workspace:

```bash
bun install
bun run build
```

If Puppeteer browser download fails and you already have Chrome or Edge
installed, skip the bundled browser download:

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

Windows PowerShell:

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'; bun install
```

## Quick Start

```bash
ui2v doctor
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

When using a local build:

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## Package Structure

```text
@ui2v/core          Types, parser, validator, and shared helpers
@ui2v/runtime-core  Scene graph, timeline, frame plans, adapters, commands
@ui2v/engine        Browser Canvas renderer and WebCodecs exporter
@ui2v/producer      Puppeteer-backed preview and MP4 render pipeline
@ui2v/cli           Command-line interface installed as ui2v
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

## Documentation

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [Roadmap](docs/roadmap.md)
- [Renderer Notes](docs/ui2v-renderer-readme.md)
- [Open Renderer Preview](docs/open-source-preview-article.md)

Chinese versions are available next to each document with `.zh.md` suffix, or
as `README_zh.md` at the repository root.

## Development

```bash
bun run build
bun run test
```

Useful focused checks:

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
