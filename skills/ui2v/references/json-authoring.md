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

Runtime shape for `examples/runtime-core/*.json`:

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
