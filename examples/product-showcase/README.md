# Product Showcase Example

[中文](README.zh.md)

A richer ui2v example for a product-style motion graphic. It demonstrates
layered background drawing, typography, animated product framing, and
call-to-action elements.

## Files

- `animation.json`: product showcase animation project

## Features

- Gradient-style background treatment
- Product and logo presentation
- Timed title and subtitle motion
- Call-to-action visual element
- Custom-code Canvas rendering

## Usage

From the repository root with a local build:

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```
