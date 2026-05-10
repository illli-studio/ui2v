# Access Media

[English](README.md)

维护版的本地资源示例，用来覆盖图片层、视频层和音频层。媒体文件放在
`animation.json` 旁边的 `access/` 目录里，然后在 JSON 中用
`access/name.ext` 引用；需要完全自包含时，也可以使用 data URL。

```text
examples/access-media/
  animation.json
  access/
    media-desk-hero.jpg
    studio-loop.webm
    studio-loop-poster.jpg
    ui2v-signal-bed.wav
```

这个示例展示：

- 带指定出现/消失时间的 `image-layer`。
- 使用浏览器友好 WebM 源和 `posterSrc` 兜底的 `video-layer`。
- 作为波形界面的 `audio-layer`。
- 通过根级 `audio.tracks` mux 进导出 MP4 的 AAC 音轨。

用户提供视频时，优先使用浏览器能稳定解码的 H.264 MP4 或 VP9 WebM。视频层建议加
`posterSrc`，这样某一帧解码慢时，预览/导出不会把缺失媒体占位烙进画布。

```bash
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
```
