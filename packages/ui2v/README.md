# ui2v

The short npm package for installing the `ui2v` command.

ui2v turns structured animation JSON into polished MP4 videos with a local system browser, Canvas, WebCodecs, and Node.js. Use it for README hero clips, AI product launch trailers, data stories, UI demos, logo reveals, and repeatable video templates that can live in Git.

## Install

```bash
npm install -g ui2v
ui2v doctor
```

With Bun:

```bash
bun install -g ui2v
ui2v --version
```

## First Render

```bash
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

Run without a global install:

```bash
npx ui2v render animation.json -o output.mp4 --quality high
```

## What You Can Build

- README hero videos and launch trailers for open-source projects.
- Product walkthroughs with glass UI, cards, charts, particles, and camera motion.
- Dashboard/data-story videos for growth, finance, commerce, or operations metrics.
- Logo reveals, social launch ads, feature announcements, and release notes clips.
- AI-generated animation JSON that can be reviewed, versioned, previewed, and rendered locally.

## Browser Requirement

ui2v uses `puppeteer-core`, so it does not download a bundled Chromium. Install Chrome, Edge, or Chromium locally. If auto-detection fails, set one of these paths:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome ui2v doctor
CHROME_PATH=/path/to/chrome ui2v doctor
CHROMIUM_PATH=/path/to/chromium ui2v doctor
EDGE_PATH=/path/to/edge ui2v doctor
```

## More

- CLI implementation: [`@ui2v/cli`](https://www.npmjs.com/package/@ui2v/cli)
- Repository and examples: <https://github.com/illli-studio/ui2v>
- Documentation: <https://github.com/illli-studio/ui2v#readme>

MIT