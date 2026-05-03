# @ui2v/producer

Puppeteer-backed preview and MP4 rendering pipeline for ui2v.

`@ui2v/producer` starts a local browser, serves the built engine packages,
renders frames through Canvas, encodes MP4 with WebCodecs, and writes the output
file from Node.

## Install

```bash
npm install @ui2v/producer
```

## Requirements

- Node.js >= 18
- Chrome, Edge, or Puppeteer's installed Chromium
- Browser WebCodecs support for MP4 export

The primary render path does not require Electron, FFmpeg, or node-canvas.

## Render To File

```ts
import { readFile } from 'node:fs/promises';
import { parseProject } from '@ui2v/core';
import { renderToFile } from '@ui2v/producer';

const project = parseProject(await readFile('animation.json', 'utf8'));

const result = await renderToFile(project, 'output.mp4', {
  quality: 'high',
  codec: 'avc',
  onProgress(progress) {
    console.log(`${progress.phase}: ${Math.round(progress.progress)}%`);
  },
});

if (!result.success) {
  throw new Error(result.error);
}

console.log(result.outputPath, result.fileSize);
```

## Preview

```ts
import { startPreview } from '@ui2v/producer';

const session = await startPreview(project, {
  headless: false,
});

console.log(session.url);
await session.close();
```

## Environment Check

```ts
import { checkBrowserEnvironment, findBrowserExecutable } from '@ui2v/producer';

console.log(findBrowserExecutable());
console.log(await checkBrowserEnvironment());
```

`checkFFmpeg` is still exported as a compatibility alias for older callers, but
new code should use `checkBrowserEnvironment`.

## License

MIT
