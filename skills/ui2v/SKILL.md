---
name: ui2v
description: Use when creating, editing, validating, rendering, or documenting ui2v animation/video projects that use structured JSON, segmented storyboards, runtime timelines, XYZ/depth/camera motion, dependency-aware scene nodes, custom code, browser/npm animation libraries, preview/render workflows, MP4 export, and README showcase media.
metadata:
  short-description: Build complete ui2v videos
---

# ui2v Skill

Use this skill for ui2v work: AI-authored animation JSON, segmented shot planning, runtime-core scenes, library/dependency selection, custom code, validation, preview, MP4 render, and README media export.

## Mental model

ui2v is a full code-driven generative video system, not a single Canvas helper. Treat each video as a structured project:

```text
idea -> storyboard/segments -> JSON schema -> dependencies/libraries -> custom code or scene nodes -> validate/inspect -> preview/render -> GIF/JPG/MP4 assets
```

Core project features to use when they fit:

- **Segmented timelines**: `timeline.segments[]` with `startTime`, `endTime`, `label`, `transition`, `camera`, dependencies, and code.
- **Segmented storyboard**: plan shots before code; each segment should have a visual job, motion beat, library stack, and CTA/outcome.
- **Runtime-core**: `schema: "uiv-runtime"`, frame inspection, scene graph, camera/depth metadata, audio/narration markers, datasets/assets/theme, adapter routing.
- **XYZ/depth/camera**: use `camera.x/y/z`, `zoom`, `fov`, `rotation`, `motion[]`, node transforms, z ordering, pseudo-depth, or real `THREE` scenes.
- **Library ecosystem**: combine `gsap`, `anime`, `d3`, `math`, `THREE`, `POSTPROCESSING`, `Matter`, `CANNON`, `PIXI`, `p5`, `tsParticles`, `simplex`, `fabric`, `Konva`, `paper`, `rough`, `SplitType`, `opentype`, `katex`, `lottie`, `iconify`, `Globe`, and Canvas APIs as needed.
- **Reproducible media workflow**: validate JSON, inspect runtime frames, render MP4, export README GIF/JPG, keep large MP4s out of the repo unless requested.

## Start every generation with a storyboard

Before writing JSON, produce a compact shot plan:

| Time | Shot | Visual job | Motion/depth | Libraries | Output |
| --- | --- | --- | --- | --- | --- |
| 0-2s | Hook | Establish product/problem | fast push-in, parallax | `gsap`, `SplitType` | readable title |
| 2-5s | Proof | Show data/UI/system | chart reveal, z layers | `d3`, `math` | concrete capability |
| 5-8s | Wow | 3D/particles/physics beat | orbit, z move, bloom | `THREE`, `POSTPROCESSING` | visual surprise |
| 8-10s | CTA | Lockup and command | settle, glow, freeze | selected stack | final frame |

Then encode that plan into `timeline.segments[]` or template layers. Do not jump straight to a single long code blob unless the clip is tiny.

Read `references/storyboard-runtime.md` for detailed segmented storyboard, XYZ/depth/camera, transitions, markers, scene graph, and runtime-core patterns.

## Choose the right JSON shape

- Use **template animation JSON** for quick product clips, launch trailers, UI demos, kinetic typography, and examples that mirror existing `examples/<name>/animation.json` files.
- Use **runtime JSON (`schema: "uiv-runtime"`)** for segmented timelines, shot inspection, camera/depth, dependency-aware segments, scene graph metadata, datasets/assets/theme, narration/audio markers, or adapter routing.

Read `references/json-authoring.md` for exact JSON recipes, dependency placement, library access inside `code`, and JSON-safe custom-code rules.

## Choose libraries by visual intent

Do not default to just one rendering primitive. Pick the smallest reliable stack that creates the desired shot.

| Goal | Prefer |
| --- | --- |
| Product/UI launch | `gsap`, `anime`, `SplitType`, Canvas APIs |
| Data story | `d3`, `math`, Canvas APIs |
| 3D/depth/product/globe | `THREE`, `POSTPROCESSING`, `Globe` |
| Physics | `Matter`, `CANNON` |
| Generative art/particles | `PIXI`, `p5`, `tsParticles`, `simplex` |
| Vector/object systems | `fabric`, `Konva`, `paper`, `rough` |
| Typography/equations/glyphs | `SplitType`, `opentype`, `katex` |
| Imported motion/icons | `lottie`, `iconify` |

Read `references/library-recipes.md` before choosing advanced dependencies and `references/rendering-features.md` for the full platform feature map.

## Authoring rules

- Write clear `duration`, `fps`, `resolution`, `backgroundColor`, `theme`, `assets`, `datasets`, and `dependencies` when relevant.
- Use `timeline.segments[]` for multi-shot clips. Give every segment a label, timing, dependency list, visual purpose, and deterministic code.
- Use camera/depth intentionally: `z < 0` increases effective zoom; `fov` controls perspective; `camera.motion[]` creates keyframed moves; segment `camera` creates shot-local moves.
- Use `transition` on segments for structured in/out blends; keep transitions short and purposeful.
- Use `audio.markers` / `narration` / `markers` for beats, VO cues, or sync points when a clip has rhythm.
- Use dependencies at top level and segment/layer level. The JSON should explain what each shot needs to load.
- Keep custom code deterministic from `time`/`t`; seed randomness; avoid network-only assumptions.
- Prefer a composed, inspectable project over a giant unstructured script.

## Custom code entrypoints

Template custom-code layers usually expose:

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

Runtime segment code exposes:

```js
function render(t, context) {
  const ctx = context.ctx;
  const width = context.width;
  const height = context.height;
  const progress = context.progress;
}
```

The custom-code inspector can detect/sanitize common entrypoints and dependency hints, but valid JSON and deterministic code are still required.

## Validation and render workflow

Run from the repo root.

```bash
node packages/cli/dist/cli.js validate examples/<name>/animation.json --verbose
node packages/cli/dist/cli.js render examples/<name>/animation.json -o .tmp/examples/<name>.mp4 --quality high
```

Runtime projects:

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-core/<file>.json --time 1 --time 5 --time 9 --json
node packages/cli/dist/cli.js render examples/runtime-core/<file>.json -o .tmp/examples/<file-without-json>.mp4 --quality high
```

README assets:

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/<name>.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/<name>.gif

ffmpeg -y -ss 1 -i .tmp/examples/<name>.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/<name>.jpg
```

Read `references/showcase-assets.md` before changing root README gallery assets.

## Final checks

Use focused checks first; run broader checks before committing broad changes:

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
