# ui2v

Standalone CLI renderer for ui2v animation JSON files. ui2v launches a
real Chromium browser with Puppeteer, renders animation frames through the ui2v
Canvas engine, encodes MP4 with WebCodecs, and writes the video directly to disk.

It is built for JSON-first motion systems, AI-generated animation specs, and
repeatable CLI render workflows.

## Why This Exists

- **Browser-native rendering:** DOM, Canvas, WebCodecs, and browser animation
  libraries run in the environment they are designed for.
- **No Electron runtime:** the standalone CLI does not require the original app.
- **No native canvas or FFmpeg requirement:** the main path avoids common native
  install problems.
- **Runtime-driven frames:** preview, inspect, and render can share the same
  timeline and frame plan through `@ui2v/runtime-core`.
- **Real verification:** the test suite includes smoke renders that produce
  actual MP4 files from both an example project and a freshly initialized
  project.

## Quick Start

Install the published CLI package:

```bash
npm install -g @ui2v/cli
ui2v doctor
ui2v init my-video
cd my-video
ui2v render animation.json -o output.mp4
```

Run without a global install:

```bash
npx @ui2v/cli --version
npx @ui2v/cli render animation.json -o output.mp4
```

The npm package is `@ui2v/cli`; the installed command is `ui2v`.

## Workspace Quick Start

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

Try a richer example:

```bash
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```

Render any compatible ui2v JSON file:

```bash
node packages/cli/dist/cli.js render animation.json -o .tmp/output.mp4 --width 640 --height 360 --fps 30
```

## Requirements

- Node.js >= 18
- Bun >= 1.0 for development
- Chrome, Edge, or Puppeteer's installed Chromium

Run `doctor` to verify the local browser exposes WebCodecs and supports the
default AVC/H.264 encoder configuration:

```bash
node packages/cli/dist/cli.js doctor
```

## Packages

- [@ui2v/core](./packages/core): JSON parsing, validation, shared types
- [@ui2v/runtime-core](./packages/runtime-core): scene graph, timeline, frame plans, adapters
- [@ui2v/engine](./packages/engine): browser rendering engine and WebCodecs exporter
- [@ui2v/producer](./packages/producer): Puppeteer-backed preview and render pipeline
- [@ui2v/cli](./packages/cli): command-line interface, installed as the `ui2v` command

## CLI

```bash
ui2v validate animation.json
ui2v preview animation.json
ui2v inspect-runtime animation.json --time 0 --time 1
ui2v render animation.json -o output.mp4
```

Preview uses a 2x canvas pixel ratio by default so the browser preview is
sharper on modern displays. Use `--pixel-ratio 1` for lower GPU usage, or
increase it up to `--pixel-ratio 4` when inspecting fine detail:

```bash
node packages/cli/dist/cli.js preview animation.json --pixel-ratio 3
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

The current production path targets MP4 output. AVC/H.264 is the default codec
because it is the most widely supported by Chromium WebCodecs. HEVC can be
requested with `--codec hevc` when the local browser supports it.

## Development

```bash
bun run build
bun run test:unit
bun run test:metadata
bun run test:surface
bun run test:pack
bun run test:examples
bun run test:validate
bun run test:cli-errors
bun run test:inspect-runtime
bun run test:smoke
bun run test:render-scale
bun run test:runtime-render
bun run test:init
bun run test
```

`bun run test` builds every package, runs behavior tests, checks publish
metadata and package contents, validates all example JSON files, checks CLI
help and error paths, inspects runtime JSON, renders
`examples/basic-text/animation.json`, renders the same project with
`--render-scale 2`, renders `examples/runtime-core/animation.json`, creates a
fresh `ui2v init` project, renders it, and checks that each MP4 output exists
with a non-zero size.

## Documentation

- [Architecture](./docs/architecture.md)
- [Getting Started](./docs/getting-started.md)
- [Runtime Core](./docs/runtime-core.md)
- [Roadmap](./docs/roadmap.md)

## License

MIT
