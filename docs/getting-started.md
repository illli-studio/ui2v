# Getting Started

[中文](getting-started.zh.md)

ui2v renders structured animation JSON through a real browser. This guide
explains the `@ui2v/cli` workflow, project shape, and common troubleshooting
steps.

## Workflow

1. Write or generate an `animation.json` project.
2. Validate it with `ui2v validate`.
3. Preview it in a browser with `ui2v preview`.
4. Render MP4 with `ui2v render`.
5. Inspect timeline state with `ui2v inspect-runtime` when debugging.

## Minimal Project

```json
{
  "id": "basic-text",
  "mode": "template",
  "duration": 2,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "template": {
    "layers": [
      {
        "id": "text-layer",
        "type": "custom-code",
        "startTime": 0,
        "endTime": 2,
        "properties": {
          "code": "function createRenderer() { return { render(t, context) { const ctx = context.mainContext; ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, context.width, context.height); ctx.fillStyle = '#fff'; ctx.fillText('ui2v', 40, 80); } }; }"
        }
      }
    ]
  }
}
```

`custom-code` layers can expose `createRenderer()`, a render function, an object
with `render`, or compatible module/class shapes handled by the runtime.

## Validation

```bash
ui2v validate animation.json --verbose
```

Validation checks the top-level project shape, timing, resolution, and layer
structure before the browser renderer starts.

## Preview

```bash
ui2v preview animation.json --pixel-ratio 2
```

The preview page includes a searchable project list, live reload for the current JSON file, play, pause, restart, scrubbing, a responsive project drawer, and a debug overlay toggled with `d`.

## Render

```bash
ui2v render animation.json -o output.mp4 --quality high --codec avc
ui2v render animation.json -o output.mp4 --quality low|medium|high|ultra|cinema
ui2v render animation.json -o output.mp4 --render-scale 2
```

MP4 with AVC/H.264 is the default production target. HEVC is available only when
the launched browser supports it.

## Inspect Runtime

```bash
ui2v inspect-runtime animation.json --time 0 --time 1 --json
```

Inspection prints normalized composition data, sampled frame state, dependency
information, routing metadata, and draw command summaries.

## Troubleshooting

Use `ui2v doctor` first. Most setup problems are browser discovery,
WebCodecs support, or codec negotiation issues.

ui2v uses `puppeteer-core`, so dependency install does not download a bundled
Chromium. If `doctor` cannot find a browser, install Chrome/Edge/Chromium or set
`PUPPETEER_EXECUTABLE_PATH`, `CHROME_PATH`, `CHROMIUM_PATH`, or `EDGE_PATH`.

## Related Docs

- [Quick Start](quick-start.md)
- [Architecture](architecture.md)
- [Runtime Core](runtime-core.md)
- [Roadmap](roadmap.md)
