# Access Media

[中文](README.zh.md)

Maintained local-resource example for image, video, and audio layers. Media
files live in the `access/` folder beside `animation.json`, then JSON references
them with `access/name.ext` or embeds a data URL when the asset must be fully
self-contained.

```text
examples/access-media/
  animation.json
  access/
    media-desk-hero.jpg
    studio-loop.webm
    studio-loop-poster.jpg
    ui2v-signal-bed.wav
```

The example demonstrates:

- `image-layer` with timed in/out animation.
- `video-layer` with a browser-friendly WebM source and `posterSrc` fallback.
- `audio-layer` waveform visualization.
- Root `audio.tracks` muxed into the exported MP4 as AAC.

For user-provided video, prefer browser-decodable sources such as H.264 MP4 or
VP9 WebM. Add `posterSrc` to video layers so preview/export never burn a missing
media placeholder into the canvas if a frame is slow to decode.

```bash
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
```
