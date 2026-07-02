# Example Roles

## Core tour (start here)

| Example | Role | Libraries / path |
| --- | --- | --- |
| `examples/basic-smoke` | smallest polished render sanity check | Canvas 2D |
| `examples/access-media` | local photos, video, waveform, muxed audio | media layers + `audio.tracks` |
| `examples/library-timeline` | multi-library timeline with visible beats | `gsap`, `d3`, `THREE`, `Matter`, `rough`, `SplitType` |
| `examples/runtime-storyboard` | segmented runtime, transitions, camera, inspect | runtime segments |
| `examples/type-systems-map` | formulas, icons, glyph outlines | `katex`, `iconify`, `opentype` |

Suggested evaluation order: `access-media` -> `library-timeline` -> `runtime-storyboard` -> `type-systems-map`.

## Full gallery

| Example | What you should see | Primary stack |
| --- | --- | --- |
| `basic-smoke` | launch card, glow, gradients | Canvas 2D |
| `access-media` | image + video + waveform + audio mux | media layers |
| `library-timeline` | one library per time beat | multi-library timeline |
| `runtime-storyboard` | segmented story, camera, inspect | runtime-core |
| `vertical-launch` | 9:16 social hook / proof / CTA | runtime segments, `gsap`, `d3` |
| `pixi-signal` | radar, particles, scan rings | `PIXI` |
| `paper-route` | vector route, checkpoints | `paper` |
| `konva-launch-board` | product board from object nodes | `Konva` |
| `anime-motion-rig` | orbit, spread, glow, tilt | `anime` |
| `tween-control-room` | gauges/cards with yoyo motion | `TWEEN` |
| `particles-aurora` | aurora particle field | `tsParticles` |
| `lottie-status-pack` | status cards with Lottie seeking | `lottie` |
| `p5-flow-garden` | generative garden / flow lines | `p5` |
| `fabric-poster-lab` | kinetic poster from object primitives | `fabric` |
| `cannon-cargo-drop` | rigid-body cargo drop | `CANNON` |
| `type-systems-map` | technical map with formulas/icons/glyphs | `katex`, `iconify`, `opentype` |

Read `examples/README.md` for preview/render commands for every example.

## Naming

- template examples: lowercase hyphen folders (`library-timeline`)
- runtime examples: descriptive folders (`runtime-storyboard`)
- stable ids for README links and beat templates (`beat-gsap`, etc.)

## What makes an example attractive

- clear target user and use case (README hero, launch clip, dashboard, social ad)
- copy that explains value without external context
- each declared library owns a visible beat
- validates, lints cleanly, renders, and can become a < 3 MB GIF

## When to clone which example

| User request | Clone |
| --- | --- |
| "vertical / 9:16 / social ad" | `vertical-launch` |
| "multi-library timeline" | `library-timeline` |
| "segmented runtime / inspect" | `runtime-storyboard` |
| "photo + video + music" | `access-media` |
| "single library X demo" | matching row in full gallery |
| "README smoke test" | `basic-smoke` |
