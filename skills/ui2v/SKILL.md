---
name: ui2v
description: Use when publishing, installing, searching, syncing, or upgrading UI2V registry motions (HyperFrames composition packages on ui2v.com). Also use when the user mentions ui2v CLI, motion publish, registry-item.json, or replacing the abandoned @ui2v/cli JSON toolchain.
metadata:
  short-description: UI2V HyperFrames registry CLI
---

# ui2v Skill

UI2V is the **public registry** for HyperFrames composition packages. This skill covers the **registry CLI** (`ui2v`), not video authoring.

## Mental model

```text
HyperFrames authoring -> package folder -> ui2v login -> ui2v motion publish -> ui2v.com
```

| Layer | Tool |
| --- | --- |
| Author / preview / render | HyperFrames (`/hyperframes` and related skills) |
| Search / install / publish / sync | **`ui2v` CLI** (npm package `ui2v`) |

Do **not** use the abandoned `@ui2v/cli` stack (`doctor`, `validate`, `preview`, `render`, `animation.json`, `@ui2v/core`, `@ui2v/engine`, `@ui2v/producer`).

## CLI version gate

Before publish/install/sync that depends on current CLI behavior:

```bash
ui2v --cli-version
npm view @ui2v/cli version
```

- Missing CLI → install: `npm install -g @ui2v/cli@latest` (or `bun install -g @ui2v/cli`)
- Behind latest → `ui2v upgrade` (alias `self-update`), or `npm install -g @ui2v/cli@latest`
- Under `--no-input`, `ui2v upgrade` only prints the install command and exits non-zero when outdated

`npm view` is metadata only. Do not upgrade as a routine first step unless the CLI is missing, too old for the task, broken, or the user asks for latest.

From this monorepo before publishing:

```bash
cd packages/ui2v && bun run build && node bin/ui2v.js --cli-version
```

## Package shape

A motion folder must include:

- `registry-item.json` with `type: "hyperframes:block"`
- Entry composition HTML (`index.html` or listed composition file)
- Optional `assets/`, `README.md`, thumbnail

Details: `references/package-format.md`.

## Publish flow

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
# optional: ui2v sync
```

Aliases: `ui2v skill publish`, legacy `ui2v publish`.

Full checklist: `references/publish.md`.

## Common registry commands

```bash
ui2v search "logo sting"
ui2v install <slug>
ui2v list
ui2v update --all
ui2v explore
ui2v inspect <slug>
ui2v upgrade
```

Install command shown on the site: `npx ui2v@latest install <slug>`.

## Routing

- **Make / edit / render a video composition** → HyperFrames skills, not this CLI.
- **Share on ui2v.com / install from registry** → this skill + `ui2v` CLI.
- **Old JSON ui2v projects** → refuse; migrate to HyperFrames packages, then publish with `ui2v`.
