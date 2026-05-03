# Contributing to ui2v

Thank you for helping improve ui2v.

## Development Setup

### Prerequisites

- Node.js >= 18
- Bun >= 1.0
- Chrome, Edge, or Puppeteer's bundled Chromium

The primary renderer does not require Electron, FFmpeg, or node-canvas.

### Install

```bash
git clone https://github.com/ui2v/ui2v.git
cd ui2v
bun install
```

### Build

```bash
bun run build
```

### Test

```bash
bun run test:unit
bun run test:metadata
bun run test:examples
bun run test:smoke
bun run test:init
bun run test
```

Useful CLI smoke checks:

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
node packages/cli/dist/cli.js init hello-ui2v
```

## Project Structure

```text
ui2v/
  packages/
    core/          JSON parsing, validation, and shared types
    runtime-core/  scene graph, timeline, frame plans, adapter contracts
    engine/        browser rendering engine and exporters
    producer/      Puppeteer/WebCodecs preview and render pipeline
    cli/           command-line interface
  examples/        smoke-test animation JSON files
  docs/            project documentation
  scripts/         helper scripts
```

## Code Style

- Use TypeScript.
- Keep package boundaries clear.
- Prefer existing helpers and runtime-core contracts over one-off logic.
- Add focused tests for new runtime, rendering, and CLI behavior.
- Keep generated artifacts in `.tmp/`.

## Commit Messages

Use conventional commits when possible:

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance`

## Pull Requests

1. Create a feature branch.
2. Make focused changes.
3. Add or update tests.
4. Update docs when behavior changes.
5. Run the build and relevant tests before submitting.

## License

By contributing, you agree that your contributions will be licensed under MIT.
