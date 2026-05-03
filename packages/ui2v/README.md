# ui2v

Convenience package for installing the ui2v CLI with the short package name.

```bash
npm install -g ui2v
ui2v --version
ui2v doctor
```

With Bun:

```bash
bun install -g ui2v
ui2v render animation.json -o output.mp4 --quality high
```

The implementation lives in [`@ui2v/cli`](https://www.npmjs.com/package/@ui2v/cli).
This package exists so users can install the command with `ui2v` directly.
