# Architecture

ui2v is a standalone CLI renderer for ui2v animation JSON files. It
keeps the animation model and runtime reusable while delegating browser-native
rendering work to Chrome or Edge through Puppeteer.

## Package Structure

```
@ui2v/core          Types, parsers, validators
@ui2v/runtime-core  Scene graph, timeline, scheduler, adapter contracts
@ui2v/engine        Browser rendering engine and exporters
@ui2v/producer      Puppeteer/WebCodecs render and preview pipeline
@ui2v/cli          Command-line interface, installed as the ui2v command
```

## Render Flow

```
JSON project
  -> CLI parses and validates input
  -> producer starts a local static server
  -> Puppeteer launches Chrome or Edge
  -> browser loads engine/runtime/core bundles
  -> runtime evaluates frames from the shared timeline
  -> engine renders frames to Canvas
  -> WebCodecs encodes MP4 in the browser
  -> producer writes the resulting video to disk
```

## Runtime Core

`@ui2v/runtime-core` is the shared deterministic layer. It normalizes projects
into a composition and scene graph, evaluates timeline state at a given time,
builds segment frame plans, and exposes dependency preload windows. Preview,
render, and inspection commands should continue to share this layer so they
sample the same timeline.

## CLI Commands

- `init` creates a starter project.
- `validate` parses and validates a project JSON file.
- `preview` opens an interactive browser preview.
- `render` exports an MP4 file through the browser-backed producer.
- `inspect-runtime` prints normalized runtime state and sampled frames.
- `doctor` checks the local browser/rendering environment.
- `info` prints version and environment details.

## Design Principles

1. **Browser-first rendering** - DOM, Canvas, WebCodecs, and animation libraries
   run in the environment they are designed for.
2. **Type-safe boundaries** - project parsing, runtime evaluation, rendering,
   and production are separated into packages.
3. **Deterministic timelines** - preview and export should be driven by the
   same frame plan.
4. **Portable CLI** - the renderer should not require Electron or native canvas
   bindings for the primary path.
5. **Extensible adapters** - rendering backends can be added behind the runtime
   adapter contracts.

## Current Constraints

- MP4 is the primary production output.
- AVC/H.264 is the default codec; HEVC is available only when the local browser
  supports it.
- Browser ESM dependencies are currently loaded from pinned CDN URLs in the
  producer import map.
- Distributed rendering and offline dependency vendoring are future work.

## License

MIT
