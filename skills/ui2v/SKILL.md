---
name: ui2v
description: Use when creating, editing, validating, rendering, or documenting ui2v animation/video projects that combine structured JSON, runtime timelines, browser rendering, npm/library dependencies, AI-authored custom code, preview workflows, MP4 export, and README showcase media.
metadata:
  short-description: Build library-rich ui2v videos
---

# ui2v Skill

Use this skill for ui2v project work: generating animation JSON, choosing npm/built-in libraries, composing multi-scene timelines, validating examples, rendering MP4, and preparing README showcase assets.

## What ui2v is

ui2v is a code-driven generative video system, not a simple Canvas demo runner. It lets agents create structured animation projects that combine:

- **Project packages**: `@ui2v/core`, `@ui2v/runtime-core`, `@ui2v/engine`, `@ui2v/producer`, and `@ui2v/cli`.
- **Browser runtime**: local Chrome/Edge/Chromium driven by `puppeteer-core`.
- **Rendering and export**: browser drawing APIs, runtime dependency loading, WebCodecs/Mediabunny MP4 export, and CLI preview/render commands.
- **Animation libraries**: `three`, `d3`, `gsap`, `anime`, `matter`, `cannon`, `pixi`, `p5`, `fabric`, `konva`, `rough`, `paper`, `lottie`, `globe.gl`, `tsparticles`, `katex`, `mathjs`, `opentype`, `simplex-noise`, `split-type`, and postprocessing utilities.
- **AI-friendly authoring**: JSON projects and custom-code segments that an agent can generate, validate, inspect, render, and iterate.

The typical pipeline is:

```text
animation/runtime JSON -> @ui2v/cli -> @ui2v/producer -> browser runtime -> selected libraries/adapters -> WebCodecs/Mediabunny -> MP4
```

## Project formats

- **Template animation JSON**: good for quick examples, launch clips, UI demos, kinetic typography, data visuals, and custom-code layers.
- **Runtime JSON (`schema: "uiv-runtime"`)**: best for segmented timelines, dependency metadata, scene/camera/depth concepts, frame inspection, and adapter routing.
- **README media assets**: render MP4 locally, then commit compressed GIF/JPG previews in `assets/showcase`; keep full MP4 files in `.tmp/examples`, releases, issue attachments, or CDN.

## Example creation workflow

When creating README hero demos, product launches, data stories, logo reveals, dashboard videos, or AI-generated examples:

1. Define the role and target viewer: launch trailer, SaaS product clip, data narrative, command center, creative coding reel, runtime-core demo, or brand opener.
2. Choose the visual stack deliberately. Combine libraries when they add real value: `gsap`/`anime` for sequencing, `d3`/`math` for data, `THREE`/`POSTPROCESSING` for 3D, `Matter`/`CANNON` for physics, `PIXI`/`p5` for creative scenes, `lottie`/`iconify` for imported motion/icons, and Canvas APIs for final compositing when useful.
3. Encode the video as structured JSON with clear duration, fps, resolution, scenes/segments, dependencies, and deterministic time-based rendering.
4. Validate early, inspect runtime frames when using `uiv-runtime`, then render MP4 and export lightweight README previews.
5. Keep examples copyable and marketable: include `examples/<name>/animation.json`, localized README notes when relevant, and preview assets if promoted in the root README.

Read `references/example-roles.md` for demo roles and `references/canvas-patterns.md` only when low-level Canvas composition patterns are needed.

## Library selection strategy

Do not default to "just Canvas". Start from the desired visual outcome, then pick the smallest reliable stack that creates it.

| Goal | Prefer | Notes |
| --- | --- | --- |
| Product launch / UI motion | `gsap`, `anime`, `SplitType`, Canvas APIs | Use sequencing libraries for polished beats and text choreography. |
| Data storytelling | `d3`, `math`, Canvas APIs | Compute scales/layout with libraries, then render charts/overlays. |
| 3D / depth / product scenes | `THREE`, `POSTPROCESSING`, `Globe` | Use real cameras, lights, meshes, globe arcs, and post effects. |
| Physics motion | `Matter`, `CANNON` | Use deterministic seeded simulations or precomputed timelines. |
| Particle / generative art | `tsParticles`, `simplex`, `p5`, `PIXI` | Use libraries for dense systems and procedural effects. |
| Vector/object editing visuals | `fabric`, `Konva`, `paper`, `rough` | Use scene graph or vector helpers when they simplify authoring. |
| Text, equations, glyphs | `SplitType`, `opentype`, `katex` | Use for kinetic typography, glyph outlines, or explainer math. |
| Imported motion/assets | `lottie`, `iconify` | Use when an actual Lottie/icon asset is available or generated. |

Read `references/rendering-features.md` for platform capabilities and `references/library-recipes.md` before selecting advanced dependencies.

## Dependency declaration

Use canonical dependency keys and only declare libraries the project or segment actually uses. Runtime examples should declare dependencies at both project and segment level when segment code needs them.

```json
{
  "dependencies": ["canvas2d", "d3", "gsap"],
  "timeline": {
    "segments": [
      {
        "id": "data-reveal",
        "startTime": 0,
        "endTime": 5,
        "dependencies": ["canvas2d", "d3", "gsap"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  }
}
```

Use names consistently with the renderer's library manager and existing examples. If unsure, inspect similar examples or references before inventing names.

## Custom code shapes

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

- Make animation deterministic from `time`/`t`; seed or precompute any randomness.
- Keep segment code self-contained and dependency-aware.
- Use library APIs where they reduce complexity or improve quality; use lower-level drawing only when it is the right final output layer.
- Avoid network-only assumptions during render. Bundle or reference committed assets when the output must be reproducible.

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
  "dependencies": ["canvas2d", "gsap"],
  "timeline": {
    "segments": [
      {
        "id": "hero",
        "label": "Hero",
        "startTime": 0,
        "endTime": 4,
        "dependencies": ["canvas2d", "gsap"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  },
  "scene": { "root": { "id": "root", "type": "root", "children": [] } }
}
```

Inspect runtime examples when changing segment timing, dependencies, adapters, camera/depth metadata, or render routing:

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

Use focused checks first, then broader checks when changes affect many examples:

```bash
node scripts/validate-package-metadata.mjs
node scripts/validate-package-packs.mjs
node scripts/validate-examples.mjs
node scripts/validate-docs-assets.mjs
node -e "const fs=require('fs'); for (const f of ['README.md','README_zh.md']) { const t=fs.readFileSync(f,'utf8'); console.log(f, t.charCodeAt(0)===0xFEFF, [...t].some(ch=>ch.charCodeAt(0)===65533)); }"
```

If rendering fails before launching the browser, run:

```bash
node packages/cli/dist/cli.js doctor
```
