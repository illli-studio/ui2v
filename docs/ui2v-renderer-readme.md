# Renderer Notes

[中文](ui2v-renderer-readme.zh.md)

The ui2v renderer is browser-first. It uses browser APIs for the work browsers
already do well: Canvas drawing, DOM-compatible libraries, and WebCodecs video
encoding.

## Primary Path

```text
Node.js CLI
  -> @ui2v/producer
  -> Puppeteer browser page
  -> @ui2v/runtime-core frame evaluation
  -> @ui2v/engine Canvas render
  -> WebCodecs MP4 encode
  -> Node.js file write
```

## Why Browser-First

- Animation libraries such as GSAP, Three.js, D3, Pixi, Fabric, Lottie, and p5
  are designed around browser APIs.
- WebCodecs provides browser-native video encoding without requiring FFmpeg in
  the main path.
- Preview and export can share the same runtime timing model.
- The CLI can avoid Electron and native canvas bindings.

## Custom Code

`custom-code` layers can draw directly to Canvas through the render context.
The renderer supports several entrypoint styles, including `createRenderer()`,
objects with `render`, standalone render functions, and compatible module/class
shapes.

## Export

The production path currently targets MP4. AVC/H.264 is the default codec
because it is the most broadly available Chromium WebCodecs path. HEVC support
depends on the launched browser.

## Constraints

- Browser-side dependencies currently come from the producer import map and may
  use pinned CDN URLs.
- Encoded output is currently returned to Node as base64 before being written.
- Long or high-resolution renders should use conservative resolution, fps, and
  quality settings until streaming output lands.
