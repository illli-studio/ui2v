# Basic Text 示例

[English](README.md)

一个最小 ui2v 动画项目，通过简单的 custom-code 图层渲染文字。可以用它验证
当前环境中的校验、预览和 MP4 渲染是否正常。

## 文件

- `animation.json`：2 秒、640x360、30fps 动画

## 使用

在当前目录运行：

```bash
ui2v validate animation.json --verbose
ui2v preview animation.json
ui2v render animation.json -o output.mp4
```

在仓库根目录使用本地构建运行：

```bash
node packages/cli/dist/cli.js validate examples/basic-text/animation.json --verbose
node packages/cli/dist/cli.js render examples/basic-text/animation.json -o .tmp/basic-text.mp4
```
