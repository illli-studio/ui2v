# ui2v Examples

Use these examples as marketing assets and implementation references. Start with the polished demos, then keep the minimal examples for environment checks.

## Featured Demos

| Example | Best For | Render |
| --- | --- | --- |
| [`hero-ai-launch`](hero-ai-launch/README.md) | README hero trailers, AI product launches, prompt-to-video storytelling, final CTA lockups. | `ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high` |
| [`product-showcase`](product-showcase/README.md) | SaaS launches, app walkthroughs, devtool promos, feature announcements. | `ui2v render examples/product-showcase/animation.json -o .tmp/examples/product-showcase.mp4 --quality high` |
| [`render-lab`](render-lab/README.md) | Capability reels for particles, data motion, pseudo-3D depth, lighting, and transitions. | `ui2v render examples/render-lab/animation.json -o .tmp/examples/render-lab.mp4 --quality high` |
| [`runtime-core/uiv-runtime-commerce-command-center.json`](runtime-core/uiv-runtime-commerce-command-center.json) | Dashboard storytelling, commerce metrics, operations centers, runtime timeline demos. | `ui2v render examples/runtime-core/uiv-runtime-commerce-command-center.json -o .tmp/examples/uiv-runtime-commerce-command-center.mp4 --quality high` |
| [`runtime-core/uiv-runtime-one-minute-studio.json`](runtime-core/uiv-runtime-one-minute-studio.json) | Longer AI-video studio promos with multiple scenes, UI choreography, and CTA pacing. | `ui2v render examples/runtime-core/uiv-runtime-one-minute-studio.json -o .tmp/examples/uiv-runtime-one-minute-studio.mp4 --quality high` |

## Utility Examples

| Example | Use It When |
| --- | --- |
| [`logo-reveal`](logo-reveal/README.md) | You want a short brand opener that proves the renderer works quickly. |
| [`basic-text`](basic-text/README.md) | You need a small smoke test for browser discovery, Canvas rendering, and MP4 export. |
| [`kitchen-sink`](kitchen-sink/README.md) | You want broad schema coverage while testing parser/validator behavior. |
| [`runtime-core`](runtime-core/README.md) | You are exploring runtime timelines, segmented custom code, depth, routing, and inspection. |

## Validate Everything

```bash
bun run build
bun run test:examples
bun run test:validate
bun run test:inspect-runtime
```

## README Asset Workflow

Render MP4s into `.tmp/examples`, then export lightweight GIF/JPG previews into `assets/showcase` before referencing them from the root README. Do not commit full MP4 files unless they are release assets.