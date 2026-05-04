# ui2v

[中文](README_zh.md)

<p align="center">
  <img src="assets/brand/ui2v-logo-readme-official-banner.jpg" alt="ui2v logo" width="760">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ui2v"><img alt="npm version" src="https://img.shields.io/npm/v/ui2v?color=00d4ff"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-f2aa4c"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-7bd88f">
</p>

ui2v turns structured animation JSON into polished, browser-rendered MP4 video.
Write motion graphics as code, preview them locally, and export production-ready
clips with system Chrome/Edge automation, Canvas, WebCodecs, and Node.js.

Use it when you want launch clips, AI-generated product videos, data stories,
UI demos, brand openers, or repeatable motion systems that can live in Git.

## Codex Skill

Install the repo-local ui2v skill:

```bash
npx skills add illli-studio/ui2v --skill ui2v
```

The skill lives in [`skills/ui2v`](skills/ui2v/SKILL.md) and covers example creation,
runtime-core projects, renderer capabilities, and README showcase asset export.

## Showcase

README demos should sell the project in the first five seconds. These clips are
rendered by ui2v and compressed as lightweight GIFs for GitHub preview.

| Hero AI Launch | Product Launch |
| --- | --- |
| ![Hero AI launch trailer rendered by ui2v](assets/showcase/hero-ai-launch.gif) | ![Product launch video rendered by ui2v](assets/showcase/product-showcase.gif) |
| README-first AI launch trailer with cinematic lighting, glass UI, prompt-to-MP4 pipeline, and final CTA. | Premium SaaS launch style with glass panels, feature beats, and light sweeps. |

| Render Lab | Commerce Command Center |
| --- | --- |
| ![Render lab video rendered by ui2v](assets/showcase/render-lab.gif) | ![Commerce command center video rendered by ui2v](assets/showcase/commerce-command-center.gif) |
| Data, particles, pseudo-3D depth, and high-energy motion tests. | Dashboard storytelling with live metrics, revenue panels, and command-center pacing. |

> Tip: keep the full MP4 exports in release assets, GitHub issue attachments, or
> a CDN, then keep compressed GIF/JPG previews in `assets/showcase` for README.

## Quick Start

Install the short CLI package:

```bash
npm install -g ui2v
ui2v doctor
```

Render a polished starter example:

```bash
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

Run without a global install:

```bash
npx ui2v render examples/hero-ai-launch/animation.json -o hero-ai-launch.mp4 --quality high
```

Use a local workspace build:

```bash
bun install
bun run build
node packages/cli/dist/cli.js render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

## Example Gallery
Preview opens a local Studio page with a searchable JSON project list, playback controls, frame scrubbing, playback speed, fit/theater/fullscreen modes, runtime debug overlay, current-frame PNG snapshots, copyable CLI render commands, and an **Export MP4** button that writes to `.tmp/examples`.


Use the examples as marketing assets, not only test fixtures. The strongest ones
should show a concrete outcome a user wants to copy.

| Example | Why It Sells | Render |
| --- | --- | --- |
| [`examples/hero-ai-launch`](examples/hero-ai-launch/README.md) | The README hero trailer: cinematic lighting, glass UI panels, prompt-to-MP4 storytelling, and a final CTA lockup. | `ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high` |
| [`examples/runtime-core/uiv-runtime-one-minute-studio.json`](examples/runtime-core/uiv-runtime-one-minute-studio.json) | A complete AI-video studio promo with multiple scenes, interface choreography, depth, and CTA pacing. | `ui2v render examples/runtime-core/uiv-runtime-one-minute-studio.json -o .tmp/examples/uiv-runtime-one-minute-studio.mp4 --quality high` |
| [`examples/product-showcase`](examples/product-showcase/README.md) | A product launch clip users can immediately imagine replacing with their own SaaS, app, or devtool. | `ui2v render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high` |
| [`examples/render-lab`](examples/render-lab/README.md) | A capability reel for particles, data motion, pseudo-3D, lighting, and multi-scene transitions. | `ui2v render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high` |
| [`examples/runtime-core/uiv-runtime-commerce-command-center.json`](examples/runtime-core/uiv-runtime-commerce-command-center.json) | A dashboard storytelling demo for metrics, commerce, operations, and command-center visuals. | `ui2v render examples/runtime-core/uiv-runtime-commerce-command-center.json -o .tmp/examples/uiv-runtime-commerce-command-center.mp4 --quality high` |
| [`examples/logo-reveal`](examples/logo-reveal/README.md) | A short first-run brand opener that proves the CLI works quickly. | `ui2v render examples/logo-reveal/animation.json -o .tmp/examples/logo-reveal.mp4 --quality high` |
| [`examples/basic-text`](examples/basic-text/README.md) | A minimal smoke test for validating local browser/render setup. | `ui2v render examples/basic-text/animation.json -o .tmp/examples/basic-text.mp4` |

## README Asset Workflow

Render MP4 for quality, then export short preview assets for GitHub:

```bash
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high

ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/hero-ai-launch.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/hero-ai-launch.gif

ffmpeg -y -ss 1 -i .tmp/examples/hero-ai-launch.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/hero-ai-launch.jpg
```

For the README, prefer 4-6 second GIFs under 3 MB and keep full MP4 files out of
the repository unless they are release assets.

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

## Render Flow

```text
animation.json
  -> CLI parses and validates input
  -> producer starts a local static server
  -> puppeteer-core controls local Chrome, Edge, or Chromium
  -> browser loads core/runtime/engine bundles
  -> runtime evaluates frame state from a shared timeline
  -> engine renders frames to Canvas
  -> WebCodecs encodes MP4 in the browser
  -> producer writes the video file to disk
```

## Requirements

- Node.js 18 or newer
- Bun 1.0 or newer for workspace development
- Locally installed Chrome, Edge, or Chromium

The main render path does not require Electron, FFmpeg, or `node-canvas`.

ui2v uses `puppeteer-core`, so it does not download a bundled Chromium.
Install Chrome, Edge, or Chromium locally. If auto-detection fails, point ui2v at
your browser:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome ui2v doctor
```

Windows PowerShell:

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
