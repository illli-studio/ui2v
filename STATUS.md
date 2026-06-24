# ui2v Status

[中文](STATUS_zh.md)

## Current State

ui2v is a standalone CLI renderer for structured animation JSON. It uses `puppeteer-core` to control a locally installed Chrome, Edge, or Chromium browser, renders through the ui2v Canvas engine, encodes MP4 with WebCodecs, and writes the output from Node.js.

The primary path does not download a bundled Chromium and does not require Electron, FFmpeg, WebGPU, or `node-canvas`.

## Completed

- Bun workspace monorepo.
- `@ui2v/core` project types, parser, validator, and helpers.
- `@ui2v/runtime-core` scene graph, timelines, frame plans, dependency metadata, adapter routing, and draw commands.
- `@ui2v/engine` browser Canvas renderer, template adapter, custom-code runtime, canvas command executor, and WebCodecs exporter.
- `@ui2v/producer` system-browser preview and MP4 render pipeline with local browser discovery.
- `@ui2v/cli` commands: `doctor`, `init`, `validate`, `preview`, `render`, `inspect-runtime`, `list-beats`, `insert-beat`, `lint-timeline`, and `info`.
- **ui2v Studio** preview workspace: multi-track timeline, clip inspector, split-at-playhead, CodeMirror JSON editor, beat template strip, timeline lint overlays, and ripple segment editing.
- Polished README showcase examples and GIF preview assets.
- Repo-local Codex skills for example creation, runtime-core authoring, render validation, and render capability guidance.
- Example validation, CLI smoke tests, package metadata checks, and package pack checks.
- MIT license metadata across workspace packages.

## Verified Locally

The workspace has been verified with:

```bash
bun run build
bun run test:ci
```

The CI suite covers unit tests, package metadata, CLI surface, examples, docs assets, preview studio APIs (including ripple patch), insert-beat, lint-timeline, and render failure surfacing.

Additional full smoke checks are available through:

```bash
bun run test
```

## Known Constraints

- MP4 is the main production output.
- AVC/H.264 is the default codec. HEVC can be requested only when the local browser supports it.
- Browser ESM dependencies are currently loaded through pinned CDN URLs.
- Long or high-resolution renders still return encoded video from browser to Node as base64 before writing to disk.
- The engine package keeps compatibility exports for older integration paths.

## Next Priorities

1. Add offline/vendor mode for browser-side dependencies.
2. Replace browser-to-Node base64 transfer with streaming or chunked output.
3. Add more vertical, marketing-quality examples for AI apps, dashboards, devtools, finance, and social launch ads.
4. Keep preview, render, inspect, README assets, and skills aligned through the same runtime/render workflow.