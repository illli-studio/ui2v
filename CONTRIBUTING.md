# Contributing to ui2v

[中文](CONTRIBUTING_zh.md)

Thank you for helping improve ui2v. This repository focuses on the open CLI renderer, runtime packages, examples, documentation, and local Codex skills that help agents create better ui2v projects.

## Development Setup

Requirements:

- Node.js 18 or newer
- Bun 1.0 or newer
- A locally installed Chrome, Edge, or Chromium browser

Install and build:

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
```

ui2v uses `puppeteer-core`, so dependency install does not download a bundled Chromium. If browser auto-detection fails, set `PUPPETEER_EXECUTABLE_PATH`, `CHROME_PATH`, `CHROMIUM_PATH`, or `EDGE_PATH`.

## Useful Checks

Run the same fast checks used by CI:

```bash
bun run test:ci
```

Run the full local suite, including render smoke tests:

```bash
bun run test
```

Focused checks:

```bash
bun run test:unit
bun run test:metadata
bun run test:surface
bun run test:pack
bun run test:examples
bun run test:validate
bun run test:inspect-runtime
```

CLI smoke checks:

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js validate examples/hero-ai-launch/animation.json --verbose
node packages/cli/dist/cli.js preview examples/hero-ai-launch/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

## Project Layout

```text
packages/core          JSON parsing, validation, and shared types
packages/runtime-core  scene graph, timeline, frame plans, adapter contracts
packages/engine        browser Canvas renderer, custom code, and WebCodecs export
packages/producer      puppeteer-core preview/render pipeline and local browser discovery
packages/cli           command-line interface
examples               featured demos, utility examples, and runtime-core projects
assets/showcase        committed GIF/JPG preview assets for README galleries
docs                   documentation
scripts                validation, smoke-test, and example refresh scripts
.agents/skills         repo-local skills for ai-assisted example/render workflows
```

## Example Guidelines

- Treat featured examples as marketing assets, not only test fixtures.
- Keep `hero-ai-launch`, `product-showcase`, `render-lab`, and the commerce command center demo hand-polished.
- Use refresh scripts for utility examples; they intentionally preserve hand-polished featured examples.
- Render MP4 files into `.tmp/examples` and commit only lightweight previews under `assets/showcase`.
- Keep README GIFs short, readable, and preferably under 3 MB.

## Code Guidelines

- Keep package boundaries clear.
- Prefer runtime-core contracts over one-off rendering logic.
- Add focused tests for runtime, rendering, CLI, package metadata, and examples when behavior changes.
- Update English and Chinese docs together.
- Do not commit `.tmp/`, `out/`, full MP4 exports, or build output directories.

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