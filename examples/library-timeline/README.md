# Library Timeline

[中文](README.zh.md)

Maintained multi-library showcase. The animation is split into time-based beats
so every dependency has a visible job instead of being listed only in metadata.

| Time | Libraries | Visible proof |
| --- | --- | --- |
| 0-2.5s | `gsap`, `SplitType` | Kinetic type with staggered timing and GSAP easing |
| 2.5-5s | `d3`, `math` | Data chart scaled by D3 and summarized by mathjs |
| 5-7.5s | `THREE`, `POSTPROCESSING` | Rotating projected depth form and loaded effect API list |
| 7.5-10s | `Matter`, `simplex`, `iconify` | Physics bodies, noise field, and rendered MDI rocket path |

```bash
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```
