# ui2v Examples

[中文](README.zh.md)

The old experimental examples have been removed. This folder now keeps only a
small maintained set that should stay polished, inspectable, and useful as AI
generation references. These examples are designed to show real renderer
capability, not only parser coverage.

| Example | Purpose | Render |
| --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.md) | Premium Canvas opener that still works as the smallest end-to-end smoke test. | `node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`library-timeline`](library-timeline/README.md) | Timeline-first multi-library showcase with visible library beats. | `node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`access-media`](access-media/README.md) | Local `access/` assets: image, inserted video, waveform layer, and muxed audio. | `node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`runtime-storyboard`](runtime-storyboard/README.md) | Runtime-core storyboard with segments, transitions, camera metadata, and inspect output. | `node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## Validate

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
```

## Render All

```bash
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
```
