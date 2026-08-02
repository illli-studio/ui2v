# UI2V CLI

Registry CLI for HyperFrames motion packages on ui2v.com.

Replaces the removed `@ui2v/cli` JSON validate/preview/render toolchain in this workspace.

## Build

```bash
bun install
bun run build
bun run ui2v --help
```

## Upgrade

```bash
ui2v upgrade
```

## Publish

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
```

Package must include `registry-item.json` (`type: "hyperframes:block"`) and entry HTML.
