# Open Renderer Preview

[中文](open-source-preview-article.zh.md)

ui2v explores a structured-video workflow: describe interface motion as JSON and
code, evaluate it with a deterministic runtime, render it in a real browser, and
export it as a video file.

## Why Structured Video

Many UI videos are not camera footage. They are animated interfaces, data
stories, product demos, diagrams, kinetic typography, or generated visual
systems. These are often easier to describe as structured scenes and timelines
than as manually edited video tracks.

Structured projects have useful properties:

- Text, colors, timing, layout, and data can be edited directly.
- The same template can generate many versions.
- AI systems can produce inspectable plans instead of opaque pixels.
- Render output can be validated in CI or automated content pipelines.

## What This Repository Opens

This repository focuses on the rendering foundation:

- A JSON project model.
- A runtime core for scene graph and timeline evaluation.
- A browser Canvas engine for visual output.
- A Puppeteer producer for preview and MP4 export.
- A CLI for validation, inspection, preview, and rendering.

It is not a full visual editor. It is the lower-level renderer that other
editors, agents, scripts, and automation systems can build on.

## Browser-Backed Rendering

The renderer intentionally uses a browser for browser-native work. Canvas,
DOM-compatible libraries, WebGL ecosystems, and WebCodecs are already available
there. The CLI uses Puppeteer to launch that environment, then writes the final
file from Node.js.

The primary path avoids Electron, FFmpeg, and native canvas bindings.

## Current Boundaries

- MP4 is the main production output.
- AVC/H.264 is the default codec.
- Browser dependencies may load through pinned CDN URLs.
- Encoded output currently returns to Node as base64 before being written.

These boundaries are explicit so contributors and integrators can plan around
them while the renderer matures.

## Direction

The long-term goal is a reliable renderer for generated, programmable, and
repeatable UI video. That includes stronger offline dependency handling,
streamed output, more adapters, richer examples, and better inspection tools.
