---
name: ui2v
description: Use when creating, editing, validating, rendering, or documenting ui2v animation JSON, README demos, showcase media, runtime-core examples, Canvas/WebCodecs render workflows, or custom-code video projects in the ui2v repository.
metadata:
  short-description: Build and render ui2v videos
---

# ui2v Skill

Use this skill for project work involving ui2v examples, runtime JSON, README media, render/export workflows, or decisions about what the ui2v renderer can produce.

## Core model

ui2v turns structured animation JSON into browser-rendered MP4 video. The common pipeline is:

```text
animation/runtime JSON -> CLI -> producer -> local Chrome/Edge/Chromium -> Canvas/WebCodecs -> MP4
```

Primary project shapes:

- Template projects use `mode: "template"` and usually place custom Canvas code in `examples/<name>/animation.json`.
- Runtime projects use `schema: "uiv-runtime"`, segmented timelines, and `examples/runtime-core/*.json`.
- README media should be committed as compressed GIF/JPG assets in `assets/showcase`; full MP4 renders should stay in `.tmp/examples`, releases, issue attachments, or CDN.

## Create or upgrade examples

When creating README hero demos, launch clips, product showcase videos, data-story videos, logo reveals, or custom-code Canvas examples:

1. Pick a strong example role from `references/example-roles.md` when the goal is marketing/demo quality.
2. Prefer deterministic Canvas 2D custom-code scenes for README demos unless the visual clearly needs another library.
3. Keep examples copyable: `examples/<name>/animation.json`, `README.md`, and `README.zh.md` when appropriate.
4. Design for the first five seconds: clear value proposition, polished motion, readable text, and final CTA/freeze frame.
5. Validate before rendering, then export lightweight README preview assets.

Read `references/canvas-patterns.md` for reusable Canvas composition patterns.

## Choose render capabilities

Use Canvas 2D first for reliable marketing-quality examples. Add dependencies only when the scene needs them.

Common dependency keys:

| Capability | Key | Use for |
| --- | --- | --- |
| Canvas drawing | `canvas2d` | Default custom-code rendering and README demos. |
| Easing/timelines | `anime`, `gsap`, `TWEEN` | Staged animation, tweens, elastic effects. |
| Data visualization | `d3`, `math` | Scales, curves, charts, generated data. |
| 3D | `THREE` | True WebGL scenes, cameras, lighting, meshes. |
| 3D globe | `Globe` | Globe.gl maps, arcs, geospatial stories. |
| Physics | `Matter`, `CANNON` | 2D/3D collisions and simulation. |
| Particles/noise | `tsParticles`, `simplex` | Particle systems and organic motion fields. |
| Creative 2D | `PIXI`, `p5`, `Konva`, `fabric`, `paper`, `rough` | Sprite-heavy, creative, editable, or sketch-like visuals. |
| Text/math/icons | `katex`, `opentype`, `SplitType`, `lottie`, `iconify` | Equations, glyph paths, kinetic typography, vector/icon animation. |
| Post effects | `POSTPROCESSING` | Three.js postprocessing. |

Read `references/rendering-features.md` and `references/library-recipes.md` before using advanced built-in libraries.

## Custom-code signatures

Template custom-code layers:

```js
function createRenderer() {
  function render(time, context) {
    const ctx = context.mainContext;
    const width = context.width;
    const height = context.height;
  }
  return { render };
}
```

Runtime segments:

```js
function render(t, context) {
  const ctx = context.ctx;
  const width = context.width;
  const height = context.height;
  const progress = context.progress;
}
```

Rules:

- Use deterministic `time`/`t` based animation; avoid random behavior unless seeded.
- Keep segment code self-contained.
- Declare `dependencies: ["canvas2d"]` at project and segment level for runtime Canvas custom code.
- Do not use DOM/network-only assumptions inside render code.

## Runtime-core workflow

Use this for `schema: "uiv-runtime"` projects and `examples/runtime-core` files.

Minimal shape:

```json
{
  "schema": "uiv-runtime",
  "id": "uiv-runtime-example",
  "name": "Runtime Example",
  "version": "0.1.0",
  "duration": 12,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "backgroundColor": "#030712",
  "dependencies": ["canvas2d"],
  "timeline": {
    "segments": [
      {
        "id": "hero",
        "label": "Hero",
        "startTime": 0,
        "endTime": 4,
        "dependencies": ["canvas2d"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  },
  "scene": { "root": { "id": "root", "type": "root", "children": [] } }
}
```

Inspect runtime examples when changing segment timing, dependencies, or metadata:

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-core/<file>.json --time 1 --time 5 --time 9 --json
```

Read `references/runtime-patterns.md` for segment timeline and inspection patterns.

## Validation and render workflow

Run from the repository root.

Validate template examples:

```bash
node packages/cli/dist/cli.js validate examples/<name>/animation.json --verbose
```

Validate runtime examples:

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
```

Render template examples:

```bash
node packages/cli/dist/cli.js render examples/<name>/animation.json -o .tmp/examples/<name>.mp4 --quality high
```

Render runtime examples:

```bash
node packages/cli/dist/cli.js render examples/runtime-core/<file>.json -o .tmp/examples/<file-without-json>.mp4 --quality high
```

Export README GIF/JPG assets:

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/<name>.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/<name>.gif

ffmpeg -y -ss 1 -i .tmp/examples/<name>.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/<name>.jpg
```

README media rules:

- Put GIF/JPG paths in `README.md` and `README_zh.md` only if the asset is committed.
- Keep README GIFs ideally under 3 MB; default export is 640px wide, 10fps, 4.5 seconds.
- If a GIF is too large, reduce duration, width, fps, or palette colors before reducing visual quality.
- Never commit `.tmp/examples/*.mp4` unless explicitly requested.
- Read `references/showcase-assets.md` before changing the main README showcase gallery.

## Final checks

Use the narrowest useful checks first, then broader checks when changes affect many examples:

```bash
node scripts/validate-examples.mjs
node -e "const fs=require('fs'); for (const f of ['README.md','README_zh.md']) { const t=fs.readFileSync(f,'utf8'); console.log(f, t.charCodeAt(0)===0xFEFF, [...t].some(ch=>ch.charCodeAt(0)===65533)); }"
```

If rendering fails before launching the browser, run:

```bash
node packages/cli/dist/cli.js doctor
```
