# ui2v 示例

这些示例既是实现参考，也应该作为营销素材来使用。建议先看精致示例，再把最小示例用于环境检查。

## 精选示例

| 示例 | 适合场景 | 渲染命令 |
| --- | --- | --- |
| [`hero-ai-launch`](hero-ai-launch/README.zh.md) | README hero trailer、AI 产品发布、prompt-to-video 叙事和最终 CTA 定帧。 | `ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high` |
| [`product-showcase`](product-showcase/README.zh.md) | SaaS 发布、App walkthrough、devtool promo、功能发布视频。 | `ui2v render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high` |
| [`render-lab`](render-lab/README.zh.md) | 粒子、数据动效、伪 3D 深度、灯光和转场能力展示。 | `ui2v render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high` |
| [`runtime-core/uiv-runtime-commerce-command-center.json`](runtime-core/uiv-runtime-commerce-command-center.json) | Dashboard 叙事、电商指标、运营大屏和 runtime timeline 展示。 | `ui2v render examples/runtime-core/uiv-runtime-commerce-command-center.json -o .tmp/examples/uiv-runtime-commerce-command-center.mp4 --quality high` |
| [`runtime-core/uiv-runtime-one-minute-studio.json`](runtime-core/uiv-runtime-one-minute-studio.json) | 更长的 AI 视频工作室 promo，多场景 UI 编排和 CTA 节奏。 | `ui2v render examples/runtime-core/uiv-runtime-one-minute-studio.json -o .tmp/examples/uiv-runtime-one-minute-studio.mp4 --quality high` |

## 工具型示例

| 示例 | 使用场景 |
| --- | --- |
| [`logo-reveal`](logo-reveal/README.zh.md) | 需要一个短品牌开场，快速证明渲染器能跑通。 |
| [`basic-text`](basic-text/README.zh.md) | 需要一个小型 smoke test，检查浏览器发现、Canvas 渲染和 MP4 导出。 |
| [`kitchen-sink`](kitchen-sink/README.zh.md) | 需要覆盖更多 schema，用于 parser/validator 行为测试。 |
| [`runtime-core`](runtime-core/README.zh.md) | 想了解 runtime 时间线、分段 custom code、depth、routing 和 inspection。 |

## 校验全部示例

```bash
bun run build
bun run test:examples
bun run test:validate
bun run test:inspect-runtime
```

## README 资源流程

先把 MP4 渲染到 `.tmp/examples`，再导出轻量 GIF/JPG 到 `assets/showcase`，最后再从根 README 引用。除非作为 release assets，否则不要把完整 MP4 提交进仓库。