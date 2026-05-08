# ui2v

[中文](README_zh.md)

<p align="center">
  <img src="assets/brand/ui2v-logo-readme-official-banner.jpg" alt="ui2v logo" width="760">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ui2v/cli"><img alt="npm version" src="https://img.shields.io/npm/v/@ui2v/cli?color=00d4ff"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-GPL3.0-f2aa4c"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-7bd88f">
</p>

ui2v turns structured animation JSON into polished, browser-rendered MP4 video.
Write motion graphics as code, preview them locally, and export production-ready
clips with system Chrome/Edge automation, Canvas, WebCodecs, and Node.js.

Custom code can load browser/npm animation libraries such as `d3`, `gsap`,
`animejs`, `three`, `pixi.js`, `matter-js`, `mathjs`, `simplex-noise`,
`roughjs`, `katex`, `lottie-web`, `iconify`, and more through the
`@ui2v/engine` dependency manager.

Use it when you want launch clips, AI-generated product videos, data stories,
UI demos, brand openers, local-media compositions, or repeatable motion systems
that can live in Git.

## Highlights

- **JSON to MP4**: validate, preview, inspect, and render animation projects from the CLI.
- **Browser-native rendering**: drive local Chrome, Edge, or Chromium through `puppeteer-core`.
- **Real library usage**: declare dependencies per project, segment, layer, or custom-code layer.
- **Timeline-first demos**: split multi-library videos into visible beats instead of one giant code blob.
- **Runtime storyboards**: use `schema: "uiv-runtime"`, `timeline.segments[]`, transitions, camera metadata, and `inspect-runtime`.
- **Local media**: put photos, videos, and music in `access/` and reference them from JSON.

## Codex Skill

Install the repo-local ui2v skill:

```bash
npx skills add illli-studio/ui2v --skill ui2v
```

Refresh it when the repo skill changes:

```bash
npx skills add illli-studio/ui2v --skill ui2v --force
```

The skill lives in [`skills/ui2v`](skills/ui2v/SKILL.md). It guides agents to
plan segmented storyboards, choose runtime/template JSON, use XYZ/depth/camera
features, combine real browser/npm libraries, insert local media, validate, and
render MP4. The current skill explicitly requires visible timeline-based library
usage, not dependency lists that render like plain Canvas.

## Maintained Showcase Examples

The old experimental examples have been removed. `examples/` now contains four
maintained demos that are meant to be polished, inspectable, and useful as AI
generation references.

| Example | What It Demonstrates | Render |
| --- | --- | --- |
| [`examples/basic-smoke`](examples/basic-smoke/README.md) | Premium Canvas opener that still works as the smallest end-to-end smoke test. | `ui2v render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`examples/library-timeline`](examples/library-timeline/README.md) | Timeline-first multi-library showcase: GSAP/SplitType, D3/math, THREE/postprocessing, Matter/simplex/Iconify. | `ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`examples/access-media`](examples/access-media/README.md) | Local `access/` media: image layer, video layer, waveform layer, and muxed AAC audio. | `ui2v render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`examples/runtime-storyboard`](examples/runtime-storyboard/README.md) | Runtime-core segmented storytelling with transitions, segment-local dependencies, camera metadata, and inspection. | `ui2v render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## Quick Start

Install the CLI:

```bash
npm install -g @ui2v/cli
ui2v doctor
```

Render the multi-library showcase:

```bash
ui2v validate examples/library-timeline/animation.json --verbose
ui2v preview examples/library-timeline/animation.json --pixel-ratio 2
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

Run without a global install:

```bash
npx @ui2v/cli render examples/library-timeline/animation.json -o library-timeline.mp4 --quality high
```

Use a local workspace build:

```bash
bun install
bun run build
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

## Preview Studio

`ui2v preview` opens a local Studio page with a searchable JSON project list,
playback controls, frame scrubbing, playback speed, fit/theater/fullscreen
modes, runtime debug overlay, current-frame PNG snapshots, copyable CLI render
commands, and an **Export MP4** button that writes to `.tmp/examples`.

## README Asset Workflow

Render MP4 for quality, then export short preview assets for GitHub:

```bash
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high

ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/library-timeline.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/library-timeline.gif

ffmpeg -y -ss 1 -i .tmp/examples/library-timeline.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/library-timeline.jpg
```

For the README, prefer 4-6 second GIFs under 3 MB. Keep full MP4 exports in
`.tmp/examples`, release assets, issue attachments, or a CDN.

## Generate A New Idea

ui2v projects are JSON files, so they are easy to draft with an AI coding tool
and then render locally. A strong prompt includes format, duration, resolution,
visual style, scenes, dependencies, local resources, and the exact output path.

```text
Create a ui2v animation JSON with four visible library beats on the timeline:
GSAP/SplitType typography, D3/math data, THREE/postprocessing depth, and
Matter/simplex/Iconify interaction. Each beat must have its own layer or segment,
dependencies, visible proof, and render command.
```

## Local Media

Put user-provided media in an `access/` folder next to `animation.json`, then
reference it with relative paths from JSON:

```text
my-video/
  animation.json
  access/
    photo.png
    clip.mp4
    music.wav
```

Use `image-layer` for photos, `video-layer` for inserted video clips, and
`audio-layer` or root `audio.tracks` for music. Root audio tracks are muxed into
the exported MP4 as AAC. Supported audio controls include `volume`, `loop`,
`duration`, `trimStart`, `trimEnd`, `fadeIn`, and `fadeOut`.

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
ui2v render animation.json -o output.mp4 --width 1920 --height 1080
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
@ui2v/producer       System-browser preview and MP4 render pipeline
```

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for workspace development
- Locally installed Chrome, Edge, or Chromium

The main render path does not require Electron, FFmpeg, or `node-canvas`.
ui2v uses `puppeteer-core`, so it does not download a bundled Chromium. If
auto-detection fails, point ui2v at your browser:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; ui2v doctor
```

## Documentation

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Examples](examples/README.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [Renderer Notes](docs/renderer-notes.md)
- [Roadmap](docs/roadmap.md)
- [CLI Reference](packages/cli/README.md)

## Development

```bash
bun run build
bun run test
```

## License

MIT
