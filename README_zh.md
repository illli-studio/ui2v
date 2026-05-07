# ui2v

[English](README.md)

<p align="center">
  <img src="assets/brand/ui2v-logo-readme-official-banner.jpg" alt="ui2v logo" width="760">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ui2v/cli"><img alt="npm version" src="https://img.shields.io/npm/v/@ui2v/cli?color=00d4ff"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-f2aa4c"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-7bd88f">
</p>

ui2v 可以把结构化动画 JSON 渲染成浏览器生成的 MP4 视频。你可以把动效、数据可视化、媒体素材、分镜时间线和自定义代码写进 JSON，然后用本地 Chrome、Edge 或 Chromium 预览并导出成视频。

它适合做产品发布片、AI 生成视频、数据故事、UI 演示、品牌开场、本地媒体合成，以及可以放进 Git 工作流反复生成的动效系统。

## 核心能力

- **JSON 到 MP4**：通过 CLI 验证、预览、检查和渲染动画项目。
- **浏览器渲染**：使用 `puppeteer-core` 驱动本机 Chrome、Edge 或 Chromium。
- **真实多库应用**：可以在项目、分段、图层或 custom-code 层声明依赖。
- **按时间线展示能力**：多库视频应拆成可见片段，而不是一个巨大 code blob。
- **Runtime 分镜**：支持 `schema: "uiv-runtime"`、`timeline.segments[]`、转场、相机 metadata 和 `inspect-runtime`。
- **本地资源**：把照片、视频、音乐放进 `access/`，从 JSON 中引用。

## Codex Skill

安装仓库内置的 ui2v skill：

```bash
npx skills add illli-studio/ui2v --skill ui2v
```

当仓库里的 skill 更新后，可以强制刷新：

```bash
npx skills add illli-studio/ui2v --skill ui2v --force
```

Skill 位于 [`skills/ui2v`](skills/ui2v/SKILL.md)。它会指导 AI 做分镜规划、选择 template/runtime JSON、使用多库能力、本地资源、相机/深度、验证和 MP4 渲染。当前 skill 明确要求：多个库必须按时间线真实应用，不能只写在依赖里却没有可见效果。

## 维护中的展示示例

旧的实验性 examples 已经删除。现在 `examples/` 只保留四个维护版示例，作为项目能力展示和 AI 生成参考。

| 示例 | 展示内容 | 渲染命令 |
| --- | --- | --- |
| [`examples/basic-smoke`](examples/basic-smoke/README.zh.md) | 精致 Canvas 品牌开场，同时也是最小端到端烟测。 | `ui2v render examples/basic-smoke/animation.json -o .tmp/examples/basic-smoke.mp4 --quality high` |
| [`examples/library-timeline`](examples/library-timeline/README.zh.md) | 按时间线展示多库能力：GSAP/SplitType、D3/math、THREE/postprocessing、Matter/simplex/Iconify。 | `ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high` |
| [`examples/access-media`](examples/access-media/README.zh.md) | 本地 `access/` 资源：图片层、视频层、音频波形层，以及导出 MP4 中的 AAC 音轨。 | `ui2v render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high` |
| [`examples/runtime-storyboard`](examples/runtime-storyboard/README.zh.md) | runtime-core 分镜：segments、转场、分段依赖、相机 metadata 和 inspect-runtime。 | `ui2v render examples/runtime-storyboard/animation.json -o .tmp/examples/runtime-storyboard.mp4 --quality high` |

## 快速开始

安装 CLI：

```bash
npm install -g @ui2v/cli
ui2v doctor
```

渲染一个多库展示示例：

```bash
ui2v validate examples/library-timeline/animation.json --verbose
ui2v preview examples/library-timeline/animation.json --pixel-ratio 2
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

不全局安装也可以使用：

```bash
npx @ui2v/cli render examples/library-timeline/animation.json -o library-timeline.mp4 --quality high
```

使用本地 workspace 构建：

```bash
bun install
bun run build
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

## Preview Studio

`ui2v preview` 会打开本地 Studio 页面，支持项目列表、播放控制、逐帧拖动、播放速度、适配/剧场/全屏模式、runtime debug overlay、当前帧 PNG 截图、复制 CLI 渲染命令，以及把当前项目导出 MP4 到 `.tmp/examples`。

## README 素材流程

先渲染高质量 MP4，再导出适合 GitHub README 的 GIF/JPG 预览：

```bash
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high

ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/library-timeline.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/library-timeline.gif

ffmpeg -y -ss 1 -i .tmp/examples/library-timeline.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/library-timeline.jpg
```

建议 README 里使用 4-6 秒、体积较小的 GIF/JPG。完整 MP4 更适合放到 `.tmp/examples`、release assets、GitHub issue 附件或 CDN。

## 用 AI 生成新项目

ui2v 项目本质上是 JSON，非常适合让 AI 起草，然后用 CLI 验证和渲染。好的提示词应该包含画幅、时长、分辨率、视觉风格、分镜、依赖库、资源目录和输出路径。

```text
Create a ui2v animation JSON with four visible library beats on the timeline:
GSAP/SplitType typography, D3/math data, THREE/postprocessing depth, and
Matter/simplex/Iconify interaction. Each beat must have its own layer or segment,
dependencies, visible proof, and render command.
```

## 本地资源

把用户提供的照片、视频和音乐放在 `animation.json` 旁边的 `access/` 目录里：

```text
my-video/
  animation.json
  access/
    photo.png
    clip.mp4
    music.wav
```

使用 `image-layer` 插入照片，使用 `video-layer` 插入视频，使用 `audio-layer` 显示音频波形，使用根级 `audio.tracks` 把音乐 mux 进导出的 MP4。支持的音频控制包括 `volume`、`loop`、`duration`、`trimStart`、`trimEnd`、`fadeIn` 和 `fadeOut`。

## 常用命令

```bash
ui2v doctor
ui2v validate animation.json --verbose
ui2v preview animation.json --pixel-ratio 2
ui2v inspect-runtime animation.json
ui2v render animation.json -o output.mp4 --quality high
```

常用渲染参数：

```bash
ui2v render animation.json -o output.mp4 --width 1920 --height 1080
ui2v render animation.json -o output.mp4 --quality ultra --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300 --no-headless
```

## 包结构

```text
ui2v                 安装 ui2v 命令的短包名
@ui2v/cli            命令行接口
@ui2v/core           类型、解析、校验和共享工具
@ui2v/runtime-core   场景图、时间线、帧计划、适配器和命令
@ui2v/engine         浏览器 Canvas 渲染器和 WebCodecs 导出
@ui2v/producer       通过 puppeteer-core 驱动本机浏览器完成预览和 MP4 渲染
```

## 环境要求

- Node.js 18 或更新版本
- 本地 workspace 开发需要 Bun 1.0 或更新版本
- 本机已安装 Chrome、Edge 或 Chromium

主渲染路径不需要 Electron、FFmpeg 或 `node-canvas`。如果自动检测浏览器失败，可以手动指定：

```powershell
$env:PUPPETEER_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; ui2v doctor
```

## 文档

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Examples](examples/README.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [Renderer Notes](docs/renderer-notes.md)
- [Roadmap](docs/roadmap.md)
- [CLI Reference](packages/cli/README.md)

## 开发

```bash
bun run build
bun run test
```

## 许可

MIT
