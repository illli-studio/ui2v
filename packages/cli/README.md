# ui2v CLI

Standalone command-line renderer for ui2v JSON animations.

## Requirements

- Node.js >= 18
- Chrome, Edge, or Puppeteer's bundled Chromium

The renderer does not require Electron, FFmpeg, or node-canvas. It launches a browser with Puppeteer, renders with the ui2v Canvas engine, encodes MP4 with WebCodecs, and writes the video back to the requested output path.

## Install

```bash
npm install -g @ui2v/cli
ui2v --version
```

Run without a global install:

```bash
npx @ui2v/cli --version
```

The npm package is `@ui2v/cli`; the installed command is `ui2v`.

## Local Build

```bash
bun install
bun run build
```

## Commands

```bash
ui2v doctor
ui2v init my-video
ui2v validate animation.json
ui2v preview animation.json
ui2v render animation.json -o output.mp4
```

Render options:

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300
```

Currently, `render` supports MP4 output with AVC/H.264 by default. HEVC can be requested with `--codec hevc` when the local browser supports it. If `--fps` is omitted, the renderer uses the frame rate from the project JSON.

Use `--render-scale` to supersample frames before encoding. For example,
`--width 1280 --height 720 --render-scale 2` renders internally at 2560x1440,
then downsamples to a 1280x720 video for cleaner edges and text.

Preview uses a 2x canvas pixel ratio by default for sharper browser playback.
Use `--pixel-ratio 1` for lower GPU usage, or increase it up to
`--pixel-ratio 4` when checking fine details:

```bash
ui2v preview animation.json --pixel-ratio 3
```

## Local Development

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

If no browser is found, install Chrome or Edge, set `PUPPETEER_EXECUTABLE_PATH`, or run:

```bash
npx puppeteer browsers install chrome
```

## License

MIT
