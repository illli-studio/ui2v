# Rendering Features

## Pipeline features

- Browser-backed rendering through puppeteer-core controlling local Chrome, Edge, or Chromium.
- Canvas timeline evaluation and drawing.
- WebCodecs/Mediabunny MP4 export.
- CLI commands: `doctor`, `init`, `validate`, `preview`, `render`, `inspect-runtime`, `info`.
- Render options: quality, fps, width, height, render scale, codec, bitrate, timeout, headless/progress.

## Project formats

- Template animation JSON: best for polished custom-code Canvas examples.
- Runtime JSON (`schema: "uiv-runtime"`): best for segmented timelines, inspection, scene graph, camera/depth metadata, and adapter routing.

## Output assets

- MP4 output is the production artifact.
- GIF/JPG previews are README artifacts.
- `.tmp/examples` is for local rendered MP4s.
- `assets/showcase` is for committed README previews.
