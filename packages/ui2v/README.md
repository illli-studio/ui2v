# @ui2v/cli

AI-ready video motion asset library for discovering, installing, publishing,
syncing, and sharing HyperFrames packages on [ui2v.com](https://ui2v.com).

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

## Animation covers

Publishing requires an animation cover. The CLI reuses a local thumbnail or
captures a real frame and caches it by package contents. Use
`--cover assets/thumbnail.png` to select an image, or `--cover-time 1.5` to select
a frame. Capture failures block publishing; there is no skip-cover option.
Covers upload as WebP (640px maximum edge, up to 512000 bytes).
For screenshots, use installed Chrome/Edge/Chromium, set `UI2V_COVER_BROWSER`,
or install Chromium with `npx playwright@1.64.1 install chromium`.

## Migration note

`@ui2v/cli@1.x` exposed JSON validate/preview/render commands. That surface has
been removed. The current CLI distributes HyperFrames video motion packages;
authoring, preview, and rendering stay in HyperFrames.
