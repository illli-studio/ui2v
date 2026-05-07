# Access Media

[中文](README.zh.md)

Maintained local-resource example. Photos, video clips, and music live in the
`access/` folder beside `animation.json`, then JSON references them with
`access/name.ext`.

```text
examples/access-media/
  animation.json
  access/
    photo.png
    clip.mp4
    music.wav
```

The example demonstrates `image-layer`, `video-layer`, `audio-layer`, and root
`audio.tracks`. The exported MP4 includes an AAC audio stream.

```bash
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
```
