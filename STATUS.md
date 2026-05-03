# ui2v Status

## Current State

ui2v is a standalone CLI renderer for ui2v animation JSON files. The
primary render path does not require Electron, FFmpeg, or node-canvas. It starts
a local browser with Puppeteer, renders through the ui2v Canvas engine, encodes
MP4 with WebCodecs, and writes the output file from Node.

## Completed

- Monorepo structure with Bun workspaces.
- `@ui2v/core` for project types, JSON parsing, validation, and shared helpers.
- `@ui2v/runtime-core` for normalized scene graphs, timelines, frame sampling,
  dependency planning, and adapter contracts.
- `@ui2v/engine` for browser rendering, template canvas adapters, custom code
  rendering, draw command execution, and WebCodecs export support.
- `@ui2v/producer` for Puppeteer-backed preview and MP4 render pipelines.
- `doctor` checks that the local browser exposes WebCodecs and supports the
  default AVC/H.264 encoder configuration.
- `init` creates a renderable starter project that is covered by an end-to-end
  smoke test.
- `ui2v` CLI commands:
  - `doctor`
  - `validate`
  - `preview`
  - `render`
  - `inspect-runtime`
  - `init`
  - `info`
- MIT license metadata across the root package and workspace packages.
- Clean TypeScript declaration builds for all workspace packages.

## Verified

The following checks currently pass:

```bash
bun run build
bun run test:unit
bun run test:metadata
bun run test:examples
bun run test:smoke
bun run test:init
bun run test
bun run packages/runtime-core/test/runtime-core.test.mjs
bun run packages/engine/test/canvas-draw-command-executor.test.mjs
bun run packages/engine/test/custom-code-runtime.test.mjs
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
```

## Known Constraints

- MP4 is the main production output.
- AVC/H.264 is the default codec. HEVC can be requested with `--codec hevc` only
  when the local browser supports it.
- Browser ESM dependencies are currently loaded through pinned CDN URLs in the
  producer import map.
- Long or high-resolution renders still return the encoded video from the
  browser as base64 before writing it to disk, which is simple but memory-heavy.
- The engine package still contains compatibility-layer exports for legacy
  Electron IPC use cases, but the standalone producer package no longer depends
  on Electron or FFmpeg.

## Next Priorities

1. Add an offline/vendor mode for browser dependencies so renders are more
   reproducible in CI and restricted networks.
2. Replace browser-to-Node base64 transfer with a streaming or chunked output
   path for larger renders.
3. Keep preview, render, and inspect flows aligned through `@ui2v/runtime-core`.
