# ui2v 状态

[English](STATUS.md)

## 当前状态

ui2v 是一个用于 ui2v 动画 JSON 文件的独立 CLI 渲染器。它通过 Puppeteer 启动
本地浏览器，使用 ui2v Canvas 引擎渲染，通过 WebCodecs 编码 MP4，并由
Node.js 写出结果。

主路径不需要 Electron、FFmpeg 或 `node-canvas`。

## 已完成

- Bun workspace monorepo。
- `@ui2v/core` 项目类型、解析器、校验器和工具。
- `@ui2v/runtime-core` 场景图、时间线、帧计划、依赖元数据、适配器路由和绘制命令。
- `@ui2v/engine` 浏览器渲染、template canvas adapter、custom-code renderer、
  canvas command executor 和 WebCodecs exporter。
- `@ui2v/producer` Puppeteer 预览和 MP4 渲染管线。
- `@ui2v/cli` 命令：`doctor`、`init`、`validate`、`preview`、`render`、
  `inspect-runtime` 和 `info`。
- 示例校验和 smoke-render 脚本。
- workspace package 的 MIT 许可证元数据。

## 本地验证

当前 workspace 已通过：

```bash
bun run build
```

更多检查可以运行：

```bash
bun run test
```

## 已知限制

- MP4 是主要生产输出格式。
- AVC/H.264 是默认编码器。只有本地浏览器支持时才可以请求 HEVC。
- 浏览器端 ESM 依赖目前通过固定 CDN URL 加载。
- 长视频或高分辨率渲染会先以 base64 从浏览器传回 Node，再写入磁盘。
- engine 包仍保留部分旧集成路径的兼容导出。

## 下一步优先级

1. 为浏览器依赖增加离线/vendor 模式。
2. 将浏览器到 Node 的 base64 传输替换为流式或分块输出。
3. 通过 `@ui2v/runtime-core` 保持预览、渲染和检查流程一致。
