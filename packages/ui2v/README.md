# @ui2v/cli

Registry CLI for HyperFrames motion packages on ui2v.com.

npm package: **`@ui2v/cli`** (bin still `ui2v`). Replaces the old JSON validate/preview/render surface of `@ui2v/cli@1.x`.

## Build

```bash
bun install
bun run build
bun run ui2v --help
```

## Upgrade

```bash
ui2v upgrade
# or
npm install -g @ui2v/cli@latest
```

## Publish a motion

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
```

Package must include `registry-item.json` (`type: "hyperframes:block"`) and entry HTML.
