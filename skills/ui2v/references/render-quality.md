# Render Quality and Troubleshooting

Use this when choosing output settings, debugging failed renders, or matching preview to final MP4.

## Preview vs render

| Step | Command | Purpose |
| --- | --- | --- |
| Fast iteration | `ui2v preview project.json` | Studio scrub, inspect, lint |
| Schema check | `ui2v validate project.json --verbose` | JSON/code contract |
| Timeline check | `ui2v lint-timeline project.json` | segment/layer timing health |
| Production output | `ui2v render project.json -o out.mp4 --quality high` | MP4 export |

Preview uses fitted canvas in the browser. Render launches headless/local browser encoding through WebCodecs.

Always validate before render. For runtime projects, inspect 2-3 timestamps before a long render.

## Render settings

```bash
ui2v render animation.json -o .tmp/examples/demo.mp4 --quality high
ui2v render animation.json -o out.mp4 --quality high --fps 60
ui2v render animation.json -o out.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o out.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o out.mp4 --timeout 300 --no-headless
```

| Flag | Guidance |
| --- | --- |
| `--quality low\|medium\|high\|ultra\|cinema` | start with `high`; use lower while iterating |
| `--fps` | match project `fps` unless intentionally overriding |
| `--width` / `--height` | override output resolution |
| `--render-scale` | supersample for sharper text/lines; slower |
| `--pixel-ratio` | preview only; sharper Studio canvas |
| `--codec avc` | default H.264 path |
| `--codec hevc` | only if local browser supports it |
| `--timeout` | raise for long clips or heavy 3D |
| `--no-headless` | debug browser render visually |

Workflow:

1. preview and validate at target resolution
2. render a short slice or low quality if iterating on code
3. final render at `--quality high` or higher

## Environment checks

```bash
ui2v doctor
ui2v --version
npm view @ui2v/cli version
```

Doctor verifies local Chrome/Edge/Chromium discovery. Rendering requires a supported browser via `puppeteer-core`; ui2v does not download bundled Chromium.

If doctor fails, install Chrome/Edge or set browser path env vars documented in CLI README.

## Failure triage

### validate fails

- fix JSON schema, escaped code strings, missing `duration`/`fps`/`resolution`
- read first 3-8 validator errors; do not patch blindly

### lint-timeline errors

- duplicate ids: rename clip/segment
- clip after duration: shorten clip or extend project `duration`
- gaps in runtime segments: use Ripple or align `endTime`/`startTime`

### preview works, render fails

- run `ui2v doctor`
- retry with `--no-headless` to see browser console errors
- simplify heavy segments (THREE/physics) and rerender
- increase `--timeout`

### custom-code runtime error

- error usually names segment/layer and JS exception
- reduce code to deterministic draw from `context.progress`
- ensure dependencies declared match globals used

### library not visible

- confirm dependency in JSON and code path executes
- compare with closest maintained example
- run `inspect-runtime` to see active dependencies at that time

### audio missing in export

- use root `audio.tracks` for muxed MP4 audio
- `audio-layer` alone is primarily visual waveform unless paired with tracks

### output too large / too slow

- lower resolution for drafts
- avoid unnecessary `--render-scale`
- shorten duration or reduce particle/physics complexity

## README export commands

After MP4 exists:

```bash
ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/<name>.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/<name>.gif

ffmpeg -y -ss 1 -i .tmp/examples/<name>.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/<name>.jpg
```

See `references/showcase-assets.md` for size targets.
