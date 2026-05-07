# Basic Smoke

[English](README.md)

精致 Canvas 品牌开场，同时也是最小维护版端到端示例。它用于确认 JSON 解析、本地浏览器启动、Canvas 渲染和 MP4 导出都能正常工作，同时画面也足够适合作为第一印象 demo。

```bash
node packages/cli/dist/cli.js validate examples/basic-smoke/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high
```
