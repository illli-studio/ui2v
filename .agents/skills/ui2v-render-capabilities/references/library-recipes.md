# Library Recipes

## Canvas 2D

Use for nearly every polished README demo. It is stable, deterministic, and easy to render into MP4.

Typical visuals: glass UI, dashboards, data bars, sparklines, particles, pseudo-3D projections, progress bars, text lockups.

## d3 + math

Use when generated data layout matters:

- d3 scales and curves for axes, arcs, stacked bars, force layouts.
- mathjs for formulas, interpolation, matrix-like calculations, statistics.

Prefer drawing final shapes manually with Canvas after computing positions.

## anime / gsap / TWEEN

Use when many properties need staged easing. For simple examples, hand-written `easeOut(time)` is clearer and more deterministic.

## THREE + POSTPROCESSING

Use for true 3D scenes: camera, lights, meshes, particles, post effects. Keep a Canvas fallback if the effect can be represented with projection math.

Common uses: rotating product objects, depth grids, glowing 3D text, globe/space scenes.

## Matter / CANNON

- `Matter`: 2D physics, collisions, falling cards, bouncing particles.
- `CANNON`: 3D rigid bodies, physics-driven depth visuals.

Avoid long simulations in README clips unless they are deterministic and visually stable.

## PIXI / p5

- `PIXI`: sprite-heavy or many-object WebGL-like 2D scenes.
- `p5`: procedural creative coding and generative art.

Use only when Canvas 2D would be too verbose or slow.

## fabric / Konva / paper / rough

- `fabric`: object-like canvas editing, product mockups, editable shapes.
- `Konva`: staged scene graph, layered UI cards, shape groups.
- `paper`: vector paths and path operations.
- `rough`: hand-drawn/sketch style diagrams.

## lottie / iconify

Use for imported animated assets or icon-driven UI. If no external Lottie/icon asset exists, draw with Canvas instead.

## katex / opentype / SplitType

- `katex`: math equations in explainer videos.
- `opentype`: glyph outlines and custom font path animation.
- `SplitType`: kinetic typography by words/letters.

For README hero demos, large Canvas text is usually enough.

## Globe / tsParticles / simplex

- `Globe`: geographic maps, network arcs, global dashboards.
- `tsParticles`: reusable particle configurations.
- `simplex`: organic waves, flow fields, natural motion.
