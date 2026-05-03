# Roadmap

[中文](roadmap.zh.md)

This roadmap describes the open renderer stack in this repository. It does not
promise a full desktop application.

## Completed

- Bun workspace monorepo.
- `@ui2v/core` parser, validator, and shared project types.
- `@ui2v/runtime-core` scene graph, timeline, frame plans, dependency metadata,
  adapter routing, and draw commands.
- `@ui2v/engine` browser renderer with template canvas, custom-code layers, and
  WebCodecs export.
- `@ui2v/producer` Puppeteer-backed preview and MP4 render pipeline.
- `@ui2v/cli` commands: `doctor`, `init`, `validate`, `preview`, `render`,
  `inspect-runtime`, and `info`.
- Workspace build and smoke-test coverage for example renders.

## Near Term

- Improve browser dependency diagnostics.
- Make install guidance clearer for environments that already have Chrome or
  Edge installed.
- Keep generated outputs under `.tmp/`.
- Expand example coverage for runtime JSON and custom-code entrypoints.

## Rendering Reliability

- Add offline/vendor mode for browser ESM dependencies.
- Replace browser-to-Node base64 transfer with streamed or chunked output.
- Add fixture-based render tests across more project shapes.
- Probe generated MP4 metadata in smoke tests.

## Feature Expansion

- WebM output when browser support and muxing are reliable.
- Batch rendering.
- Audio mixing.
- Template library.
- Plugin system.
- More adapter backends for Three.js, Pixi, Lottie, DOM, and headless rendering.

## Ecosystem

- Documentation site.
- Online playground.
- Community templates.
- VS Code extension.
- Distributed or cloud rendering integrations.
