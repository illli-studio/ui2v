# Storyboard, Runtime, and XYZ Guide

Use this when a request involves multi-shot videos, segmented storyboards, runtime-core, depth, camera motion, scene graph, or polished demo pacing.

## segmented storyboard workflow

Plan shots first, then write JSON.

| Field | What to decide |
| --- | --- |
| Time range | `startTime`, `endTime`, duration, overlap/transition |
| Shot label | Human-readable `label` for inspection/debugging |
| Visual job | Hook, explain, prove, wow, compare, CTA, final lockup |
| Motion | camera push, orbit, parallax, chart reveal, physics beat, typography reveal |
| Depth | foreground/mid/background, z-order, camera z/zoom/fov, real 3D or pseudo-depth |
| Library stack | dependencies needed by this shot |
| Code/data | segment `data`, `datasets`, `assets`, and `code` |
| Exit frame | what the viewer should understand before the next segment |

Good README demo pacing:

1. **0-2s hook**: title, product promise, strong motion.
2. **2-5s proof**: UI/data/system capability with readable details.
3. **5-8s wow**: 3D, particles, physics, depth, or high-end transition.
4. **8-10s CTA**: command, logo, final still frame.

## Runtime-core features

Runtime JSON supports:

- `schema: "uiv-runtime"`
- `duration`, `fps`, `resolution`, `backgroundColor`
- `variables`, `theme`, `datasets`, `assets`
- `narration`, `audio.tracks`, `audio.markers`
- top-level `camera`
- `timeline.segments[]` or `segments[]`
- `scene.root` or `scene.nodes`
- segment `dependencies`, `data`, `transition`, `camera`, `layers`/`nodes`/`children`, `code`/`customCode`

Use runtime-core when you need inspectable shots, frame plans, active dependencies, camera/depth, or adapter routing.

## XYZ/depth/camera

Camera fields:

```json
{
  "camera": {
    "x": 0,
    "y": 0,
    "z": 0,
    "zoom": 1,
    "fov": 1200,
    "rotation": 0,
    "motion": [
      { "time": 0, "x": 0, "y": 0, "z": 0, "zoom": 1 },
      { "time": 4, "x": 40, "y": -20, "z": -240, "zoom": 1.2, "easing": "easeOutCubic" }
    ]
  }
}
```

Behavior to remember:

- `x` / `y` pan the camera.
- `z` affects perspective; negative z moves closer and increases `effectiveZoom`.
- `zoom` multiplies scale.
- `fov` controls perspective strength; default behavior works well around `1200`.
- `rotation` rotates the view.
- `camera.motion[]` keyframes are local to the camera origin time; segment camera motion is useful for shot-local moves.

Use three levels of depth:

- **Scene depth**: top-level camera motion and background/mid/foreground composition.
- **Segment depth**: segment `camera` for shot-specific push-ins, orbit feels, or z moves.
- **Object depth**: scene node `zIndex`, transforms, fake 3D projection, or real `THREE` objects.

## Transitions

Segments can declare `transition`:

```json
{
  "transition": { "type": "fade", "duration": 0.45, "easing": "easeOutCubic" }
}
```

Use transitions to support story structure, not to hide weak visuals. Keep them short for README clips.

## Markers, narration, audio

Use markers for beat sync and inspection:

```json
{
  "audio": {
    "markers": [
      { "id": "beat-1", "time": 1.2, "label": "Title lands" },
      { "id": "beat-2", "time": 4.8, "label": "Chart completes" }
    ]
  },
  "narration": [
    { "time": 0.2, "duration": 2.2, "text": "Turn JSON into production-ready video." }
  ]
}
```

## Scene graph and nodes

Use nodes when you want inspectable structure instead of one code blob:

```json
{
  "scene": {
    "root": {
      "id": "root",
      "type": "root",
      "children": [
        {
          "id": "hero-card",
          "type": "custom-code",
          "zIndex": 10,
          "transform": { "x": 0, "y": 0, "scaleX": 1, "scaleY": 1, "rotation": 0 },
          "properties": { "__runtimeAdapter": "ui2v.template-canvas" },
          "motion": [
            { "property": "opacity", "from": 0, "to": 1, "startTime": 0, "duration": 0.5, "easing": "easeOutCubic", "loop": false, "yoyo": false }
          ]
        }
      ]
    }
  }
}
```

Node features include `zIndex`, `visible`, `locked`, `opacity`, `blendMode`, `timing`, `transform`, `properties`, `dependencies`, `motion`, and `source`.

## Adapter routing

Runtime-core can route render-plan items by adapter metadata and dependencies. Use metadata like:

```json
{
  "properties": {
    "__runtimeAdapter": "ui2v.three",
    "__runtimeRenderer": "three"
  },
  "dependencies": ["THREE", "POSTPROCESSING"]
}
```

Use adapter metadata when a scene clearly belongs to a non-default renderer path. Keep fallback or explanatory metadata when the renderer is not fully implemented yet.

## Existing runtime examples to inspect

- `examples/runtime-storyboard/animation.json`: maintained runtime-core example with timeline segments, active dependencies, transitions, camera metadata, and `inspect-runtime` coverage.
