# Basic Text Example

[Chinese](README.zh.md)

A compact sanity-check project for ui2v. It renders a short 1080p typography
scene with a custom-code Canvas layer, animated cards, a moving scan line, and
a timeline progress bar.

Use this when you want to confirm that validation, preview, browser rendering,
and MP4 export all work in your environment.

## Files

- `animation.json`: 5-second 1920x1080 animation at 30fps

## Usage

From this directory:

```bash
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v render animation.json -o output.mp4
```

From the repository root with the published CLI:

```bash
ui2v validate examples/basic-text/animation.json --verbose
ui2v preview examples/basic-text/animation.json --pixel-ratio 2
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

From the repository root with a local build:

```bash
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```
