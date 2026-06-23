# @ui2v/engine

[Chinese](README.zh.md)

Browser rendering engine for ui2v. It renders projects to Canvas and supports
browser-native MP4 export through WebCodecs.
It also owns the browser/npm dependency manager used by `custom-code` layers.

**Core libraries (maintained examples):** `d3`, `gsap`, `animejs`, `three`, `pixi.js`, `matter-js`, `lottie-web`.

**Extended libraries:** `fabric`, `konva`, `paper`, `p5`, `tsparticles`, `cannon-es`, `roughjs`, `@tweenjs/tween.js`, `katex`, `iconify`, `opentype.js`, `split-type`.

**Experimental loaders:** `postprocessing`, `simplex-noise`, `mathjs`.

Browser/npm libraries are loaded on demand through a pinned CDN import map
(`BROWSER_LIBRARY_IMPORT_MAP`). They are not required npm dependencies for CLI
installs.

## Install

```bash
npm install @ui2v/engine
```

## Usage

```ts
import { Ui2vEngine } from '@ui2v/engine';
import type { AnimationProject } from '@ui2v/core';

const canvas = document.querySelector('canvas')!;
const engine = new Ui2vEngine(canvas);

await engine.loadProject(project as AnimationProject);
await engine.renderFrameAsync(1.25);
engine.dispose();
```

## Key Exports

- `Ui2vEngine` for browser Canvas rendering.
- `TemplateCanvasAdapter` for runtime-core adapter integration.
- `CustomCodeRenderer` for `custom-code` template layers.
- `CanvasDrawCommandExecutor` for runtime draw command streams.
- `WebCodecsExporter` for browser-native MP4 encoding.
- `LibraryManager` and `getLibraryManager` for dependency-aware custom-code
  library loading.

## Custom-Code Libraries

Projects can declare dependencies on a custom-code layer:

```json
{
  "type": "custom-code",
  "dependencies": ["d3", "gsap", "three"],
  "properties": {
    "code": "function render(t, context) { const v = new THREE.Vector3(1, 2, 3); }"
  }
}
```

The runtime also infers common dependencies from code references such as
`THREE`, `d3`, `gsap`, `PIXI`, and `Matter`. Explicit metadata is still
recommended because it makes AI-authored projects easier to audit.

## Notes

- This package expects browser APIs such as DOM, Canvas, and WebCodecs.
- The standalone CLI path does not require Electron, FFmpeg, or `node-canvas`.
- Some compatibility exports remain for older ui2v integration paths.

## License

MIT
