# Vertical Launch

[English](README.md)

9:16 竖屏社交发布参考示例，对应 `skills/ui2v/references/video-playbooks.md` 里的竖屏 playbook。

| 时间 | 片段 | 作用 |
| --- | --- | --- |
| 0-2.5s | `hook` | 居中标题，gsap 缓动 |
| 2.5-5.5s | `proof` | 手机卡片 UI + d3 柱状揭示 |
| 5.5-8s | `cta` | 品牌落版 + 安装命令 |

分辨率为 **1080x1920**，文案大号居中，左右留安全边距，适合竖屏信息流。

```bash
node packages/cli/dist/cli.js validate examples/vertical-launch/animation.json --verbose
node packages/cli/dist/cli.js lint-timeline examples/vertical-launch/animation.json
node packages/cli/dist/cli.js preview examples/vertical-launch/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/vertical-launch/animation.json -o .tmp/examples/vertical-launch.mp4 --quality high
```
