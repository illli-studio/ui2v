# ui2v

用于渲染 ui2v 动画 JSON 项目的独立命令行工具和运行时包。

ui2v 会读取结构化动画项目文件，在本地浏览器中预览，并通过基于
Canvas 和 WebCodecs 的浏览器渲染管线导出 MP4。当前这个开源仓库聚焦
于渲染器、运行时模型、CLI、包 API、文档和示例；它不是旧版宣传文案
中描述的完整桌面应用源码。

## 这个仓库包含什么

- 基于 Bun workspace 的 TypeScript monorepo。
- 用于校验、预览、检查和渲染项目的 `ui2v` CLI。
- 不依赖 DOM 的 Runtime Core，用于场景图、时间线、帧采样、渲染计划、
  依赖计划和适配器契约。
- 浏览器优先的 Canvas 渲染引擎，支持 template 和 custom-code 图层。
- 基于 Puppeteer 的 producer：启动 Chrome、Edge 或 Chromium，在真实
  浏览器里渲染帧，用 WebCodecs 编码 MP4，并由 Node.js 写入输出文件。
- 用于 smoke test 和实验的 `animation.json` 示例项目。

主渲染路径不需要 Electron、FFmpeg 或 `node-canvas`。

## 环境要求

- Node.js 18 或更高版本
- 本地开发需要 Bun 1.0 或更高版本
- Chrome、Edge、Chromium，或 Puppeteer 自带的 Chromium

如果没有找到浏览器，可以安装 Chrome 或 Edge，设置
`PUPPETEER_EXECUTABLE_PATH`，或者安装 Puppeteer 浏览器：

```bash
npx puppeteer browsers install chrome
```

## 安装

安装已发布的 CLI：

```bash
npm install -g @ui2v/cli
ui2v --version
```

不全局安装也可以运行：

```bash
npx @ui2v/cli --version
```

从当前仓库构建：

```bash
bun install
bun run build
```

## 快速开始

检查本地渲染环境：

```bash
ui2v doctor
```

创建一个起步项目：

```bash
ui2v init my-video
```

校验示例：

```bash
ui2v validate examples/basic-text/animation.json --verbose
```

在浏览器中预览动画：

```bash
ui2v preview examples/basic-text/animation.json
```

渲染 MP4：

```bash
ui2v render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

如果使用本地构建产物，可以直接运行：

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## CLI 命令

```bash
ui2v doctor
ui2v init [name]
ui2v validate <input.json>
ui2v preview <input.json>
ui2v render <input.json> -o output.mp4
ui2v inspect-runtime <input.json>
ui2v info
```

常用渲染参数：

```bash
ui2v render animation.json -o output.mp4 --quality high --fps 60
ui2v render animation.json -o output.mp4 --width 1280 --height 720 --render-scale 2
ui2v render animation.json -o output.mp4 --codec avc --bitrate 8000000
ui2v render animation.json -o output.mp4 --timeout 300
```

`--render-scale` 会先用更高分辨率渲染，再缩放到目标尺寸编码。例如
`--width 1280 --height 720 --render-scale 2` 会先以 2560x1440 渲染，
再输出 1280x720 视频，从而得到更干净的边缘和文字。

预览默认使用 2x canvas pixel ratio。可以用 `--pixel-ratio 1` 降低 GPU
开销，也可以提高到 `--pixel-ratio 4` 检查细节。

## 项目格式

主要输入是 `AnimationProject` JSON 文件：

```json
{
  "id": "basic-text",
  "mode": "template",
  "duration": 2,
  "fps": 30,
  "resolution": { "width": 640, "height": 360 },
  "template": {
    "layers": [
      {
        "id": "text-layer",
        "type": "custom-code",
        "startTime": 0,
        "endTime": 2,
        "properties": {
          "code": "function createRenderer() { return { render(t, context) { /* draw */ } }; }"
        }
      }
    ]
  }
}
```

完整示例可以看：

- `examples/basic-text/animation.json`
- `examples/product-showcase/animation.json`
- `examples/kitchen-sink/animation.json`
- `examples/runtime-core/*.json`

## 包结构

```text
@ui2v/core          类型、解析器、校验器和共享工具
@ui2v/runtime-core  场景图、时间线、调度器、帧计划和适配器契约
@ui2v/engine        浏览器 Canvas 渲染和 WebCodecs 导出支持
@ui2v/producer      基于 Puppeteer 的预览和 MP4 渲染管线
@ui2v/cli           安装为 ui2v 的命令行入口
```

## 渲染流程

```text
JSON project
  -> CLI 解析并校验输入
  -> producer 启动本地静态服务器
  -> Puppeteer 启动 Chrome、Edge 或 Chromium
  -> 浏览器加载 engine/runtime/core bundle
  -> runtime 从共享时间线计算帧状态
  -> engine 将帧渲染到 Canvas
  -> WebCodecs 在浏览器中编码 MP4
  -> producer 将视频文件写入磁盘
```

## 开发

安装依赖并构建全部包：

```bash
bun install
bun run build
```

运行完整测试：

```bash
bun run test
```

运行部分检查：

```bash
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
```

## 当前限制

- MP4 是主要生产输出格式。
- 默认编码器是 AVC/H.264。只有本地浏览器支持时，才可以通过
  `--codec hevc` 请求 HEVC。
- 浏览器端 ESM 依赖目前通过 producer import map 中固定的 CDN URL 加载。
- 长视频或高分辨率视频目前会先把编码结果以 base64 从浏览器传回 Node，
  然后再写入磁盘；实现简单，但对内存不够友好。
- 离线依赖 vendoring、流式输出、更多格式和更多渲染适配器仍是后续工作。

## 文档

- [Quick Start](docs/quick-start.md)
- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Runtime Core](docs/runtime-core.md)
- [CLI README](packages/cli/README.md)

## 许可证

MIT
