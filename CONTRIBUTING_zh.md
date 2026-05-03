# 贡献指南

[English](CONTRIBUTING.md)

感谢你帮助改进 ui2v。这个仓库聚焦于开源 CLI 渲染器、运行时包、示例和文档。

## 开发环境

要求：

- Node.js 18 或更高版本
- Bun 1.0 或更高版本
- Chrome、Edge、Chromium，或 Puppeteer 已安装的 Chromium

安装并构建：

```bash
bun install
bun run build
```

如果 Puppeteer 无法下载 Chromium，而你已经安装了 Chrome 或 Edge：

```bash
PUPPETEER_SKIP_DOWNLOAD=true bun install
```

## 常用检查

```bash
bun run build
bun run test:unit
bun run test:examples
bun run test:validate
bun run test:smoke
bun run test
```

CLI smoke check：

```bash
node packages/cli/dist/cli.js doctor
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js preview examples/basic-text/animation.json
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```

## 项目结构

```text
packages/core          JSON 解析、校验和共享类型
packages/runtime-core  场景图、时间线、帧计划和适配器契约
packages/engine        浏览器渲染器和导出器
packages/producer      Puppeteer/WebCodecs 预览和渲染管线
packages/cli           命令行入口
examples               smoke-test 动画 JSON 项目
docs                   文档
scripts                校验和 smoke-test 脚本
```

## 准则

- 保持 package 边界清晰。
- 优先使用 runtime-core 契约，而不是一次性渲染逻辑。
- 为 runtime、渲染和 CLI 变更添加聚焦测试。
- 行为变化时同步更新英文和中文文档。
- 生成产物放在 `.tmp/` 或已忽略的构建目录中。

## Commit Message

推荐使用 conventional commits：

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance`

## 许可证

贡献即表示你同意贡献内容以 MIT 许可证授权。
