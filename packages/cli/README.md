# @ui2v/cli

[中文](README.zh.md)

Command-line interface for validating, previewing, inspecting, and rendering
ui2v animation JSON projects.

## Install

```bash
npm install -g ui2v
# or: bun install -g ui2v
ui2v --version
```

Run without global install:

```bash
npx ui2v --version
```

## Commands

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

If no browser is found, install Chrome or Edge, set
`PUPPETEER_EXECUTABLE_PATH`, or run:

```bash
npx puppeteer browsers install chrome
```

## License

MIT
