# ui2v

[English](README.md)

UI2V **HyperFrames 动效注册表 CLI** — 在 [ui2v.com](https://ui2v.com) 上搜索、安装、发布、同步 composition 包。

本仓库以前发布 `@ui2v/cli` + `@ui2v/core` + `@ui2v/engine` + `@ui2v/producer`（JSON → MP4）。那套已经**删除**。创作 / 预览 / 渲染请用 **HyperFrames**。这里只保留注册表客户端。

## 安装

```bash
bun install
bun run build
bun run ui2v --help
# 发布后也可：
npm install -g @ui2v/cli@latest
```

## 常用命令

```bash
bun run ui2v login
bun run ui2v search "logo sting"
bun run ui2v install <slug>
bun run ui2v motion publish ./my-motion --version 1.0.0
bun run ui2v upgrade
```

## 包格式

```text
my-motion/
├── registry-item.json   # type: hyperframes:block
├── index.html
└── assets/
```

详见 `skills/ui2v/references/package-format.md`。

## Agent skill

`skills/ui2v/` — 注册表与发布流程。视频创作请走 HyperFrames skills。

## 目录

- `packages/ui2v` — 现行 CLI（npm `@ui2v/cli`，命令 `ui2v`）
- `skills/ui2v` — agent skill
- `examples/` — 旧 JSON 示例（不能直接当 UI2V 发布包）

## License

MIT
