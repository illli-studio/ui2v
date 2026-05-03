# Contributing to ui2v

[中文](CONTRIBUTING_zh.md)

Thank you for helping improve ui2v. This repository is focused on the open CLI
renderer, runtime packages, examples, and documentation.

## Development Setup

Requirements:

- Node.js 18 or newer
- Bun 1.0 or newer
- Chrome, Edge, Chromium, or Puppeteer's installed Chromium

Install and build:

```bash
bun install
bun run build
```

If Puppeteer cannot download Chromium and you already have Chrome or Edge:

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

## Useful Checks

```bash
bun run build
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
bun run test
```

CLI smoke checks:

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## Project Layout

```text
packages/core          JSON parsing, validation, and shared types
packages/runtime-core  scene graph, timeline, frame plans, adapter contracts
packages/engine        browser renderer and exporters
packages/producer      Puppeteer/WebCodecs preview and render pipeline
packages/cli           command-line interface
examples               smoke-test animation JSON projects
docs                   documentation
scripts                validation and smoke-test scripts
```

## Guidelines

- Keep package boundaries clear.
- Prefer runtime-core contracts over one-off rendering logic.
- Add focused tests for runtime, rendering, and CLI changes.
- Update English and Chinese docs together when behavior changes.
- Keep generated artifacts in `.tmp/` or ignored build directories.

## Commit Messages

Conventional commits are encouraged:

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance`

## License

By contributing, you agree that your contributions are licensed under MIT.
