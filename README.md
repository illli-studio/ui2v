# ui2v

Standalone command-line rendering tools for ui2v animation JSON projects.

ui2v reads structured animation project files, previews them in a local browser,
and renders them to MP4 through a browser-backed Canvas and WebCodecs pipeline.
The current open-source repository is focused on the renderer, runtime model,
CLI, package APIs, documentation, and examples. It is not the full desktop
application described by older product copy.

## What This Repository Provides

- A Bun workspace with reusable TypeScript packages.
- A `ui2v` CLI for validating, previewing, inspecting, and rendering projects.
- A DOM-free runtime core for scene graphs, timelines, frame sampling, render
  plans, dependency planning, and adapter contracts.
- A browser-first Canvas rendering engine for template and custom-code layers.
- A Puppeteer-backed producer that launches Chrome, Edge, or Chromium, renders
  frames in a real browser, encodes MP4 with WebCodecs, and writes the output
  file from Node.js.
- Example `animation.json` projects for smoke testing and experimentation.

The primary render path does not require Electron, FFmpeg, or `node-canvas`.

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for local workspace development
- Chrome, Edge, Chromium, or Puppeteer's bundled Chromium

If no browser is found, install Chrome or Edge, set
`PUPPETEER_EXECUTABLE_PATH`, or install Puppeteer's browser:

```bash
npx puppeteer browsers install chrome
```

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

## Quick Start

Check the local rendering environment:

```bash
ui2v doctor
```

Create a starter project:

```bash
ui2v init my-video
```

Validate an example:

```bash
ui2v validate examples/basic-text/animation.json --verbose
```

Preview an animation in a browser:

```bash
ui2v preview examples/basic-text/animation.json
```

Render an MP4:

```bash
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

When working from a local build, use the built CLI directly:

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## CLI Commands

```bash
ui2v doctor
ui2v init [name]
ui2v validate <input.json>
ui2v preview <input.json>
ui2v render <input.json> -o output.mp4
ui2v inspect-runtime <input.json>
ui2v info
```

Useful render options:

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300
```

`--render-scale` supersamples frames before encoding. For example,
`--width 1280 --height 720 --render-scale 2` renders internally at
2560x1440, then downsamples to a 1280x720 video for cleaner edges and text.

Preview renders at a 2x canvas pixel ratio by default. Use `--pixel-ratio 1`
for lower GPU usage or increase it up to `--pixel-ratio 4` for detail checks.

## Project Format

The main input is an `AnimationProject` JSON file:

```json
{
  "id": "basic-text",
  "mode": "template",
  "duration": 2,
  "fps": 30,
  "resolution": { "width": 640, "height": 360 },
  "template": {
    "layers": [
      {
        "id": "text-layer",
        "type": "custom-code",
        "startTime": 0,
        "endTime": 2,
        "properties": {
          "code": "function createRenderer() { return { render(t, context) { /* draw */ } }; }"
        }
      }
    ]
  }
}
```

See the examples directory for complete projects:

- `examples/basic-text/animation.json`
- `examples/product-showcase/animation.json`
- `examples/kitchen-sink/animation.json`
- `examples/runtime-core/*.json`

## Package Structure

```text
@ui2v/core          Types, parsers, validators, and shared helpers
@ui2v/runtime-core  Scene graph, timeline, scheduler, frame plans, adapters
@ui2v/engine        Browser Canvas rendering and WebCodecs export support
@ui2v/producer      Puppeteer-backed preview and MP4 render pipeline
@ui2v/cli           Command-line interface installed as ui2v
```

## Render Flow

```text
JSON project
  -> CLI parses and validates input
  -> producer starts a local static server
  -> Puppeteer launches Chrome, Edge, or Chromium
  -> browser loads engine/runtime/core bundles
  -> runtime evaluates frame state from the shared timeline
  -> engine renders frames to Canvas
  -> WebCodecs encodes MP4 in the browser
  -> producer writes the video file to disk
```

## Development

Install dependencies and build all packages:

```bash
bun install
bun run build
```

Run the full test suite:

```bash
bun run test
```

Run selected checks:

```bash
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
```

## Current Constraints

- MP4 is the primary production output.
- AVC/H.264 is the default codec. HEVC can be requested with `--codec hevc`
  only when the launched browser supports it.
- Browser ESM dependencies are currently loaded through pinned CDN URLs in the
  producer import map.
- Long or high-resolution renders still transfer the encoded video from the
  browser to Node as base64 before writing it to disk, which is simple but
  memory-heavy.
- Offline dependency vendoring, streaming output, additional formats, and
  broader adapter coverage are future work.

## Documentation

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [CLI README](packages/cli/README.md)

## License

MIT
