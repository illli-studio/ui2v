# ui2v 示例

[English](README.md)

旧的实验性 examples 已经删除。这个目录现在只保留少量维护版示例，目标是稳定、可检查、好看，并且能作为 AI 生成 ui2v 项目的参考。

| 示例 | 用途 | 渲染命令 |
| --- | --- | --- |
| [`basic-smoke`](basic-smoke/README.zh.md) | 精致 Canvas 品牌开场，同时也是最小端到端烟测。 | `node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`library-timeline`](library-timeline/README.zh.md) | 按时间线展示多库能力，每个库都有自己的可见片段。 | `node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`access-media`](access-media/README.zh.md) | 本地 `access/` 资源：图片、插入视频、音频波形层和 muxed AAC 音轨。 | `node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`runtime-storyboard`](runtime-storyboard/README.zh.md) | runtime-core 分镜：segments、转场、相机 metadata 和 inspect-runtime。 | `node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## 验证

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js validate examples/access-media/animation.json --verbose
node packages/cli/dist/cli.js validate examples/runtime-storyboard/animation.json --verbose
```

## 全部渲染

```bash
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
node packages/cli/dist/cli.js render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
node packages/cli/dist/cli.js render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high
```
