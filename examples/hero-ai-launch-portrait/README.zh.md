# Hero AI Launch

[English](README.md)

一个专门为 README 首屏设计的高冲击 hero trailer，让用户在前五秒就觉得 ui2v 足够高级。

这个示例不是最小 smoke test，而是更偏营销展示：电影感背景光、玻璃 UI 面板、代码和视频卡片、prompt 到 MP4 的流程，以及最终 CTA 定帧。

## 渲染

```bash
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

## 自定义

- 把最终 CTA 换成你自己的安装命令、URL 或发布文案。
- 保持标题足够大，确保在 640-720px 宽的 README GIF 里也能读清。
- 如果想快速解释产品，建议保留 prompt → JSON → Canvas → WebCodecs → MP4 的故事线。
- 适合作为 AI 应用发布、devtool 发布、开源 release trailer 和社交平台公告短片的基础模板。

## README 预览素材

```bash
ffmpeg -y -ss 0 -t 5 -i .tmp/examples/hero-ai-launch.mp4 \
  -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/hero-ai-launch.gif
```

完整 MP4 建议保留在 `.tmp/examples`、release assets 或 CDN；仓库里只提交 `assets/showcase` 下的轻量预览素材。