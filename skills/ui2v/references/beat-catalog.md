# Beat Catalog

Beats are reusable timeline stubs shared by Studio template strip, `list-beats`, and `insert-beat`.

Refresh the live catalog anytime:

```bash
ui2v list-beats --json
ui2v list-beats --schema template --json
ui2v list-beats --schema uiv-runtime --json
```

## Template beats (`beat-*`)

From `examples/library-timeline`. Use with **template** projects (`mode: "template"` or template layers).

| ID | Libraries | Typical job |
| --- | --- | --- |
| `beat-gsap` | `gsap` | kinetic UI / staged motion |
| `beat-d3` | `d3` | chart / data geometry |
| `beat-three` | `THREE` | 3D depth beat |
| `beat-matter` | `Matter` | 2D physics |
| `beat-rough` | `rough` | sketch / whiteboard feel |
| `beat-splittype` | `SplitType`, `gsap` | typography reveal |

Example:

```bash
ui2v insert-beat my-project/animation.json beat-d3 --time 3 --json
```

## Runtime beats (`runtime-*`)

Built-in segment stubs. Use with **`schema: "uiv-runtime"`** projects.

| ID | Libraries | Typical job |
| --- | --- | --- |
| `runtime-canvas-hook` | `canvas2d` | opener / title card |
| `runtime-gsap-beat` | `gsap`, `canvas2d` | motion segment stub |
| `runtime-data-reveal` | `d3`, `canvas2d` | data/chart segment stub |

Example:

```bash
ui2v insert-beat my-runtime/animation.json runtime-gsap-beat --time 2.5 --json
```

## Insertion rules

- template projects accept `beat-*` layers
- runtime projects accept `runtime-*` segments
- insertion merges libraries into project dependencies when needed
- inserted clips may extend project `duration`
- always run `validate` + `lint-timeline` after insertion
- replace stub `code` with production logic; stubs are starting points

## Studio insertion

In Preview Studio, click a beat in the template strip to insert at the playhead. Same catalog as CLI.
