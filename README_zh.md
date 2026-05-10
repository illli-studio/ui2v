# ui2v

[English](README.md)

<p align="center">
  <img src="assets/brand/ui2v-logo-readme-official-banner.jpg" alt="ui2v logo" width="760">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ui2v/cli"><img alt="npm version" src="https://img.shields.io/npm/v/@ui2v/cli?color=00d4ff"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-f2aa4c"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-7bd88f">
  <img alt="browser" src="https://img.shields.io/badge/render-Chrome%20%7C%20Edge%20%7C%20Chromium-48c7ff">
</p>

ui2v 可以把结构化动画 JSON 渲染成浏览器生成的 MP4 视频。它适合做可复现的动效项目：产品发布短片、AI 生成说明片、数据故事、UI 演示、本地媒体合成，以及可以放进 Git 反复生成的视觉实验。

核心流程很直接：用 JSON 描述画面和时间线，在本地浏览器 Studio 里预览，再通过 Chrome/Edge 自动化、Canvas、WebCodecs 和 Node.js 导出同一条时间线的 MP4。

## 先看效果

仓库内置了轻量 GIF，打开 README 就能直接看到输出风格。

| 产品开场 | Studio 工作流 |
| --- | --- |
| ![AI launch showcase](assets/showcase/hero-ai-launch.gif) | ![One minute studio showcase](assets/showcase/one-minute-studio.gif) |
| 产品发布、标题节拍、品牌视觉和主画面构图。 | 本地预览、拖动时间线、检查项目并导出 MP4。 |

| 产品/媒体合成 | 渲染实验室 |
| --- | --- |
| ![Product showcase](assets/showcase/product-showcase.gif) | ![Render lab showcase](assets/showcase/render-lab.gif) |
| 图片、视频、音频、波形和品牌版式组合。 | 可重复的渲染检查、runtime 帧和导出流程。 |

## 能渲染什么

ui2v 是 JSON-first，但不是静态配置玩具。项目可以组合：

- Canvas 绘制和 custom-code 图层
- `image-layer`、`video-layer`、`audio-layer`、本地 `access/` 资源和导出 MP4 里的 AAC 音轨
- Runtime Core 分段时间线：`timeline.segments[]`、转场、相机 metadata、markers 和可检查的 frame plan
- 浏览器/npm 动画库：`gsap`、`animejs`、`d3`、`mathjs`、`three`、`postprocessing`、`matter-js`、`cannon-es`、`pixi.js`、`p5`、`tsParticles`、`lottie-web`、`fabric`、`konva`、`paper`、`roughjs`、`katex`、`iconify`、`opentype.js` 等

维护中的示例都要求“库真的改变画面”。只写在依赖里、但没有可见效果的库，不算真正用到了。

## 快速开始

安装并检查 CLI：

```bash
npm install -g @ui2v/cli
ui2v doctor
```

预览并渲染一个真实项目：

```bash
ui2v validate examples/access-media/animation.json --verbose
ui2v preview examples/access-media/animation.json --pixel-ratio 2
ui2v render examples/access-media/animation.json -o .tmp/examples/access-media.mp4 --quality high
```

不全局安装也可以：

```bash
npx @ui2v/cli@latest render examples/library-timeline/animation.json -o library-timeline.mp4 --quality high
```

使用本地 workspace 构建：

```bash
bun install
bun run build
node packages/cli/dist/cli.js preview examples/access-media/animation.json --pixel-ratio 1
```

## 维护示例

`examples/` 是理解 ui2v 能力最快的入口。这些示例既是生成参考，也是发布烟测目标。

| 示例 | 主要效果 | 真实 API |
| --- | --- | --- |
| [`basic-smoke`](examples/basic-smoke/README.zh.md) | 精致 Canvas 开场，最小端到端烟测。 | Canvas 2D、渐变、文字、时间线 |
| [`access-media`](examples/access-media/README.zh.md) | 本地媒体工作台：图片、视频、波形和音轨。 | `image-layer`、`video-layer`、`audio-layer`、`audio.tracks` |
| [`library-timeline`](examples/library-timeline/README.zh.md) | 多库时间线，每段都有可见效果。 | GSAP/SplitType、D3/math、THREE/postprocessing、Matter/simplex/Iconify |
| [`runtime-storyboard`](examples/runtime-storyboard/README.zh.md) | Runtime Core 分镜故事板。 | runtime graph、转场、相机 metadata、inspect-runtime |
| [`pixi-signal`](examples/pixi-signal/README.zh.md) | 救援雷达：粒子、光束、扫描环和信号节点。 | PixiJS Graphics 和 containers |
| [`paper-route`](examples/paper-route/README.zh.md) | 平滑矢量路线和路径移动。 | Paper.js paths、symbols、smoothing |
| [`konva-launch-board`](examples/konva-launch-board/README.zh.md) | 由场景对象搭建的产品发布板。 | Konva Stage、Layer、Group、Rect、Text、Circle |
| [`anime-motion-rig`](examples/anime-motion-rig/README.zh.md) | 由时间线状态驱动的运动 rig。 | anime.js timeline/animate APIs |
| [`tween-control-room`](examples/tween-control-room/README.zh.md) | repeat/yoyo/easing 驱动的仪表盘。 | `@tweenjs/tween.js` Group 和 Tween |
| [`particles-aurora`](examples/particles-aurora/README.zh.md) | 实时粒子引擎合成的极光。 | tsParticles |
| [`lottie-status-pack`](examples/lottie-status-pack/README.zh.md) | 每帧 seek 的 Lottie 状态卡。 | lottie-web |
| [`p5-flow-garden`](examples/p5-flow-garden/README.zh.md) | 噪声路径、花瓣和动态光场。 | p5.js |
| [`fabric-poster-lab`](examples/fabric-poster-lab/README.zh.md) | 可编辑对象组成的动态海报。 | Fabric.js StaticCanvas、groups、gradients |
| [`cannon-cargo-drop`](examples/cannon-cargo-drop/README.zh.md) | 刚体物理驱动的仓库货箱下落。 | cannon-es |
| [`type-systems-map`](examples/type-systems-map/README.zh.md) | 技术字体/公式信息图。 | KaTeX、Iconify、opentype.js |

