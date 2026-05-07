# JSON Authoring

Use this reference when converting an idea, storyboard, or library choice into actual ui2v JSON.

## Template vs runtime

Template shape for `examples/<name>/animation.json`:

```json
{
  "mode": "template",
  "duration": 8,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "backgroundColor": "#030712",
  "dependencies": ["canvas2d", "gsap", "d3"],
  "layers": []
}
```

Runtime shape for a runtime project such as `examples/runtime-storyboard/animation.json`:

```json
{
  "schema": "uiv-runtime",
  "id": "multi-shot-demo",
  "name": "Multi Shot Demo",
  "version": "0.1.0",
  "duration": 12,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "backgroundColor": "#030712",
  "theme": { "font": "Inter, system-ui", "colors": { "accent": "#00D4FF" } },
  "datasets": {},
  "assets": {},
  "dependencies": ["canvas2d", "gsap", "d3"],
  "camera": { "zoom": 1, "z": 0, "fov": 1200 },
  "timeline": { "segments": [] },
  "scene": { "root": { "id": "root", "type": "root", "children": [] } }
}
```

## Dependency mapping

Dependency metadata is part of the rendering contract. When writing custom-code
that uses browser/npm libraries, put the dependency names on the project,
segment, layer, or `properties.dependencies`. The runtime now also infers common
dependencies from code references, but explicit metadata is still required for
clear AI-authored JSON and reproducible review.

Use canonical keys recognized by the library manager when possible:

| Intent | Dependencies |
| --- | --- |
| Data chart reveal | `["canvas2d", "d3", "math"]` |
| Product/UI launch | `["canvas2d", "gsap", "SplitType"]` |
| 3D scene | `["THREE", "POSTPROCESSING"]` |
| Globe/network | `["THREE", "Globe"]` |
| 2D physics | `["canvas2d", "Matter"]` |
| 3D physics | `["THREE", "CANNON"]` |
| Particles | `["PIXI", "tsParticles"]` or `["canvas2d", "simplex"]` |
| Typography/glyphs | `["canvas2d", "SplitType", "opentype"]` |
| Equations | `["canvas2d", "katex"]` |
| Lottie/icons | `["canvas2d", "lottie", "iconify"]` |

Aliases may normalize, but use canonical names in new JSON: `anime`, `THREE`, `Matter`, `emotion`, `katex`, `math`, `d3`, `gsap`, `p5`, `fabric`, `rough`, `PIXI`, `TWEEN`, `paper`, `Konva`, `lottie`, `iconify`, `Globe`, `tsParticles`, `CANNON`, `POSTPROCESSING`, `opentype`, `simplex`, `SplitType`.

## Multi-library timeline pattern

For multi-library JSON, make the timeline prove the library usage. Prefer
separate `timeline.segments[]` entries instead of one segment that lists every
dependency. Each segment should declare only the libraries it uses and should
call those APIs in code that affects visible output.

```json
{
  "schema": "uiv-runtime",
  "duration": 9,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "dependencies": ["canvas2d"],
  "timeline": {
    "segments": [
      {
        "id": "title-gsap",
        "label": "GSAP and SplitType title reveal",
        "startTime": 0,
        "endTime": 1.5,
        "dependencies": ["canvas2d", "gsap", "SplitType"],
        "code": "function render(t, context) { const gsap = context.libs?.gsap || globalThis.gsap; const SplitType = context.libs?.SplitType || globalThis.SplitType; const ctx = context.ctx; /* use gsap easing/SplitType-style letter timing to draw staggered title */ }"
      },
      {
        "id": "data-d3",
        "label": "D3 and math data reveal",
        "startTime": 1.5,
        "endTime": 3,
        "dependencies": ["canvas2d", "d3", "math"],
        "code": "function render(t, context) { const d3 = context.libs?.d3 || globalThis.d3; const math = context.libs?.math || globalThis.math; const ctx = context.ctx; /* use d3 scales and math interpolation to draw animated chart */ }"
      },
      {
        "id": "three-depth",
        "label": "THREE spatial beat",
        "startTime": 3,
        "endTime": 4.5,
        "dependencies": ["THREE", "POSTPROCESSING"],
        "code": "function render(t, context) { const THREE = context.libs?.THREE || globalThis.THREE; const POSTPROCESSING = context.libs?.POSTPROCESSING || globalThis.POSTPROCESSING; /* render or project a 3D scene with lighting/depth */ }"
      }
    ]
  }
}
```

This snippet is a structural pattern, not final production code. In a finished
example, replace comments with visible API calls and render-check timestamps for
each segment. Do not claim a library is demonstrated until the exported video
shows that segment working.

## Local media from access/

