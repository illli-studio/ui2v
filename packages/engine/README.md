# @ui2v/engine

Browser rendering engine for ui2v.

The engine runs inside a browser context and renders ui2v projects to Canvas. It
is used by `@ui2v/producer` for preview and MP4 export through Puppeteer,
Chromium, Canvas, and WebCodecs.

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

## Notes

- This package is browser-first and expects DOM, Canvas, and WebCodecs for
  export paths.
- Some legacy compatibility exports remain for older ui2v integrations, but the
  standalone CLI path does not require Electron, FFmpeg, or node-canvas.

## License

MIT
