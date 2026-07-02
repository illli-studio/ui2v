# Video Playbooks

Use this when the user asks for a finished video, not just valid JSON. Pick a playbook, write a shot plan, then encode it into template layers or runtime segments.

## Before you write JSON

Answer these in one short plan:

| Question | Why it matters |
| --- | --- |
| Audience | founder, developer, data team, consumer |
| Destination | README hero, launch page, social ad, in-app demo |
| Duration | 6-12s for README/social, 10-20s for product walkthrough |
| Aspect ratio | 16:9 default; 9:16 for vertical social if requested |
| Proof | what must be readable in the first 2 seconds |
| Library budget | 1-2 libraries per beat beats a fake long dependency list |

Then fill a beat sheet:

| Time | Shot | Visual job | Libraries | Exit frame |
| --- | --- | --- | --- | --- |
| ... | ... | hook / proof / wow / CTA | ... | what viewer understands |

Do not skip the beat sheet for multi-library requests.

## Playbook: product / AI app launch (16:9, 8-12s)

Best shape: **runtime segments** or **template layers** with separate beats.

| Time | Shot | Content | Libraries | Notes |
| --- | --- | --- | --- | --- |
| 0-2s | Hook | product name + one-line promise | `gsap`, `SplitType` | large type, fast motion |
| 2-5s | Proof | UI panel, workflow, or agent output | `canvas2d`, chosen UI lib | show real capability |
| 5-8s | Wow | depth, particles, 3D, or physics | `THREE`, `PIXI`, `Matter`, etc. | one strong visual surprise |
| 8-10s | CTA | command, URL, logo lockup | same stack or simpler | hold final frame 0.5-1s |

Start from: `examples/vertical-launch`, `examples/library-timeline`, `examples/konva-launch-board`.

## Playbook: data / dashboard story (16:9, 10-15s)

| Time | Shot | Content | Libraries |
| --- | --- | --- | --- |
| 0-2s | Frame | headline + context | `canvas2d` |
| 2-6s | Chart proof | bars/lines/map animate from data | `d3` |
| 6-9s | Insight | highlight, compare, annotation | `d3`, `gsap` |
| 9-12s | CTA | metric, report title, brand | `canvas2d` |

Start from: `examples/library-timeline` beat `beat-d3`, `examples/runtime-storyboard` proof segment, `examples/tween-control-room`.

## Playbook: devtool / technical explainer (16:9, 10-16s)

| Time | Shot | Content | Libraries |
| --- | --- | --- | --- |
| 0-2s | Problem | pain point in large type | `gsap`, `SplitType` |
| 2-6s | System map | nodes, routes, architecture | `paper`, `Konva`, `canvas2d` |
| 6-10s | Runtime proof | segmented inspect-friendly demo | runtime segments + `inspect-runtime` |
| 10-14s | Command CTA | install/run command | `canvas2d`, `iconify`, `katex` if formulas |

Start from: `examples/type-systems-map`, `examples/paper-route`, `examples/runtime-storyboard`.

## Playbook: social / vertical ad (9:16, 6-10s)

Set resolution explicitly, e.g. `{ "width": 1080, "height": 1920 }`.

| Time | Shot | Rule |
| --- | --- | --- |
| 0-1.5s | Hook | one message, center-weighted, no tiny UI |
| 1.5-4s | Proof | one feature only |
| 4-6s | CTA | logo + short command |

Rules:

- type >= 72px at 1080 width equivalent
- no more than 2 library beats
- keep safe margins; do not assume desktop layout

Start from: `examples/vertical-launch`.

## Playbook: media-rich promo (photo/video/audio)

Use `access/` beside `animation.json`.

| Layer type | Use for |
| --- | --- |
| `image-layer` | hero photo, product still |
| `video-layer` | screen recording or b-roll; add `posterSrc` when possible |
| `audio-layer` | visible waveform UI |
| `audio.tracks` | mux music into exported MP4 |

Start from: `examples/access-media`.

## Playbook: single-library showcase

When the user names one library, clone the closest maintained example instead of inventing from scratch:

| Library | Example |
| --- | --- |
| `PIXI` | `examples/pixi-signal` |
| `paper` | `examples/paper-route` |
| `Konva` | `examples/konva-launch-board` |
| `anime` | `examples/anime-motion-rig` |
| `TWEEN` | `examples/tween-control-room` |
| `tsParticles` | `examples/particles-aurora` |
| `lottie` | `examples/lottie-status-pack` |
| `p5` | `examples/p5-flow-garden` |
| `fabric` | `examples/fabric-poster-lab` |
| `CANNON` | `examples/cannon-cargo-drop` |
| `katex` / `iconify` / `opentype` | `examples/type-systems-map` |

## Finished-video quality bar

Before calling a video done, verify:

1. **First frame**: not empty; brand or subject visible immediately.
2. **First 2 seconds**: hook readable without pausing.
3. **Library honesty**: every declared dependency has a visible beat where its API changes pixels.
4. **Timing**: segments/layers align to fps grid; runtime segments have no accidental gaps unless intentional.
5. **Validation**: `ui2v validate --verbose` passes.
6. **Timeline lint**: `ui2v lint-timeline` has zero errors.
7. **Runtime inspect** (if runtime): active segment/dependencies make sense at 2-3 timestamps.
8. **Preview**: scrub through Studio or preview once before long render.
9. **Render**: MP4 exported at intended quality/resolution.
10. **README asset** (if requested): GIF < 3 MB, poster JPG, first 4.5s representative.

## Common failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Blank or static preview | invalid code string, wrong entrypoint | check `validate`, simplify segment code |
| Library claimed but not visible | dependency listed but code uses raw Canvas only | split beat, call library API |
| Segment jump / black flash | gap or overlap in runtime timeline | enable Ripple in Studio or fix segment bounds |
| Audio missing in MP4 | only `audio-layer`, no `audio.tracks` | add root track for mux |
| Render much slower than preview | `--quality ultra`, high resolution, heavy 3D | test at `--quality high`, lower resolution first |
| Text unreadable in GIF | type too small or thin strokes | enlarge type, simplify scene for README export |
