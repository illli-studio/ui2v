# Library Timeline

[English](README.md)

维护版多库展示示例。动画按时间线拆成多个片段，每个依赖库都有自己的可见职责，而不是只出现在 metadata 里。

| 时间 | 库 | 可见证明 |
| --- | --- | --- |
| 0-2.5s | `gsap`, `SplitType` | 使用 GSAP easing 的错峰文字动效 |
| 2.5-5s | `d3`, `math` | D3 映射数据图表，mathjs 计算指标 |
| 5-7.5s | `THREE`, `POSTPROCESSING` | 旋转空间形体和 postprocessing API 展示 |
| 7.5-10s | `Matter`, `simplex`, `iconify` | 物理圆体、噪声流场和 MDI rocket SVG path |

```bash
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```
