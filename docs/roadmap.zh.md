# 路线图

[English](roadmap.md)

这份路线图描述当前仓库里的开源渲染栈，不承诺完整桌面应用。

## 已完成

- Bun workspace monorepo。
- `@ui2v/core` 解析器、校验器和共享项目类型。
- `@ui2v/runtime-core` 场景图、时间线、帧计划、依赖元数据、适配器路由和绘制命令。
- `@ui2v/engine` 浏览器渲染器，支持 template canvas、custom-code 图层和 WebCodecs 导出。
- `@ui2v/producer` 基于 Puppeteer 的预览和 MP4 渲染管线。
- `@ui2v/cli` 命令：`doctor`、`init`、`validate`、`preview`、`render`、
  `inspect-runtime` 和 `info`。
- workspace 构建和示例渲染 smoke test。

## 近期目标

- 改进浏览器依赖诊断。
- 为已安装 Chrome 或 Edge 的环境提供更清晰的安装指引。
- 将生成产物统一放到 `.tmp/`。
- 扩展 runtime JSON 和 custom-code 入口形式的示例覆盖。

## 渲染可靠性

- 为浏览器端 ESM 依赖增加离线/vendor 模式。
- 将浏览器到 Node 的 base64 传输替换为流式或分块输出。
- 针对更多项目结构增加 fixture 渲染测试。
- 在 smoke test 中探测生成 MP4 的元数据。

## 功能扩展

- 在浏览器支持和 muxing 足够可靠时支持 WebM 输出。
- 批量渲染。
- 音频混合。
- 模板库。
- 插件系统。
- 更多适配器后端：Three.js、Pixi、Lottie、DOM 和 headless 渲染。

## 生态

- 文档站。
- 在线 playground。
- 社区模板。
- VS Code 扩展。
- 分布式或云渲染集成。
