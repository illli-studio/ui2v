# Library Recipes

ui2v examples should use the browser/npm ecosystem as a creative toolkit. Choose libraries for the scene's job, combine them when useful, and keep the final render deterministic.

## Freshness before package use

Before coding against a browser/npm library, confirm that the available `ui2v` CLI and the user's project dependency state match the intended library stack.

- Compare `ui2v --version` with `npm view @ui2v/cli version` when freshness matters or the environment is unknown.
- Run `ui2v doctor` before validation/rendering when the environment is unknown.
- If `ui2v` is missing, outdated, or lacks a needed command/capability, use `npm install -g @ui2v/cli@latest` or `npx @ui2v/cli@latest`.
- If the user project has its own `package.json`, respect its package manager and lockfile when adding authored assets/scripts.
- If the task depends on latest package behavior or a new library version, check package metadata, update the user project deliberately, and run focused validation/rendering.
- Keep browser-rendered dependencies reproducible. Prefer explicit dependency names and stable versions supported by the current CLI over implicit latest URLs.
- Validate and render at least one project that exercises any newly added or updated library.
- Do not generate "Canvas-only by accident" examples. If a scene uses or should
  demonstrate libraries, declare them in JSON and call them in code so the
  runtime dependency plan has real work to preload.

## Runtime loading contract

`@ui2v/engine` installs the supported browser/npm libraries and loads them on
demand. `@ui2v/runtime-core` builds a dependency plan from project, segment, and
node metadata, then also infers common libraries from custom-code references
such as `THREE`, `d3`, `gsap`, `PIXI`, `Matter`, `math`, `simplex`, and
`SplitType`.

AI-authored examples should still list dependencies explicitly. Treat inference
as a safety net for snippets that forgot metadata, not as the main authoring
style.

## Multi-library timeline contract

For multi-library requests, create a library beat sheet before writing JSON. The beat sheet is the contract for what the rendered video must prove.

| Time | Segment/layer | Libraries | Real API use | Visible proof |
| --- | --- | --- | --- | --- |
| 0-1.5s | kinetic title | `gsap`, `SplitType` | split words/letters, eased reveal | letters enter independently with staggered timing |
| 1.5-3s | data proof | `d3`, `math` | scales, curves, interpolation/stat values | chart axes/bars/curve animate from data |
| 3-4.5s | spatial beat | `THREE`, `POSTPROCESSING` | camera, mesh, lights, bloom/pass | 3D object or globe moves with depth |
| 4.5-6s | particle/flow beat | `PIXI`, `simplex` | sprite/container or noise field | particles/flow paths move organically |
| 6-7.5s | physics/object beat | `Matter` or `Konva` | engine bodies or stage/groups | objects collide, settle, or transform as objects |
| 7.5-9s | icon/media beat | `iconify`, `lottie`, media layers | icon JSON/SVG path or animation asset | recognizable icon/motion/media appears correctly |

Rules:

- Do not list a library unless its API is called in the code path for a visible segment/layer.
- Do not combine all requested libraries into one giant custom-code layer. Split them across `timeline.segments[]` or separate template layers.
- Prefer one or two libraries per beat. More is acceptable only when the output clearly benefits from the combination.
- If a library fails to load or cannot be represented honestly in the time available, reduce the library set and render a working video instead of faking usage with labels.
- Canvas can be the final compositor, but the library must still do real work before the Canvas draw call, such as layout, physics, geometry, icon lookup, glyph parsing, or texture generation.

## Sequencing: gsap / anime / TWEEN

Use for polished staged motion: launch beats, panel choreography, scroll-like reveals, elastic cards, camera-ish transitions, and kinetic text timing.

- Prefer timeline objects or explicit easing curves over ad-hoc nested conditions.
- Keep all animation driven by render time so preview and MP4 output match.
- Pair with `SplitType` for word/letter choreography.

## Data and math: d3 / mathjs

Use when generated layouts or data stories matter:

- `d3`: scales, axes, curves, arcs, stacked bars, force layouts, map projections.
- `mathjs`: formulas, interpolation, statistics, matrices, generated values.

A common pattern is to calculate geometry with d3/mathjs and draw the final video layer with the active renderer.

## 3D and spatial visuals: THREE / POSTPROCESSING / Globe

Use for real depth: cameras, lights, meshes, product objects, 3D grids, space scenes, volumetric-feeling motion, postprocessing, and globe/network arcs.

- Use `THREE` when projection math is not enough.
- Use `POSTPROCESSING` for bloom, depth-of-field, glitch, or color passes.
- Use `Globe` for geospatial dashboards, global networks, and arc maps.

## Physics: Matter / CANNON

- `Matter`: 2D collisions, falling cards, bouncing particles, UI blocks, kinetic diagrams.
- `CANNON`: 3D rigid bodies and physics-driven depth visuals.

Keep simulations deterministic. For README clips, short controlled physics beats are better than long chaotic simulations.

## High-density creative scenes: PIXI / p5 / tsParticles / simplex

- `PIXI`: sprite-heavy scenes, many moving objects, GPU-style 2D effects.
- `p5`: procedural sketches, generative art, creative coding scenes.
- `tsParticles`: reusable particle systems and background fields.
- `simplex`: organic flow fields, waves, terrain, liquid-like motion.

Use these when they make the visual richer or easier than hand-writing every primitive.

## Object/vector systems: fabric / Konva / paper / rough

- `fabric`: object-based canvas editing, product mockups, editable shapes.
- `Konva`: layer/stage/group mental model for UI cards and diagram scenes.
- `paper`: vector paths, path interpolation, boolean/path operations.
- `rough`: sketch, whiteboard, wireframe, or hand-drawn explainers.

## Text, glyphs, equations: SplitType / opentype / katex

- `SplitType`: word/letter choreography and headline reveals.
- `opentype`: glyph outlines, text-as-shape effects, path-based logos.
- `katex`: math/equation explainer videos.

Use these when typography is part of the motion concept, not just labels.

## Assets and icons: lottie / iconify

- `lottie`: imported motion design assets and JSON animations.
- `iconify`: icon-driven UI, feature grids, product flows.

Use committed or generated assets so renders stay reproducible.

For local photos, inserted video, and music, put files in `access/` next to
`animation.json` and reference paths such as `access/photo.png`,
`access/clip.mp4`, and `access/music.wav`. Use `image-layer`, `video-layer`,
`audio-layer`, or root `audio.tracks` so validation/preload/export can see the
resources. Avoid hiding local media fetches inside custom code.

## Canvas APIs / canvas2d

Canvas APIs remain an important output and compositing layer, but they are not the whole project. Use them for direct 2D drawing, overlays, masks, charts, particles, and final composition when they are the simplest reliable tool.

## Selection checklist

Before writing an example, decide:

1. What visual problem is this scene solving?
2. Which library makes that problem easier or higher quality?
3. Which dependencies must be declared in project/segment metadata?
4. How will validation, preview, MP4 render, and README GIF/JPG export be verified?
5. What CLI/project dependency check proves the selected library version is the one being rendered?
6. Which timestamp proves each library is visible in the exported video?