完整索引见 [examples/README.zh.md](examples/README.zh.md)。

## Preview Studio

`ui2v preview` 启动的是一个本地浏览器工作台，不是静态文件查看器。它包含：

- 当前 workspace 的项目搜索列表
- 按正确比例响应式填满舞台的预览画布
- 播放/暂停、时间线拖动、当前时间、全屏和导出按钮
- 选中 JSON 变化后的 live reload
- runtime-core 渲染路径，template 和 runtime 项目使用同一个预览表面
- 浏览器保存/下载流程导出 MP4

```bash
ui2v preview examples/access-media/animation.json --pixel-ratio 1
```

## Runtime Core

时间线较复杂的视频可以使用 runtime 项目和分段故事板：

```json
{
  "schema": "uiv-runtime",
  "timeline": {
    "segments": [
      {
        "id": "hook",
        "startTime": 0,
        "endTime": 2,
        "label": "Hook",
        "dependencies": ["gsap"]
      }
    ]
  }
}
```

检查标准化场景图和采样帧：

```bash
ui2v inspect-runtime examples/runtime-storyboard/animation.json --time 1 --time 4 --json
```

## 本地媒体流程

把用户提供的文件放在 `animation.json` 旁边：

```text
my-video/
  animation.json
  access/
    product.png
    clip.webm
    clip-poster.jpg
    music.wav
```

用 `image-layer` 插入图片，用 `video-layer` 插入视频，用根级 `audio.tracks` 把声音 mux 进导出的 MP4。视频建议使用浏览器能稳定解码的 H.264 MP4 或 VP9 WebM，并尽量提供 `posterSrc`。

## README 素材流程

先渲染 MP4，再生成适合 README 的轻量素材：

```bash
ui2v render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high

ffmpeg -y -ss 0 -t 4.5 -i .tmp/examples/library-timeline.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 assets/showcase/library-timeline.gif

ffmpeg -y -ss 1 -i .tmp/examples/library-timeline.mp4 \
  -frames:v 1 -vf "scale=1280:-1:flags=lanczos" -update 1 -q:v 3 \
  assets/showcase/library-timeline.jpg
```

GitHub README 建议使用 4-6 秒、3 MB 以下的 GIF。完整 MP4 更适合放在 `.tmp/examples`、release assets、issue 附件或 CDN。

## AI 生成提示词结构

好的 ui2v 提示词应该明确故事、时间、库、素材和输出：

```text
Create a ui2v animation JSON with four visible timeline beats:
1. GSAP/SplitType typography hook
2. D3/math data reveal
3. THREE/postprocessing depth shot
4. Matter/simplex/Iconify interaction

Each beat must have its own layer or segment, dependency list, visible proof,
and a render command.
```

仓库内置的 Codex skill 位于 [skills/ui2v/SKILL.md](skills/ui2v/SKILL.md)：

```bash
npx skills add illli-studio/ui2v --skill ui2v
```

## CLI 速查

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
@ui2v/core           项目解析、校验、类型和共享工具
@ui2v/runtime-core   场景图、时间线、帧计划、适配器和命令流
@ui2v/engine         Canvas 渲染器、custom-code runtime、媒体层、WebCodecs 导出
@ui2v/producer       本机浏览器预览服务和 MP4 渲染管线
```

## 环境要求

- Node.js 18 或更新版本
- workspace 开发需要 Bun 1.0 或更新版本
- 本机安装 Chrome、Edge 或 Chromium

ui2v 使用 `puppeteer-core`，不会下载内置浏览器。如果自动检测失败，可以手动指定：

```powershell
$env:PUPPETEER_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; ui2v doctor
```

## 文档

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Examples](examples/README.zh.md)
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

## 许可证

MIT
