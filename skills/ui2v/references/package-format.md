# HyperFrames package format (UI2V)

A UI2V motion is a HyperFrames composition package:

```text
my-motion/
├── registry-item.json
├── index.html
└── assets/          # optional
```

## registry-item.json (required fields)

- `name` — kebab-case id (default slug)
- `type` — must be `hyperframes:block`
- `title`, `description`
- `dimensions.width` / `dimensions.height`
- `duration` — seconds (≥ 1 for publish)
- `files` — at least one composition HTML entry

Example:

```json
{
  "name": "logo-sting",
  "type": "hyperframes:block",
  "title": "Logo Sting",
  "description": "A short logo reveal",
  "dimensions": { "width": 1920, "height": 1080 },
  "duration": 3,
  "tags": ["logo", "motion"],
  "files": [
    {
      "path": "index.html",
      "target": "compositions/logo-sting.html",
      "type": "hyperframes:composition"
    }
  ]
}
```

Versioning uses the CLI/web `--version` (semver). It is not stored inside `registry-item.json`.

Every publish requires an uploaded animation cover. Optional manifest field
`thumbnail: "assets/thumbnail.png"` selects an existing local PNG/JPEG/WebP image.
Otherwise the CLI finds a root thumbnail/cover image or captures an actual frame.
See `publish.md` for caching and browser setup. `ui2v-cover.webp` is reserved for
the generated upload artifact; keep source artwork under other names.

## Entry HTML

Prefer a root with `data-composition-id`, `data-duration`, `data-width`, `data-height`, at least one `class="clip"`, and a paused GSAP timeline on `window.__timelines`.

Entry resolution: `index.html` → first composition in `files[]` → `{name}.html`.

## Abandoned formats

UI2V rejects legacy `@ui2v/core` / `@ui2v/cli@1.x` JSON projects (`project.json`, `animation.json`, `MOTION.json`). Author in HyperFrames, then publish with the current `ui2v` registry CLI.

Canonical format details live with the registry/CLI schema in `packages/ui2v/src/schema`.
