# @ui2v/engine

[中文](README.zh.md)

Browser rendering engine for ui2v. It renders projects to Canvas and supports
browser-native MP4 export through WebCodecs.

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

- This package expects browser APIs such as DOM, Canvas, and WebCodecs.
- The standalone CLI path does not require Electron, FFmpeg, or `node-canvas`.
- Some compatibility exports remain for older ui2v integration paths.

## License

MIT
