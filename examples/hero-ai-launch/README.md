# Hero AI Launch

[中文](README.zh.md)

A README-first hero trailer designed to make ui2v feel premium in the first five seconds.

This example is intentionally more polished than a minimal smoke test: it combines cinematic background lighting, glass UI panels, animated code/video cards, a prompt-to-MP4 pipeline, and a final CTA lockup.

## Render

```bash
ui2v validate examples/hero-ai-launch/animation.json --verbose
ui2v preview examples/hero-ai-launch/animation.json --pixel-ratio 2
ui2v render examples/hero-ai-launch/animation.json -o .tmp/examples/hero-ai-launch.mp4 --quality high
```

## Customize

- Replace the final CTA with your own install command, URL, or launch message.
- Keep headline text large enough to read in a 640-720px README GIF.
- Preserve the prompt → JSON → Canvas → WebCodecs → MP4 story if you want to explain the product quickly.
- Use this example as the base for AI app launches, devtool launches, open-source release trailers, and social announcement clips.

## README Preview Asset

```bash
ffmpeg -y -ss 0 -t 5 -i .tmp/examples/hero-ai-launch.mp4 \
  -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/hero-ai-launch.gif
```

Keep full MP4 files in `.tmp/examples`, release assets, or a CDN. Commit only lightweight preview assets under `assets/showcase`.