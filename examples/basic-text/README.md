# Basic Text Example

[中文](README.zh.md)

A minimal ui2v animation project that renders text with a simple custom-code
layer. Use this example to verify that validation, preview, and MP4 rendering
work in your environment.

## Files

- `animation.json`: two-second 640x360 animation at 30fps

## Usage

From this directory:

```bash
ui2v validate animation.json --verbose
ui2v preview animation.json
ui2v render animation.json -o output.mp4
```

From the repository root with a local build:

```bash
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```
