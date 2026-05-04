# Product Showcase 示例

[English](README.md)

这是一个高级 SaaS 产品发布片风格的 ui2v 示例。它适合作为创始人、AI agent、开发者工具团队的可复制起点：用一个 JSON 文件生成一条精致的产品发布视频。

这个场景使用一个 custom-code Canvas 图层绘制电影感背景光、玻璃质感产品 dashboard、动态指标、JSON -> Runtime -> Canvas -> WebCodecs -> MP4 流程，以及最终发布 CTA。

## 文件

- `animation.json`: 9 秒、1920x1080、30fps 的产品发布视频

## 为什么这个示例重要

- 看起来像真实发布素材，而不只是 renderer smoke test
- 可以很容易替换产品名、文案、指标和颜色
- 展示 UI 叙事、动态 dashboard、指标卡片和 CTA 节奏
- 适合用作 README GIF、npm 包预览或社媒发布短片

## 渲染

在仓库根目录运行：

```bash
ui2v validate examples/product-showcase/animation.json --verbose
ui2v preview examples/product-showcase/animation.json --pixel-ratio 2
ui2v render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high
```

使用本地构建产物：

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high
```

## README 预览素材

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/product-showcase.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/product-showcase.gif
```
