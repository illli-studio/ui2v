<p align="center">
  <img src="./ui2v-logo.svg" alt="UI2V" width="112" />
</p>

<h1 align="center">UI2V</h1>

<p align="center">
  Publish motion like a package. Install animation like a dependency.
</p>

<p align="center">
  <a href="https://ui2v.com">ui2v.com</a>
  ·
  <a href="./docs/quick-start.md">Quick Start</a>
  ·
  <a href="./docs/getting-started.md">Getting Started</a>
  ·
  <a href="./README_zh.md">中文</a>
</p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/node-%3E%3D20-111827?labelColor=0f172a" />
  <img alt="npm package" src="https://img.shields.io/badge/npm-%40ui2v%2Fcli-111827?labelColor=0f172a" />
  <img alt="license MIT" src="https://img.shields.io/badge/license-MIT-111827?labelColor=0f172a" />
</p>

---

Motion work gets trapped in folders, demos, and one-off exports. UI2V gives it a
home: searchable, installable, publishable, and maintainable from the command
line.

It does one job on purpose. HyperFrames owns composition authoring, preview, and
rendering. UI2V owns the registry workflow around finished motion packages.

```bash
npm install -g @ui2v/cli@latest
ui2v search "logo sting"       # discover a reusable motion
ui2v install <slug>            # pull it into your workspace
ui2v motion publish ./motion --version 1.0.0
```

## Why UI2V Exists

UI2V is the public registry client for HyperFrames composition packages. Use it
to search, install, publish, update, and sync reusable motion packages on
[ui2v.com](https://ui2v.com).

```text
HyperFrames authoring
  -> package folder
  -> ui2v login
  -> ui2v motion publish
  -> ui2v.com
```

The goal is to make motion components feel as reusable as UI components: named,
versioned, documented, and easy to pull into a workspace.

## Built For Distribution

| For | Value |
| --- | --- |
| Motion designers | Package polished HyperFrames compositions instead of handing off loose files. |
| Frontend teams | Install reusable motion the same way you install UI building blocks. |
| Design systems | Treat animation patterns as shared assets with names, versions, and docs. |
| Agents | Give Codex and other tooling a stable publish/install workflow for motion packages. |

## The Pitch

UI2V turns motion into something teams can actually circulate:

- a discoverable registry page
- a copyable install command
- a versioned publish workflow
- a package format agents can inspect
- a clean boundary between creation and distribution

## The Loop

| Stage | What happens | Command surface |
| --- | --- | --- |
| Discover | Find motion packages worth reusing | `ui2v search`, `ui2v explore` |
| Install | Pull a package into your workspace | `ui2v install`, `ui2v update` |
| Publish | Release a HyperFrames package | `ui2v motion publish` |
| Maintain | Keep local and registry state aligned | `ui2v sync`, `ui2v inspect` |

## Before / After

| Before UI2V | With UI2V |
| --- | --- |
| Motion lives in ad-hoc folders | Motion has a registry page |
| Sharing means sending files around | Sharing means one install command |
| Updates are manual and unclear | Releases are versioned |
| Agents infer project shape from loose files | Agents inspect `registry-item.json` and entry HTML |

## Publish Your First Motion

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
npx @ui2v/cli@latest install <slug>
```

Minimal package:

```text
my-motion/
├── registry-item.json
├── index.html
└── assets/
```

## Install

Install the scoped npm package. The binary is `ui2v`.

```bash
npm install -g @ui2v/cli@latest
ui2v --cli-version
ui2v --help
```

Run without a global install:

```bash
npx @ui2v/cli@latest search "logo sting"
npx @ui2v/cli@latest install <slug>
```

## Common Commands

```bash
ui2v login
ui2v search "lower third"
ui2v install <slug>
ui2v list
ui2v update --all
ui2v inspect <slug>
ui2v motion publish ./my-motion --version 1.0.0
ui2v sync --dry-run
ui2v upgrade
```

## Product Boundary

| UI2V handles | HyperFrames handles |
| --- | --- |
| Registry search and discovery | Composition authoring |
| Package install and updates | Preview and playback |
| Publish and sync workflows | Rendering and export |
| CLI auth and ownership flows | Timeline and animation logic |

## Motion Package Shape

A publishable motion is a HyperFrames package folder with registry metadata and
an entry composition HTML file.

```text
my-motion/
├── registry-item.json   # type: "hyperframes:block"
├── index.html           # entry composition
└── assets/              # optional media and support files
```

Versioning is provided at publish time with `--version`; it is not stored in
`registry-item.json`.

See [package-format.md](./skills/ui2v/references/package-format.md) for the
agent-facing checklist and schema expectations.

## Local Development

```bash
bun install
bun run build
bun run test
node packages/ui2v/bin/ui2v.js --help
```

For release readiness:

```bash
bun run --filter "@ui2v/cli" verify
```

## Repository Map

```text
packages/ui2v/   active CLI package, npm @ui2v/cli, bin ui2v
skills/ui2v/     Codex skill for registry install and publish workflows
docs/            product, package, and migration documentation
```

## Legacy Renderer Stack

This workspace previously shipped a JSON-to-MP4 toolchain through
`@ui2v/cli@1.x`, `@ui2v/core`, `@ui2v/engine`, and `@ui2v/producer`. That stack
has been removed from the active product direction. Rebuild old JSON projects as
HyperFrames packages, then publish them with the current `ui2v` registry CLI.

See [Legacy JSON Toolchain](./docs/legacy-json-toolchain.md) for migration notes.
See [Naming Migration](./docs/naming-migration.md) for compatibility naming notes.
See [Compatible Package Registry](./docs/package-registry.md) for advanced
`ui2v package` commands.

## License

MIT
