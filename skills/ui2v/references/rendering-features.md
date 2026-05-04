# Rendering Features

## System pipeline

- `@ui2v/cli` provides `doctor`, `init`, `validate`, `preview`, `render`, `inspect-runtime`, and `info`.
- `@ui2v/producer` drives local Chrome, Edge, or Chromium through `puppeteer-core`.
- `@ui2v/core` parses and validates project JSON.
- `@ui2v/runtime-core` evaluates timelines, segments, dependencies, frame plans, scene metadata, camera/depth concepts, and adapter routing.
- `@ui2v/engine` runs browser-side rendering and MP4 export through WebCodecs/Mediabunny.

## Browser/library capabilities

ui2v can combine browser rendering APIs with built-in/npm libraries, including:

- Timeline/easing: `gsap`, `anime`, `TWEEN`.
- Data/math: `d3`, `mathjs`.
- 3D/post effects: `three`, `postprocessing`, `globe.gl`.
- Physics: `matter-js`, `cannon`.
- Creative 2D/generative: `pixi.js`, `p5`, `tsparticles`, `simplex-noise`.
- Object/vector systems: `fabric`, `konva`, `paper`, `roughjs`.
- Text/assets: `split-type`, `opentype.js`, `katex`, `lottie`, `iconify`.
- Direct browser drawing/compositing: Canvas APIs and related custom-code layers.

## Project formats

- Template animation JSON: useful for fast examples, custom-code layers, product demos, and launch clips.
- Runtime JSON (`schema: "uiv-runtime"`): useful for segmented timelines, dependency-aware scenes, inspection, and future adapter routing.

## Output assets

- MP4 output is the production artifact.
- GIF/JPG previews are README artifacts.
- `.tmp/examples` is for local rendered MP4s.
- `assets/showcase` is for committed README previews.
