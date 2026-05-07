# Runtime Storyboard

[English](README.md)

维护版 runtime-core 示例。它展示 `schema: "uiv-runtime"`、`timeline.segments[]`、分段依赖、转场、相机 metadata 和 `inspect-runtime`。

```bash
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-storyboard/animation.json --time 1 --time 4 --time 7 --json
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
```