When a project needs user-provided photos, videos, or music, put those files in
an `access/` folder next to `animation.json`. Reference them from JSON with
relative paths such as `access/photo.png`, `access/clip.mp4`, and
`access/music.wav`. Do not fetch local media from custom code when a media layer
can represent it directly.

```text
examples/my-media/
  animation.json
  access/
    photo.png
    clip.mp4
    music.wav
```

Use `image-layer` for photos, `video-layer` for inserted video clips, and
`audio-layer` or root `audio.tracks` for music. Root audio tracks are muxed into
the exported MP4; `audio-layer` also draws an animated waveform/timeline in the
canvas.

```json
{
  "audio": {
    "tracks": [
      {
        "id": "music",
        "src": "access/music.wav",
        "startTime": 0,
        "duration": 6,
        "volume": 0.6,
        "fadeIn": 0.3,
        "fadeOut": 0.5,
        "loop": true
      }
    ]
  },
  "template": {
    "layers": [
      {
        "id": "photo",
        "type": "image-layer",
        "startTime": 0,
        "endTime": 6,
        "properties": {
          "src": "access/photo.png",
          "fitMode": "cover",
          "x": 80,
          "y": 100,
          "width": 520,
          "height": 420,
          "radius": 24
        }
      },
      {
        "id": "clip",
        "type": "video-layer",
        "startTime": 1,
        "endTime": 6,
        "properties": {
          "src": "access/clip.mp4",
          "fitMode": "cover",
          "x": 650,
          "y": 110,
          "width": 560,
          "height": 360,
          "radius": 24
        }
      },
      {
        "id": "music-ui",
        "type": "audio-layer",
        "startTime": 1.4,
        "endTime": 6,
        "properties": {
          "src": "access/music.wav",
          "fadeIn": 0.3,
          "fadeOut": 0.5
        }
      }
    ]
  }
}
```

Supported audio track controls: `volume`, `loop`, `duration`, `trimStart`,
`trimEnd`, `fadeIn`, and `fadeOut`. Keep fades short and intentional so inserted
music does not pop at the start or end.

## Segment JSON pattern

Use segments as shots. Each segment should say when it happens, what it needs, and how it renders.

```json
{
  "id": "data-proof",
  "label": "Data proof",
  "startTime": 2,
  "endTime": 5.5,
  "dependencies": ["canvas2d", "d3", "gsap"],
  "transition": { "type": "fade", "duration": 0.35, "easing": "easeOutCubic" },
  "camera": {
    "x": 0,
    "y": 0,
    "z": -120,
    "zoom": 1.05,
    "motion": [
      { "time": 0, "z": 0, "zoom": 1 },
      { "time": 3.5, "z": -160, "zoom": 1.08, "easing": "easeOutCubic" }
    ]
  },
  "data": { "headline": "Live metrics" },
  "code": "function render(t, context) { const ctx = context.ctx; }"
}
```

## Accessing libraries in code

Runtime segment code should defensively read libraries from the runtime context or browser global:

```js
function render(t, context) {
  const ctx = context.ctx;
  const width = context.width;
  const height = context.height;
  const progress = context.progress;

  const d3 = context.libs?.d3 || globalThis.d3;
  const gsap = context.libs?.gsap || globalThis.gsap;
  const THREE = context.libs?.THREE || globalThis.THREE;

  // derive all visible state from t/progress
}
```

For libraries with heavy setup (`THREE`, `PIXI`, `Matter`, `CANNON`), avoid nondeterministic state. Either derive positions from `t`, precompute simple state, or follow nearby examples that provide setup/cache patterns.

## JSON-safe code rules

- `code` is stored as a JSON string; escape quotes/newlines or use the existing repository pattern for multiline code.
- Avoid markdown fences inside JSON unless the consuming workflow explicitly extracts them.
- Do not paste invalid control characters, smart quotes, or unescaped backticks.
- Keep code deterministic; no unseeded `Math.random()` for visible output.
- Run `validate` after every significant JSON edit.

## Static custom-code inspection

Runtime-core can inspect/sanitize common code forms. It detects entrypoints such as `createRenderer`, `createAnimation`, `render`, `setup/draw`, `module.exports`, and `export default`, and can infer some dependency hints from code. Still, explicit `dependencies` in JSON are preferred.

If code mentions supported globals such as `THREE`, `d3`, `gsap`, `PIXI`,
`Matter`, `fabric`, `rough`, `p5`, `paper`, `Konva`, `TWEEN`, `math`, `katex`,
`Globe`, `tsParticles`, `CANNON`, `POSTPROCESSING`, `opentype`, `simplex`, or
`SplitType`, ui2v will add those dependencies to the runtime plan before
preview/render. Do not rely on that as your only documentation; keep the JSON
dependency list in sync with the visual plan.
