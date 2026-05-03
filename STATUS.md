# ui2v Status

[中文](STATUS_zh.md)

## Current State

ui2v is a standalone CLI renderer for ui2v animation JSON files. It launches a
local browser with Puppeteer, renders through the ui2v Canvas engine, encodes
MP4 with WebCodecs, and writes the output from Node.js.

The primary path does not require Electron, FFmpeg, or `node-canvas`.

## Completed

- Bun workspace monorepo.
- `@ui2v/core` project types, parser, validator, and helpers.
- `@ui2v/runtime-core` scene graph, timeline, frame plans, dependency metadata,
  adapter routing, and draw commands.
- `@ui2v/engine` browser rendering, template canvas adapter, custom-code
  renderer, canvas command executor, and WebCodecs exporter.
- `@ui2v/producer` Puppeteer preview and MP4 render pipeline.
- `@ui2v/cli` commands: `doctor`, `init`, `validate`, `preview`, `render`,
  `inspect-runtime`, and `info`.
- Example validation and smoke-render scripts.
- MIT license metadata across workspace packages.

## Verified Locally

The workspace has been verified with:

```bash
bun run build
```

Additional checks are available through:

```bash
bun run test
```

## Known Constraints

- MP4 is the main production output.
- AVC/H.264 is the default codec. HEVC can be requested only when the local
  browser supports it.
- Browser ESM dependencies are currently loaded through pinned CDN URLs.
- Long or high-resolution renders return encoded video from browser to Node as
  base64 before writing to disk.
- The engine package still includes compatibility exports for older integration
  paths.

## Next Priorities

1. Add offline/vendor mode for browser dependencies.
2. Replace browser-to-Node base64 transfer with streaming or chunked output.
3. Keep preview, render, and inspect flows aligned through `@ui2v/runtime-core`.
