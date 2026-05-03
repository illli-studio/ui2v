# ui2v

Short package name for installing the ui2v CLI.

```bash
npm install -g ui2v
ui2v --version
ui2v doctor
```

Render the recommended starter example from the repository:

```bash
ui2v validate examples/logo-reveal/animation.json --verbose
ui2v preview examples/logo-reveal/animation.json --pixel-ratio 2
ui2v render examples/logo-reveal/animation.json -o .tmp/logo-reveal.mp4 --quality high
```

With Bun:

```bash
bun install -g ui2v
ui2v render animation.json -o output.mp4 --quality high
```

The implementation lives in [`@ui2v/cli`](https://www.npmjs.com/package/@ui2v/cli).
This package exists so users can install the command with `ui2v` directly.
