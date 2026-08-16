# @ui2v/cli

Registry CLI for HyperFrames motion packages on [ui2v.com](https://ui2v.com).

The npm package is `@ui2v/cli`; the installed command is `ui2v`.

## Install

```bash
npm install -g @ui2v/cli@latest
ui2v --cli-version
```

Run with npx:

```bash
npx @ui2v/cli@latest search "logo sting"
npx @ui2v/cli@latest install <slug>
```

## Commands

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

## Publish A Motion

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
```

The package folder must include:

```text
my-motion/
├── registry-item.json   # type: "hyperframes:block"
├── index.html
└── assets/
```

## Legacy Note

`@ui2v/cli@1.x` exposed JSON validate/preview/render commands. That surface has
been removed. The current CLI is the registry client for HyperFrames packages.
