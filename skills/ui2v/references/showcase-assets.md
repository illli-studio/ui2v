# Showcase Assets

## Current README asset names

The maintained examples currently render MP4s into `.tmp/examples`. Generate
showcase GIF/JPG files only when the root README needs visual previews.

- `assets/showcase/basic-smoke.gif` / `.jpg`
- `assets/showcase/library-timeline.gif` / `.jpg`
- `assets/showcase/access-media.gif` / `.jpg`
- `assets/showcase/runtime-storyboard.gif` / `.jpg`

## Recommended matrix

| Slot | Example | Role |
| --- | --- | --- |
| Basic Smoke | `examples/basic-smoke` | Minimal render sanity check |
| Library Timeline | `examples/library-timeline` | Visible multi-library timeline |
| Access Media | `examples/access-media` | Local photos, video, waveform, and muxed audio |
| Runtime Storyboard | `examples/runtime-storyboard` | Runtime segments, transitions, camera, and inspection |

## Size targets

- GIF: under 3 MB preferred.
- JPG poster: under 150 KB preferred.
- MP4: store in `.tmp/examples` locally or release assets remotely.
