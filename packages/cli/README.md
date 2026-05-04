# @ui2v/cli

[Chinese](README.zh.md)

Command-line interface for validating, previewing, inspecting, and rendering
ui2v animation JSON projects.

Most users should install the short package name:

```bash
npm install -g ui2v
# or: bun install -g ui2v
ui2v --version
```

This implementation package can also be installed directly:

```bash
npm install -g @ui2v/cli
```

## First Render

```bash
ui2v doctor
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

Run without a global install:

```bash
npx ui2v --version
npx ui2v render examples/hero-ai-launch/animation.json -o hero-ai-launch.mp4 --quality high
```

## Commands
The preview command opens a local Studio UI with a searchable JSON project list, timeline scrubbing, fit/theater/fullscreen controls, runtime debug overlay, and an Export MP4 action.


```bash
ui2v doctor
ui2v init my-video
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v inspect-runtime animation.json --time 0 --time 1
ui2v render animation.json -o output.mp4
ui2v info
```

## Render Options

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

`render` currently targets MP4. AVC/H.264 is the default codec. HEVC can be
requested only when the local browser supports it.

## Local Development

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
```

If no browser is found, install Chrome, Edge, or Chromium locally. If auto-detection fails, set one of these environment variables:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome node packages/cli/dist/cli.js doctor
CHROME_PATH=/path/to/chrome node packages/cli/dist/cli.js doctor
```

## License

MIT
