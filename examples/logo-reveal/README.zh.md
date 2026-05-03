# Logo Reveal 示例

[English](README.md)

这是 ui2v 的推荐第一跑示例。它用一个 JSON 文件渲染 6 秒的 ui2v 品牌开场动画，包含标识、字标、扫光、进度条和 JSON 到 MP4 的流程提示，适合让新用户快速看到成片质感。

## 文件

- `animation.json`: 6 秒、1920x1080、30fps 的 logo reveal 项目

## 使用方式

在仓库根目录运行：

```bash
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/logo-reveal/animation.json --verbose
node packages/cli/dist/cli.js preview examples/logo-reveal/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

## 为什么从这里开始

这个示例足够短，但画面完整：品牌标识、字标、动态扫光、时间线进度和流程标签都在 custom-code 图层里绘制。你可以把它当成产品开场、发布预告或 README 演示视频的基础模板。
