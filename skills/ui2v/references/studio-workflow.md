# Studio Workflow

Use this for interactive editing, beat insertion, timeline lint, and v1.2.0+ Studio features.

## Open Studio

```bash
ui2v preview examples/runtime-storyboard/animation.json --pixel-ratio 1
```

Studio includes:

- project sidebar and search
- multi-track timeline (runtime segments + template layers)
- playhead scrub, frame stepping, spacebar play/pause
- **Clip Inspector**: label, dependencies, save
- **Split at playhead** for editable clips
- **Ripple** toggle for linked retime
- beat template strip
- timeline lint chips
- CodeMirror JSON editor (textarea fallback if CDN unavailable)
- MP4 export through browser save flow

Edits to timeline timing and clip metadata write back to `animation.json`.

## Ripple editing

Toggle **Ripple** in the timeline header.

| Project type | Ripple behavior |
| --- | --- |
| `schema: "uiv-runtime"` segments | pack segments edge-to-edge; trim-start adjusts previous segment end; later segments keep duration |
| template layers (same `zIndex`) | later clips on the same track shift by the edit delta |

Ripple mode persists in browser `localStorage` (`ui2v-timeline-mode`).

API equivalent:

```bash
curl -X POST http://127.0.0.1:<port>/preview/patch \
  -H 'content-type: application/json' \
  -d '{"path":"examples/runtime-storyboard/animation.json","mode":"ripple","updates":[{"id":"hook","kind":"segment","endTime":2.8}]}'
```

## Beat templates

List catalog:

```bash
ui2v list-beats
ui2v list-beats --schema template --json
ui2v list-beats --schema uiv-runtime --json
```

Insert beat:

```bash
ui2v insert-beat animation.json beat-gsap --time 2 --json
ui2v insert-beat animation.json runtime-canvas-hook --time 0 --json
```

Read `references/beat-catalog.md` for template IDs.

After insert:

```bash
ui2v validate animation.json --verbose
ui2v lint-timeline animation.json
```

## Timeline lint

CLI:

```bash
ui2v lint-timeline animation.json
ui2v lint-timeline animation.json --json
```

Exit code is **1** when errors exist.

Studio and API also expose lint at `/preview/lint`.

Common lint items:

| Severity | Meaning |
| --- | --- |
| error | duplicate clip id, clip ends after project duration, clip starts before 0 |
| warning | gap/overlap between clips, missing dependencies, fps misalignment, extremely short clip, empty timeline |

For runtime storyboard videos, prefer contiguous segments. Use Ripple or manual patch to remove gaps.

## Runtime inspect at playhead

```bash
ui2v inspect-runtime animation.json --time 1 --time 4 --time 7 --json
```

Studio **Inspect** panel shows active segment, active clips, dependencies, frame number, and lint at the current playhead.

Use inspect to verify segment boundaries and dependency activation before rendering long clips.

## Recommended agent loop

```text
storyboard -> choose template/runtime -> list-beats (optional)
-> insert-beat / author JSON -> validate -> lint-timeline
-> inspect-runtime (runtime) -> preview (Studio scrub)
-> render MP4 -> GIF/JPG if README asset requested
```

## Split workflow

Studio: select clip, move playhead inside clip, click **Split here**.

API:

```bash
POST /preview/split
{ "path": "...", "id": "proof", "kind": "segment", "time": 4.8 }
```

Split creates `(A)` and `(B)` segments/layers with deterministic ids.

## When to use Studio vs CLI-only

| Task | Prefer |
| --- | --- |
| Agent bulk JSON generation | CLI validate/lint/render |
| Human timing tweaks | Studio drag + Ripple |
| Insert known beat | `insert-beat` or template strip |
| Debug active segment | Studio inspect or `inspect-runtime` |
| Save full JSON edits | Studio JSON panel or external editor |
