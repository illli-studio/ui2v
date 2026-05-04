---
name: ui2v-example-creator
description: Use when creating or upgrading ui2v animation examples, README hero demos, product launch clips, data-story videos, logo reveals, social launch ads, or custom-code Canvas animation JSON for this ui2v repository.
metadata:
  short-description: Create compelling ui2v examples
---

# ui2v Example Creator

Use this skill to create examples that make ui2v attractive to users. The goal is not only technical validity; examples should be marketing-quality, easy to copy, and visually clear as README GIFs.

## Coordinate with render capabilities

Before choosing visual techniques or built-in libraries, use `$ui2v-render-capabilities` guidance. This project has a large browser rendering surface: Canvas 2D, WebCodecs export, runtime timelines, and built-in libraries such as Three, D3, GSAP, anime, Matter, Cannon, Pixi, p5, Fabric, Konva, Rough, Paper, Lottie, Globe.gl, tsParticles, KaTeX, mathjs, opentype, simplex-noise, SplitType, and postprocessing.

## Core workflow

1. Pick the example role before writing code:
   - **Hero**: first-impression README trailer, cinematic and broad.
   - **Product**: SaaS/app/devtool launch video users can customize.
   - **Capability**: demo reel for particles, data, depth, transitions, export flow.
   - **Business data**: dashboard, ops, commerce, analytics, command center.
   - **Smoke**: minimal test only; keep boring examples out of README hero slots.
2. Prefer `mode: "template"` with one `custom-code` Canvas layer for polished visual examples.
3. Use `uiv-runtime` only when the example is specifically about runtime segments, inspection, camera/depth metadata, or shared runtime flow.
4. Keep visual copy large and readable at 640px-wide GIF preview.
5. Include a clear CTA or final lockup for marketing examples.
6. Validate after editing with `node packages/cli/dist/cli.js validate <path> --verbose`.

## Visual quality checklist

- Use 1920x1080, 30fps, 6-16 seconds for README demos.
- Use cinematic dark backgrounds with radial glows, light sweeps, depth grids, or particles.
- Use 3-5 visual beats, not one static screen.
- Use named helper functions inside the custom-code string: `clamp`, `easeOut`, `roundedRect`, `drawBackground`, `drawProgress`.
- Avoid tiny text, dense paragraphs, and low-contrast UI.
- Avoid external assets unless the example explicitly demonstrates asset loading.
- Use project colors: cyan `#00D4FF`, green `#7BD88F`, amber `#F2AA4C`, dark `#030712`.

## Files to update

For a new example under `examples/<name>`:

- `examples/<name>/animation.json`
- `examples/<name>/README.md`
- `examples/<name>/README.zh.md`
- optionally `README.md` and `README_zh.md` if it belongs in the main gallery

For a runtime example under `examples/runtime-core`:

- `examples/runtime-core/<name>.json`
- update `examples/runtime-core/README.md` and `examples/runtime-core/README.zh.md` if it is a featured demo

## Example JSON shape

```json
{
  "id": "hero-ai-launch",
  "mode": "template",
  "duration": 8,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "backgroundColor": "#030712",
  "template": {
    "layers": [
      {
        "id": "hero-ai-launch-canvas",
        "name": "README hero Canvas scene",
        "type": "custom-code",
        "zIndex": 1,
        "startTime": 0,
        "endTime": 8,
        "visible": true,
        "opacity": 1,
        "properties": {
          "code": "function createRenderer() {\n  function render(time, context) {\n    const ctx = context.mainContext;\n  }\n  return { render };\n}"
        }
      }
    ]
  }
}
```

## Writing custom-code Canvas

- Export `function createRenderer() { return { render }; }` for template examples.
- Render signature is `render(time, context)`.
- Use `context.mainContext`, `context.width`, and `context.height`.
- Avoid browser APIs outside Canvas unless already used by adjacent examples.
- Keep all animation deterministic from `time`; do not use randomness at render time.

## When to read references

- Read `references/example-roles.md` when choosing which examples belong in README.
- Read `references/canvas-patterns.md` when writing or refactoring large custom-code strings.
