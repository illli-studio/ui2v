# Runtime Storyboard

[中文](README.zh.md)

Maintained runtime-core example. It demonstrates `schema: "uiv-runtime"`,
`timeline.segments[]`, segment-local dependencies, transitions, camera metadata,
and `inspect-runtime`.

```bash
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-storyboard/animation.json --time 1 --time 4 --time 7 --json
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
```
