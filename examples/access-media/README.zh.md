# Access Media

[English](README.md)

维护版本地资源示例。照片、视频和音乐放在 `animation.json` 旁边的 `access/` 目录里，然后在 JSON 中用 `access/name.ext` 引用。

```text
examples/access-media/
  animation.json
  access/
    photo.png
    clip.mp4
    music.wav
```

这个示例展示了 `image-layer`、`video-layer`、`audio-layer` 和根级 `audio.tracks`。导出的 MP4 中包含 AAC 音频流。

```bash
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
```
