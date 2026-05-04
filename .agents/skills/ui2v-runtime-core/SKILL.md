---
name: ui2v-runtime-core
description: Use when creating, editing, inspecting, or documenting ui2v runtime-core examples that use the uiv-runtime schema, segmented timelines, custom-code Canvas segments, dependency metadata, frame inspection, or runtime scene/camera/depth concepts.
metadata:
  short-description: Work with ui2v runtime-core projects
---

# ui2v Runtime Core

Use this skill for `schema: "uiv-runtime"` projects and `examples/runtime-core` files.

## Coordinate with render capabilities

When runtime segments need advanced visuals, choose dependency keys and library strategies using `$ui2v-render-capabilities`. Runtime examples should declare canonical dependency keys such as `canvas2d`, `d3`, `THREE`, `Matter`, `CANNON`, `PIXI`, `tsParticles`, or `katex` only when the segment actually uses them.

## Runtime project shape

A minimal runtime example:

```json
{
  "schema": "uiv-runtime",
  "id": "uiv-runtime-example",
  "name": "Runtime Example",
  "version": "0.1.0",
  "duration": 12,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "backgroundColor": "#030712",
  "dependencies": ["canvas2d"],
  "timeline": {
    "segments": [
      {
        "id": "hero",
        "label": "Hero",
        "startTime": 0,
        "endTime": 4,
        "dependencies": ["canvas2d"],
        "code": "function render(t, context) { const ctx = context.ctx; }"
      }
    ]
  },
  "scene": { "root": { "id": "root", "type": "root", "children": [] } }
}
```

## Segment code rules

- Segment code exports `function render(t, context) { ... }` directly, not `createRenderer()`.
- Use `context.ctx`, `context.width`, `context.height`, and `context.progress`.
- Treat `t` as the current timeline time in seconds.
- Use `context.progress` for segment-local entrance animation.
- Keep each segment self-contained; do not rely on variables from another segment.
- Include `dependencies: ["canvas2d"]` at project and segment level for Canvas custom code.

## Inspection workflow

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-core/<file>.json --time 1 --time 5 --time 9 --json
```

Use inspection when changing segment timings, dependencies, or runtime metadata.

## Existing featured runtime demos

- `uiv-runtime-commerce-command-center.json`: AI commerce / ops dashboard report.
- `uiv-runtime-one-minute-studio.json`: multi-scene AI studio promo.
- `uiv-runtime-xyz-depth-demo.json`: depth and camera demonstration.
- `uiv-runtime-tilted-card-zoom.json`: card/camera motion demo.

## Documentation

If adding or promoting a runtime demo, update:

- `examples/runtime-core/README.md`
- `examples/runtime-core/README.zh.md`
- root `README.md` / `README_zh.md` only if it belongs in the main gallery

## When to read references

- Read `references/runtime-patterns.md` when designing segment timelines or inspection-friendly projects.
