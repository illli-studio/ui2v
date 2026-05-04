# Runtime Core Examples

These examples use the `uiv-runtime` schema to demonstrate segmented timelines,
runtime inspection, camera/depth metadata, and custom-code Canvas segments.

## Featured Runtime Demos

| Example | Purpose | Render |
| --- | --- | --- |
| `uiv-runtime-commerce-command-center.json` | AI commerce / ops command center with live metrics, risk, inventory, dispatch, and final report pacing. | `ui2v render examples/runtime-core/uiv-runtime-commerce-command-center.json -o .tmp/examples/uiv-runtime-commerce-command-center.mp4 --quality high` |
| `uiv-runtime-one-minute-studio.json` | Multi-scene AI video studio promo and README-style marketing reel. | `ui2v render examples/runtime-core/uiv-runtime-one-minute-studio.json -o .tmp/examples/uiv-runtime-one-minute-studio.mp4 --quality high` |
| `uiv-runtime-xyz-depth-demo.json` | Camera/depth and pseudo-3D runtime demonstration. | `ui2v render examples/runtime-core/uiv-runtime-xyz-depth-demo.json -o .tmp/examples/uiv-runtime-xyz-depth-demo.mp4 --quality high` |

## Inspect

```bash
ui2v validate examples/runtime-core/uiv-runtime-commerce-command-center.json --verbose
ui2v inspect-runtime examples/runtime-core/uiv-runtime-commerce-command-center.json --time 2 --time 8 --time 14
```
