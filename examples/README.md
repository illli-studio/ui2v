# Legacy examples

These folders are leftovers from the old `@ui2v/core` JSON → MP4 toolchain.

They are **not** HyperFrames packages and **cannot** be published to UI2V with `ui2v motion publish` as-is.

To publish: author a HyperFrames package (`registry-item.json` + entry HTML), then:

```bash
bun run ui2v motion publish ./path --version 1.0.0
```
