# @illli/ui2v

Convenience package for installing the `ui2v` command.

```bash
npm install -g @illli/ui2v
ui2v --version
ui2v doctor
```

With Bun:

```bash
bun install -g @illli/ui2v
ui2v render animation.json -o output.mp4 --quality high
```

The implementation lives in [`@ui2v/cli`](https://www.npmjs.com/package/@ui2v/cli).
The unscoped `ui2v` package name is currently blocked by npm's similarity
policy, so this scoped package provides the same global `ui2v` command.
