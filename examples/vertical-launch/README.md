# Vertical Launch

[中文](README.zh.md)

9:16 social launch reference for the vertical playbook in `skills/ui2v/references/video-playbooks.md`.

| Time | Segment | Job |
| --- | --- | --- |
| 0-2.5s | `hook` | centered headline, fast gsap easing |
| 2.5-5.5s | `proof` | phone-card UI + d3 bar reveal |
| 5.5-8s | `cta` | brand lockup + install command |

Resolution is **1080x1920**. Copy uses large center-weighted type and safe side margins for vertical feeds.

```bash
node packages/cli/dist/cli.js validate examples/vertical-launch/animation.json --verbose
node packages/cli/dist/cli.js lint-timeline examples/vertical-launch/animation.json
node packages/cli/dist/cli.js preview examples/vertical-launch/animation.json --pixel-ratio 1
node packages/cli/dist/cli.js render examples/vertical-launch/animation.json -o .tmp/examples/vertical-launch.mp4 --quality high
```
