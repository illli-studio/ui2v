# ui2v status

## Current

This workspace is the **UI2V registry CLI** home for the former desktop `ui2v` project.

- Active package: `packages/ui2v` (npm `@ui2v/cli`, bin `ui2v`)
- Active skill: `skills/ui2v` (HyperFrames package → registry publish)
- Removed: `@ui2v/cli`, `@ui2v/core`, `@ui2v/engine`, `@ui2v/producer`, `@ui2v/runtime-core`

Authoring / preview / MP4 render: use **HyperFrames**, not this CLI.

## Verify

```bash
bun install
bun run build
bun run ui2v --cli-version
bun run ui2v upgrade --help
bun run test
```
