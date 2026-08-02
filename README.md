# ui2v

[中文](README_zh.md)

UI2V **HyperFrames motion registry CLI** — search, install, publish, and sync composition packages on [ui2v.com](https://ui2v.com).

This workspace previously shipped `@ui2v/cli` + `@ui2v/core` + `@ui2v/engine` + `@ui2v/producer` (JSON → MP4). That stack is **removed**. Authoring / preview / render now belongs to **HyperFrames**. This repo keeps the registry client only.

## Install

```bash
bun install
bun run build
# local:
bun run ui2v --help
# or global after publish:
npm install -g @ui2v/cli@latest
```

## Quick start

```bash
bun run ui2v login
bun run ui2v search "logo sting"
bun run ui2v install <slug>
bun run ui2v motion publish ./my-motion --version 1.0.0
bun run ui2v upgrade
```

## Package format

A motion is a HyperFrames folder:

```text
my-motion/
├── registry-item.json   # type: hyperframes:block
├── index.html
└── assets/
```

See `skills/ui2v/references/package-format.md` and the registry docs at https://ui2v.com (source of truth also in the ui2v-registry `docs/motion-format.md`).

## Agent skill

`skills/ui2v/` — registry + publish workflow for agents. Route video authoring to HyperFrames skills.

## Layout

- `packages/ui2v` — active CLI (npm `@ui2v/cli`, bin `ui2v`)
- `skills/ui2v` — agent skill for registry publish / install
- `examples/` — **legacy** JSON demos from the old toolchain (not publishable to UI2V as-is)

## License

MIT
