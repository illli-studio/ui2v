# 贡献指南

[English](CONTRIBUTING.md)

感谢你帮助改进 ui2v。这个仓库关注开源 CLI 渲染器、runtime packages、示例、文档，以及帮助 AI agent 更好创建 ui2v 项目的本地 Codex skills。

## 开发环境

要求：

- Node.js 18 或更新版本
- Bun 1.0 或更新版本
- 本机已安装 Chrome、Edge 或 Chromium

安装并构建：

```bash
bun install
bun run build
node packages/cli/dist/cli.js doctor
```

ui2v 使用 `puppeteer-core`，安装依赖时不会下载内置 Chromium。如果浏览器自动检测失败，可以设置 `PUPPETEER_EXECUTABLE_PATH`、`CHROME_PATH`、`CHROMIUM_PATH` 或 `EDGE_PATH`。

## 常用检查

运行和 CI 一致的快速检查：

```bash
bun run test:ci
```

运行完整本地测试，包括渲染 smoke tests：

```bash
bun run test
```

专项检查：

```bash
bun run test:unit
bun run test:metadata
bun run test:surface
bun run test:pack
bun run test:examples
bun run test:validate
bun run test:inspect-runtime
```

CLI smoke checks：

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js validate examples/library-timeline/animation.json --verbose
node packages/cli/dist/cli.js preview examples/library-timeline/animation.json --pixel-ratio 2
node packages/cli/dist/cli.js render examples/library-timeline/animation.json -o .tmp/examples/library-timeline.mp4 --quality high
```

## 项目结构

```text
packages/core          JSON 解析、校验和共享类型
packages/runtime-core  场景图、时间线、帧计划和适配器契约
packages/engine        浏览器 Canvas 渲染、自定义代码和 WebCodecs 导出
packages/producer      puppeteer-core 预览/渲染管线和本机浏览器发现
packages/cli           命令行入口
examples               精选 demo、工具型示例和 runtime-core 项目
assets/showcase        提交到仓库的 README GIF/JPG 预览素材
docs                   文档
scripts                校验、smoke test 和示例刷新脚本
.agents/skills         面向 AI 辅助示例/渲染工作流的仓库本地 skills
```

## 示例准则

- 让示例保持少量、维护良好、可以直接运行。
- 保持 `basic-smoke`、`library-timeline`、`access-media` 和 `runtime-storyboard` 在 renderer 或 CLI 变化后仍然有效。
- 只有当新示例展示了明确不同的受支持工作流时，才添加新的 example。
- MP4 渲染到 `.tmp/examples`，仓库只提交 `assets/showcase` 下的轻量预览素材。
- README GIF 要短、清晰，最好控制在 3 MB 以下。

## 代码准则

- 保持 package 边界清晰。
- 优先使用 runtime-core 契约，而不是一次性渲染逻辑。
- 行为变化时，为 runtime、rendering、CLI、package metadata 和 examples 添加聚焦测试。
- 同步更新英文和中文文档。
- 不要提交 `.tmp/`、`out/`、完整 MP4 导出或构建输出目录。

## Commit Message

推荐使用 conventional commits：

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance`

## 许可

贡献即表示你同意贡献内容以 MIT 许可证授权。
