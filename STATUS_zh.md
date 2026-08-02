# ui2v 状态

## 当前

本仓库已切换为 **UI2V 注册表 CLI**（从旧桌面 JSON 工具链迁出）。

- 现行包：`packages/ui2v`（npm `@ui2v/cli`）
- 现行 skill：`skills/ui2v`
- 已删除：`@ui2v/cli` / `core` / `engine` / `producer` / `runtime-core`

创作 / 预览 / 渲染请用 **HyperFrames**。

## 验证

```bash
bun install
bun run build
bun run ui2v --cli-version
bun run ui2v upgrade --help
bun run test
```
