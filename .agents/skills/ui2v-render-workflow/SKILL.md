---
name: ui2v-render-workflow
description: Use when validating ui2v projects, rendering MP4s with the local CLI, exporting GIF/JPG README preview assets, refreshing assets/showcase, or preparing release/demo media for this ui2v repository.
metadata:
  short-description: Render and export ui2v media
---

# ui2v Render Workflow

Use this skill whenever a task involves turning ui2v JSON into video or README-ready media assets.

## Coordinate with render capabilities

If a render task also involves choosing visual techniques, built-in libraries, or dependency keys, use `$ui2v-render-capabilities` first, then validate/render with this workflow.

## Standard validation

Run from repository root:

```bash
node packages/cli/dist/cli.js validate examples/<name>/animation.json --verbose
```

For runtime-core examples:

```bash
node packages/cli/dist/cli.js validate examples/runtime-core/<file>.json --verbose
node packages/cli/dist/cli.js inspect-runtime examples/runtime-core/<file>.json --time 2 --time 8 --json
```

## Standard render

Render to `.tmp/examples`, not the repo root:

```bash
node packages/cli/dist/cli.js render examples/<name>/animation.json -o .tmp/examples/<name>.mp4 --quality high
```

Runtime example:

```bash
node packages/cli/dist/cli.js render examples/runtime-core/<file>.json -o .tmp/examples/<file-without-json>.mp4 --quality high
```

## README asset export

Use GIF/JPG in `assets/showcase`; keep full MP4s in `.tmp/examples`, releases, issue attachments, or CDN.

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/<name>.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/<name>.gif

ffmpeg -y -ss 1 -i .tmp/examples/<name>.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/<name>.jpg
```

On PowerShell, redirect noisy ffmpeg output only when appropriate:

```powershell
& ffmpeg ... *> $null
```

## README rules

- Put GIF/JPG paths in `README.md` and `README_zh.md` only if the asset is committed.
- Keep README GIFs ideally under 3 MB; 640px wide, 10fps, 4.5 seconds is the default.
- If a GIF is too large, reduce duration, width, fps, or palette colors before reducing visual quality.
- Never commit `.tmp/examples/*.mp4` unless the user explicitly asks.

## Final checks

```bash
node scripts/validate-examples.mjs
```

Also check generated docs and assets:

```bash
node -e "const fs=require('fs'); for (const f of ['README.md','README_zh.md']) { const t=fs.readFileSync(f,'utf8'); console.log(f, t.charCodeAt(0)===0xFEFF, [...t].some(ch=>ch.charCodeAt(0)===65533)); }"
```

## Troubleshooting

- If render fails before launching browser, run `node packages/cli/dist/cli.js doctor`.
- If a runtime example validates but renders blank, inspect the sampled runtime with `inspect-runtime --time`.
- If PowerShell displays Chinese as mojibake, verify with Node UTF-8 reads before rewriting files.

## When to read references

- Read `references/showcase-assets.md` before changing README gallery assets.
