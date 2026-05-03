# Architecture

[中文](architecture.zh.md)

ui2v is organized as a browser-backed rendering pipeline with a reusable
runtime core. Node.js owns orchestration and file output; the browser owns
Canvas rendering and WebCodecs encoding.

## Packages

```text
@ui2v/core          Project types, parsing, validation, shared helpers
@ui2v/runtime-core  Scene graph, timeline, frame plans, adapter contracts
@ui2v/engine        Browser Canvas rendering, custom code, WebCodecs export
@ui2v/producer      Puppeteer preview/render pipeline and local static server
@ui2v/cli           User-facing command-line interface
```

## Render Flow

```text
JSON project
  -> CLI reads and validates input
  -> producer starts a localhost static server
  -> Puppeteer launches Chrome, Edge, or Chromium
  -> browser loads core/runtime/engine bundles
  -> runtime evaluates deterministic frame state
  -> engine renders the frame to Canvas
  -> WebCodecs encodes MP4 in the browser
  -> producer receives the encoded data and writes the file
```

## Runtime Boundary

`@ui2v/runtime-core` does not render pixels. It normalizes projects, evaluates
timeline state, builds render plans, routes work to adapters, and can lower a
frame into renderer-neutral draw commands.

This separation keeps preview, inspection, and export on one timing model.

## Browser Boundary

`@ui2v/engine` expects browser APIs: DOM, Canvas, OffscreenCanvas where
available, and WebCodecs for export. It hosts template layers, custom-code
layers, canvas command execution, and video encoding.

## Producer Boundary

`@ui2v/producer` is the bridge between Node.js and the browser. It starts the
local server, launches the browser, exposes progress callbacks, collects
diagnostics, and writes the resulting MP4.

## Design Principles

1. Browser-native rendering for browser-native animation libraries.
2. Deterministic runtime timing shared by preview, inspect, and render.
3. Clear package boundaries for parsing, runtime, rendering, production, and
   CLI concerns.
4. Portable setup without Electron, FFmpeg, or native canvas in the primary
   path.
5. Adapter-friendly runtime contracts for future Canvas, WebGL, DOM, Lottie,
   Pixi, Three.js, and headless backends.

## Known Constraints

- MP4 is the primary output.
- AVC/H.264 is the default codec; HEVC depends on local browser support.
- Browser ESM dependencies are currently loaded through pinned CDN URLs.
- Large renders still transfer encoded video from browser to Node as base64.
