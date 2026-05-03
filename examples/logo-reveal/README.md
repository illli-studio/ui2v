# Logo Reveal Example

[Chinese](README.zh.md)

A polished first-run example for ui2v. It renders a cinematic ui2v logo reveal
with a browser-video pipeline motif, so new users can immediately see the kind
of motion graphic the CLI can produce from one JSON file.

## Files

- `animation.json`: 6-second 1920x1080 logo reveal at 30fps

## Usage

From the repository root:

```bash
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

From a local workspace build:

```bash
node packages/cli/dist/cli.js validate examples/logo-reveal/animation.json --verbose
node packages/cli/dist/cli.js preview examples/logo-reveal/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

## Why Start Here

This example is intentionally compact but visually complete: brand mark,
wordmark, animated light sweep, timeline progress, and pipeline labels are all
drawn in the custom-code layer. It is a good base to copy when making a product
intro, launch teaser, or README demo clip.
