# Render Lab 旗舰示例

[English](README.md)

一个 1920x1080 的旗舰示例，用来展示 ui2v 的核心价值：结构化 JSON 驱动高
分辨率视频，包含粒子、数据可视化、伪 3D 深度、运行时管线图形和导出进度。

## 展示能力

- 1080p 生产级画布
- 多场景确定性时间线
- 由代码绘制的数据可视化
- 不依赖外部素材的粒子和深度效果
- preview / inspect / render 工作流表达

## 使用

在仓库根目录使用本地构建运行：

```bash
node packages/cli/dist/cli.js validate examples/render-lab/animation.json --verbose
node packages/cli/dist/cli.js preview examples/render-lab/animation.json
node packages/cli/dist/cli.js render examples/render-lab/animation.json -o .tmp/render-lab.mp4 --quality high
```
