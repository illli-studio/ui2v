# @ui2v/producer

[Chinese](README.zh.md)

System-browser preview and MP4 rendering pipeline for ui2v.

`@ui2v/producer` starts a local static server, controls a local Chrome/Edge/Chromium browser with `puppeteer-core`, loads the built ui2v bundles, renders frames through Canvas, encodes MP4 with WebCodecs, and writes the output from Node.js.

## Install

```bash
npm install @ui2v/producer
```

## Requirements

- Node.js 18 or newer
- Locally installed Chrome, Edge, or Chromium
- Browser WebCodecs support for MP4 export

No browser is downloaded during install. If auto-detection fails, set `PUPPETEER_EXECUTABLE_PATH`, `CHROME_PATH`, `CHROMIUM_PATH`, or `EDGE_PATH`.

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
```

## Preview

```ts
import { startPreview } from '@ui2v/producer';

const session = await startPreview(project, { headless: false });
console.log(session.url);
await session.close();
```

The preview page includes a left-side JSON project library, timeline controls, playback speed, fit/theater/fullscreen modes, debug overlay, PNG snapshot export, copyable CLI render commands, and an Export MP4 button. Keyboard shortcuts: Space toggles playback, `f` toggles fullscreen, `t` toggles theater, and `d` toggles debug. When started from the CLI, exports are written to `.tmp/examples`.


## Browser Discovery

```ts
import {
  checkBrowserEnvironment,
  findBrowserExecutable,
  resolveBrowserExecutable,
  resolveRequiredBrowserExecutable,
} from '@ui2v/producer';

console.log(resolveBrowserExecutable());
console.log(findBrowserExecutable());
console.log(resolveRequiredBrowserExecutable());
console.log(await checkBrowserEnvironment());
```

`checkFFmpeg` remains as a compatibility alias. New code should use `checkBrowserEnvironment`.

## License

MIT