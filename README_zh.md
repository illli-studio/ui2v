<p align="center">
  <img src="./ui2v-logo.svg" alt="UI2V" width="112" />
</p>

<h1 align="center">UI2V</h1>

<p align="center">
  像发布 package 一样发布 motion，像安装 dependency 一样安装 animation。
</p>

<p align="center">
  <a href="https://ui2v.com">ui2v.com</a>
  ·
  <a href="./docs/quick-start.zh.md">快速开始</a>
  ·
  <a href="./docs/getting-started.zh.md">入门指南</a>
  ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/node-%3E%3D20-111827?labelColor=0f172a" />
  <img alt="npm package" src="https://img.shields.io/badge/npm-%40ui2v%2Fcli-111827?labelColor=0f172a" />
  <img alt="license MIT" src="https://img.shields.io/badge/license-MIT-111827?labelColor=0f172a" />
</p>

---

很多 motion work 最后都困在文件夹、demo 和一次性导出里。UI2V 给它一个真正的
家：可以搜索、安装、发布，并且能通过命令行维护。

它刻意只做一件事。HyperFrames 负责 composition 创作、预览和渲染；UI2V 负责
完成后的 motion package 注册表工作流。

```bash
npm install -g @ui2v/cli@latest
ui2v search "logo sting"       # discover a reusable motion
ui2v install <slug>            # pull it into your workspace
ui2v motion publish ./motion --version 1.0.0
```

## 为什么需要 UI2V

UI2V 是 HyperFrames composition package 的公共注册表客户端。你可以用它在
[ui2v.com](https://ui2v.com) 上搜索、安装、发布、更新和同步可复用的 motion
package。

```text
HyperFrames authoring
  -> package folder
  -> ui2v login
  -> ui2v motion publish
  -> ui2v.com
```

目标是让 motion component 像 UI component 一样可复用：有名称、有版本、有文档，
也能被轻松拉进 workspace。

## 为分发而生

| 面向谁 | 价值 |
| --- | --- |
| Motion designers | 把打磨好的 HyperFrames composition 打包，而不是交付一堆散文件。 |
| Frontend teams | 像安装 UI building blocks 一样安装可复用 motion。 |
| Design systems | 让 animation pattern 也拥有名称、版本和文档。 |
| Agents | 给 Codex 和其他工具一个稳定的 motion package 发布/安装工作流。 |

## 推广点

UI2V 把 motion 变成团队真的能流通的东西：

- 一个可被发现的 registry page
- 一条可以复制的 install command
- 一个 versioned publish workflow
- 一个 agent 可以检查的 package format
- 一个清晰的 creation / distribution 边界

## 工作闭环

| 阶段 | 做什么 | 命令 |
| --- | --- | --- |
| Discover | 找到值得复用的 motion package | `ui2v search`, `ui2v explore` |
| Install | 拉取 package 到本地 workspace | `ui2v install`, `ui2v update` |
| Publish | 发布 HyperFrames package | `ui2v motion publish` |
| Maintain | 让本地和 registry 状态保持一致 | `ui2v sync`, `ui2v inspect` |

## Before / After

| 没有 UI2V | 使用 UI2V |
| --- | --- |
| Motion 困在零散文件夹里 | Motion 有 registry page |
| 分享靠传文件 | 分享靠一条 install command |
| 更新方式模糊 | 发布有明确版本 |
| Agent 只能猜项目结构 | Agent 可以检查 `registry-item.json` 和入口 HTML |

## 发布第一个 Motion

```bash
ui2v login
ui2v motion publish ./my-motion --version 1.0.0
npx @ui2v/cli@latest install <slug>
```

最小 package：

```text
my-motion/
├── registry-item.json
├── index.html
└── assets/
```

## 安装

安装带作用域的 npm 包。binary 是 `ui2v`。

```bash
npm install -g @ui2v/cli@latest
ui2v --cli-version
ui2v --help
```

也可以不全局安装：

```bash
npx @ui2v/cli@latest search "logo sting"
npx @ui2v/cli@latest install <slug>
```

## 常用命令

```bash
ui2v login
ui2v search "lower third"
ui2v install <slug>
ui2v list
ui2v update --all
ui2v inspect <slug>
ui2v motion publish ./my-motion --version 1.0.0
ui2v sync --dry-run
ui2v upgrade
```

## 产品边界

| UI2V 负责 | HyperFrames 负责 |
| --- | --- |
| Registry search and discovery | Composition authoring |
| Package install and updates | Preview and playback |
| Publish and sync workflows | Rendering and export |
| CLI auth and ownership flows | Timeline and animation logic |

## Motion Package 结构

可发布的 motion 是一个 HyperFrames package 文件夹，包含 registry metadata 和
入口 composition HTML。

```text
my-motion/
├── registry-item.json   # type: "hyperframes:block"
├── index.html           # entry composition
└── assets/              # optional media and support files
```

版本号在发布时通过 `--version` 传入，不写在 `registry-item.json` 里。

Agent-facing checklist 和 schema 期望见
[package-format.md](./skills/ui2v/references/package-format.md)。

## 本地开发

```bash
bun install
bun run build
bun run test
node packages/ui2v/bin/ui2v.js --help
```

发布前验证：

```bash
bun run --filter "@ui2v/cli" verify
```

## 仓库结构

```text
packages/ui2v/   active CLI package, npm @ui2v/cli, bin ui2v
skills/ui2v/     Codex skill for registry install and publish workflows
docs/            product, package, and migration documentation
```

## 旧 Renderer 工具链

本仓库以前通过 `@ui2v/cli@1.x`、`@ui2v/core`、`@ui2v/engine` 和
`@ui2v/producer` 提供 JSON-to-MP4 工具链。那套已经从当前产品方向中移除。
请把旧 JSON 项目重建为 HyperFrames package，再用当前 `ui2v` 注册表 CLI 发布。

迁移说明见 [旧 JSON 工具链](./docs/legacy-json-toolchain.zh.md)。
兼容命名说明见 [命名迁移](./docs/naming-migration.zh.md)。
高级 `ui2v package` 命令见 [兼容 Package Registry](./docs/package-registry.zh.md)。

## License

MIT
