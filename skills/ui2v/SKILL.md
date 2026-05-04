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

## Writing libraries into JSON

When an agent decides to use a library, it must put that decision into the JSON project, not only mention it in prose. Use this process.

### 1. Choose the JSON format

Use a template project when the example is a single coherent animation with custom-code layers:

```json
{
  "mode": "template",
  "duration": 8,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "dependencies": ["canvas2d", "gsap", "d3"],
  "layers": []
}
```

Use runtime JSON when the project needs segment-level dependencies, inspection, scene metadata, or adapter routing:

```json
{
  "schema": "uiv-runtime",
  "duration": 12,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "dependencies": ["canvas2d", "THREE", "gsap"],
  "timeline": { "segments": [] },
  "scene": { "root": { "id": "root", "type": "root", "children": [] } }
}
```

### 2. Map visual intent to dependency keys

Use canonical keys consistently in top-level and segment/layer metadata.

| Visual intent | JSON dependencies |
| --- | --- |
| Data reveal with charts | `["canvas2d", "d3", "math"]` |
| Product/UI launch motion | `["canvas2d", "gsap", "SplitType"]` |
| 3D product/grid/globe scene | `["THREE", "POSTPROCESSING"]` or `["THREE", "Globe"]` |
| Physics cards/particles | `["canvas2d", "Matter"]` or `["THREE", "CANNON"]` |
| Generative art / flow field | `["canvas2d", "p5", "simplex"]` or `["PIXI", "tsParticles"]` |
| Typography/glyph animation | `["canvas2d", "SplitType", "opentype"]` |
| Lottie/icon-driven UI | `["canvas2d", "lottie", "iconify"]` |

If an existing example uses a different canonical key, follow the existing example or `packages/engine/src/sandbox/LibraryManager.ts`.

### 3. Put dependencies at the correct level

Top-level `dependencies` describes the full project. Runtime segment `dependencies` describes what that segment needs at render time:

```json
{
  "schema": "uiv-runtime",
  "dependencies": ["canvas2d", "d3", "gsap"],
  "timeline": {
    "segments": [
      {
        "id": "data-reveal",
        "label": "Data reveal",
        "startTime": 0,
        "endTime": 5,
        "dependencies": ["canvas2d", "d3", "gsap"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      },
      {
        "id": "physics-finale",
        "label": "Physics finale",
        "startTime": 5,
        "endTime": 9,
        "dependencies": ["canvas2d", "Matter"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  }
}
```

For template examples, put project dependencies at the top level and place custom code in the appropriate custom-code layer shape used by nearby examples. Keep the same dependency keys in layer metadata if the schema/example pattern supports layer-level dependencies.

### 4. Use libraries inside the code string

Inside runtime segment code, read the drawing context and then access libraries from the runtime-provided context/global surface used by the renderer. Prefer defensive lookup so examples survive small loader differences:

```js
function render(t, context) {
  const ctx = context.ctx;
  const width = context.width;
  const height = context.height;
  const progress = context.progress;

  const d3 = context.libs?.d3 || globalThis.d3;
  const gsap = context.libs?.gsap || globalThis.gsap;

  const values = [18, 42, 75, 61, 94];
  const x = d3.scaleBand().domain(values.map((_, i) => String(i))).range([180, width - 180]).padding(0.2);
  const y = d3.scaleLinear().domain([0, 100]).range([height - 160, 160]);

  const eased = gsap.parseEase?.('power3.out')?.(Math.min(1, progress)) ?? progress;

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#7dd3fc';
  values.forEach((value, index) => {
    const barHeight = (height - 160 - y(value)) * eased;
    ctx.fillRect(x(String(index)), height - 160 - barHeight, x.bandwidth(), barHeight);
  });
}
```

For `THREE`, `PIXI`, `Matter`, or similar libraries, initialize reusable objects carefully. If the render environment recreates the function per frame, derive state from `t`; if the example pattern provides setup storage, cache expensive objects there.

### 5. Keep code JSON-safe

Custom code is usually stored as a JSON string. Before committing:

- Escape newlines/quotes correctly, or use the repository's existing multiline string pattern if available.
- Do not paste unescaped backticks or invalid JSON control characters into `code`.
- Keep generated code deterministic and frame-based.
- Validate after editing; validation catches malformed JSON before rendering.

### 6. Validate, inspect, render

After writing dependencies and code into JSON, run:

```bash
node packages/cli/dist/cli.js validate examples/<name>/animation.json --verbose
node packages/cli/dist/cli.js render examples/<name>/animation.json -o .tmp/examples/<name>.mp4 --quality high
```

For runtime projects, inspect frames before rendering:

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-core/<file>.json --time 1 --time 5 --time 9 --json
node packages/cli/dist/cli.js render examples/runtime-core/<file>.json -o .tmp/examples/<file-without-json>.mp4 --quality high
```

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
