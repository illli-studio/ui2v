# Roadmap

## Done

- Monorepo package structure.
- Core JSON parser and validator.
- Runtime core with scene graph, timeline evaluation, frame plans, and adapter
  contracts.
- Browser rendering engine with template canvas and custom code support.
- Puppeteer-backed preview server.
- Puppeteer/WebCodecs MP4 render pipeline.
- CLI commands for `doctor`, `validate`, `preview`, `render`, `inspect-runtime`,
  `init`, and `info`.
- MIT license alignment.
- Clean workspace build with declaration files.
- CLI smoke test that renders a short MP4 and checks the output file.
- `doctor` check for default AVC/H.264 WebCodecs encoder support.

## Near Term

- Normalize generated artifacts into `.tmp/` and keep the repository
  root clean.
- Improve error messages for failed browser dependency loads and codec
  negotiation failures.

## Rendering Reliability

- Support an offline/vendor mode for browser ESM dependencies.
- Replace base64 video return with chunked or streamed transfer from browser to
  Node.
- Add fixture-based render tests for multiple project formats.
- Add metadata probing for generated MP4 files in smoke tests.

## Feature Expansion

- WebM output if browser support and muxing are reliable enough.
- Batch rendering.
- Audio mixing.
- Template library.
- Plugin system.
- Distributed or cloud rendering.

## Ecosystem

- Documentation site.
- Online playground.
- Community templates.
- VS Code extension.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md).
