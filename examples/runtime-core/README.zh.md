# Runtime Core 示例

这些示例使用 `uiv-runtime` schema，用来展示分段时间线、runtime inspection、camera/depth 元数据，以及 custom-code Canvas segments。

## 推荐 Runtime Demos

| 示例 | 用途 | 渲染 |
| --- | --- | --- |
| `uiv-runtime-commerce-command-center.json` | AI commerce / ops 指挥中心，包含实时指标、风险、库存、调度和最终汇报节奏。 | `ui2v render examples/runtime-core/uiv-runtime-commerce-command-center.json -o .tmp/examples/uiv-runtime-commerce-command-center.mp4 --quality high` |
| `uiv-runtime-one-minute-studio.json` | 多场景 AI 视频工作室宣传片和 README 风格 marketing reel。 | `ui2v render examples/runtime-core/uiv-runtime-one-minute-studio.json -o .tmp/examples/uiv-runtime-one-minute-studio.mp4 --quality high` |
| `uiv-runtime-xyz-depth-demo.json` | camera/depth 与伪 3D runtime 演示。 | `ui2v render examples/runtime-core/uiv-runtime-xyz-depth-demo.json -o .tmp/examples/uiv-runtime-xyz-depth-demo.mp4 --quality high` |

## 检查

```bash
ui2v validate examples/runtime-core/uiv-runtime-commerce-command-center.json --verbose
ui2v inspect-runtime examples/runtime-core/uiv-runtime-commerce-command-center.json --time 2 --time 8 --time 14
```
