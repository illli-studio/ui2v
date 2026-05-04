# Runtime Patterns

## Segment timing

Use clean, non-overlapping segments for README demos:

- 0-4s hero / overview
- 4-8s data or primary content
- 8-12s workflow / depth / operation
- 12-16s final CTA or report

Shorter demos can use 3-second segments.

## Shared helper pattern

Because each segment is self-contained, duplicate small helpers inside each segment code string:

```js
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function easeOut(value) { value = clamp(value); return 1 - Math.pow(1 - value, 3); }
function rr(ctx, x, y, w, h, r) { /* rounded rect path */ }
```

## Inspection-friendly metadata

- Use meaningful `id` and `label` for each segment.
- Keep `duration`, `fps`, and `resolution` explicit.
- Add project-level `name` and `version`.
- Use stable dependency names such as `canvas2d`.
