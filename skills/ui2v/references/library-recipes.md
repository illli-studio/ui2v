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

## Canvas APIs / canvas2d

Canvas APIs remain an important output and compositing layer, but they are not the whole project. Use them for direct 2D drawing, overlays, masks, charts, particles, and final composition when they are the simplest reliable tool.

## Selection checklist

Before writing an example, decide:

1. What visual problem is this scene solving?
2. Which library makes that problem easier or higher quality?
3. Which dependencies must be declared in project/segment metadata?
4. How will validation, preview, MP4 render, and README GIF/JPG export be verified?
5. What CLI/project dependency check proves the selected library version is the one being rendered?
