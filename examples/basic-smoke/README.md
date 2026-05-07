# Basic Smoke

[中文](README.zh.md)

Premium Canvas opener and smallest maintained end-to-end example. It confirms
JSON parsing, browser launch, Canvas rendering, and MP4 export while still
looking polished enough to be useful as a first impression.

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
```
