# Product Showcase 示例

[English](README.md)

一个更完整的 ui2v 产品展示动效示例。它展示了分层背景绘制、文字排版、产品
框架动画和 call-to-action 元素。

## 文件

- `animation.json`：产品展示动画项目

## 特性

- 渐变风格背景
- 产品和 logo 展示
- 定时标题与副标题动效
- Call-to-action 视觉元素
- custom-code Canvas 渲染

## 使用

在仓库根目录使用本地构建运行：

```bash
node packages/cli/dist/cli.js validate examples/product-showcase/animation.json --verbose
node packages/cli/dist/cli.js preview examples/product-showcase/animation.json
node packages/cli/dist/cli.js render examples/product-showcase/animation.json -o .tmp/product-showcase.mp4 --quality high
```
