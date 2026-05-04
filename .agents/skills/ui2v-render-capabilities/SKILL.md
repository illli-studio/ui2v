---
name: ui2v-render-capabilities
description: Use when deciding what ui2v can render or which built-in rendering library to use, including Canvas 2D, WebCodecs/MP4 export, runtime timelines, custom-code layers, and the engine's built-in libraries such as three, d3, gsap, anime, matter, cannon, pixi, p5, fabric, konva, rough, paper, lottie, globe.gl, tsparticles, katex, mathjs, opentype, simplex-noise, split-type, and postprocessing.
metadata:
  short-description: Know ui2v rendering capabilities
---

# ui2v Render Capabilities

Use this skill before designing a ui2v animation, choosing libraries, or explaining what the renderer can do. ui2v is a browser-backed video renderer: structured JSON drives a local Chrome/Edge/Chromium + Canvas/WebCodecs pipeline and exports MP4 from Node.

## Project-specific renderer model

- **Input**: `animation.json` using `mode: "template"`, or runtime JSON using `schema: "uiv-runtime"`.
- **Primary drawing surface**: browser Canvas 2D through custom-code layers or runtime segments.
- **Preview/render path**: CLI -> producer -> puppeteer-core controls local Chrome/Edge/Chromium -> engine/runtime -> Canvas -> WebCodecs/Mediabunny -> MP4 file.
- **Best examples**: high-polish custom-code Canvas scenes with deterministic `time`-based animation.
- **README media**: render MP4, then export short GIF/JPG previews into `assets/showcase`.

## Built-in library map

The engine preloads or can preload these names via `packages/engine/src/sandbox/LibraryManager.ts`. Use dependency names exactly when declaring runtime/project dependencies.

| Capability | Library key | Use for |
| --- | --- | --- |
| Core vector/video drawing | `canvas2d` | Default Canvas 2D custom-code rendering; always prefer for README demos. |
| Easing/timelines | `anime`, `gsap`, `TWEEN` | Complex staged animation, sequencing, tweens, elastic effects. |
| Data visualization | `d3`, `math` | Scales, shapes, curves, statistics, generated charts. |
| 3D rendering | `THREE` | WebGL scenes, cameras, lights, meshes, depth-heavy visuals. |
| 3D globe | `Globe` | Globe.gl world maps, arcs, geographic storytelling. |
| 3D physics | `CANNON` | Rigid-body simulation paired with Three-like visuals. |
| 2D physics | `Matter` | Collisions, particles, kinetic UI objects. |
| Particles | `tsParticles`, `simplex` | Particle systems, noise fields, organic motion. |
| High-performance 2D/WebGL | `PIXI` | Sprite-heavy visuals, many objects, game-like scenes. |
| Creative coding | `p5` | Generative art, sketches, noise, procedural visuals. |
| Scene graph canvas | `Konva`, `fabric`, `paper` | Editable/vector-like canvas objects, paths, shapes. |
| Hand-drawn style | `rough` | Sketchy diagrams, rough charts, playful explainers. |
| Text/math/fonts | `katex`, `opentype`, `SplitType` | Equations, font/path work, kinetic typography. |
| Vector animation/icons | `lottie`, `iconify` | Lottie JSON playback, icon-driven UI scenes. |
| DOM/CSS helpers | `emotion` | CSS generation when examples involve DOM/html-to-canvas. |
| Post effects | `POSTPROCESSING` | Three.js postprocessing effects when using WebGL. |

## Selection rules

- For fastest, most reliable examples: use pure Canvas 2D with helper functions.
- For marketing README demos: Canvas 2D usually looks best and avoids library load failures.
- For data stories: use Canvas 2D directly, or `d3`/`math` when scales/layout/statistics matter.
- For particles: Canvas 2D is enough for controlled hero effects; use `tsParticles` for reusable particle systems; use `simplex` for organic flow fields.
- For pseudo-3D: use Canvas projection math first; use `THREE` only when true 3D scene/camera/lights are needed.
- For physics: use `Matter` for 2D collisions; use `CANNON` for 3D rigid-body concepts.
- For typography: use Canvas text for simple titles; use `SplitType` for letter/word choreography; use `opentype` for glyph path effects; use `katex` for formulas.
- For icon/UI demos: `iconify`, `lottie`, `fabric`, or `Konva` are useful, but do not add them unless the visual specifically needs them.

## Dependency declaration patterns

Template examples usually work without explicit dependencies when using pure Canvas custom code. Runtime examples should include dependencies when using segment code:

```json
{
  "dependencies": ["canvas2d", "d3"],
  "timeline": {
    "segments": [
      {
        "id": "data",
        "dependencies": ["canvas2d", "d3"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  }
}
```

Use normalized keys from the table. Aliases may work, but skills should emit canonical keys.

## Custom-code signatures

Template layer:

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

Runtime segment:

```js
function render(t, context) {
  const ctx = context.ctx;
  const width = context.width;
  const height = context.height;
  const progress = context.progress ?? 0;
}
```

## Quality guidance

- Design for 1920x1080 at 30fps, then compress to 640px GIF for README.
- Make first 4.5 seconds representative because README GIFs are clipped.
- Prefer deterministic math over random state.
- If using heavy libraries, validate and render early; fallback to Canvas if library loading becomes fragile.

## When to read references

- Read `references/library-recipes.md` for specific library usage patterns and examples.
- Read `references/rendering-features.md` for a compact list of ui2v rendering/export features.
