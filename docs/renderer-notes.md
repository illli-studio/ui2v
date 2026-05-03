# Renderer Notes

[Chinese](renderer-notes.zh.md)

The ui2v renderer is browser-first. It uses browser APIs for the work browsers
already do well: Canvas drawing, DOM-compatible animation libraries, and
WebCodecs video encoding.

## Primary Path

```text
Node.js CLI
  -> @ui2v/producer
  -> Puppeteer browser page
  -> @ui2v/runtime-core frame evaluation
  -> @ui2v/engine Canvas render
  -> WebCodecs MP4 encode
  -> streamed Node.js file write
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

Typical CLI usage through `@ui2v/cli`:

```bash
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --render-scale 2
ui2v preview animation.json --pixel-ratio 2
```

Encoded MP4 blobs are streamed from the browser page back to Node.js in chunks,
then written to a temporary file and renamed into place. This avoids returning a
single large base64 payload through Puppeteer for long or high-resolution
renders.

## Constraints

- Browser-side dependencies currently come from the producer import map and may
  use pinned CDN URLs.
- Very large renders still depend on the launched Chromium build's WebCodecs
  codec support and available memory.
