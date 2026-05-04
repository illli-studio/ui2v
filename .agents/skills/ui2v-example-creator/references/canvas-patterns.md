# Canvas Patterns

## Standard helpers

Use these helpers in large custom-code examples:

```js
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function easeOut(value) { value = clamp(value); return 1 - Math.pow(1 - value, 3); }
function easeInOut(value) { value = clamp(value); return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2; }
function pulse(time, speed, phase) { return 0.5 + 0.5 * Math.sin(time * speed + phase); }
function roundedRect(ctx, x, y, width, height, radius) { /* draw rounded rect path */ }
```

## Scene structure

Prefer:

```js
function render(time, context) {
  const ctx = context.mainContext;
  const width = context.width;
  const height = context.height;
  drawBackground(ctx, width, height, time);
  drawHeroCopy(ctx, width, height, time, easeOut(time / 1.2));
  drawProgress(ctx, width, height, time, duration);
}
```

## README GIF constraints

- Large text: 60-104px at 1920x1080.
- Important UI cards: at least 180px wide.
- Do not rely on fine lines below 1.3px.
- Keep first 4.5 seconds visually representative if used in README.
