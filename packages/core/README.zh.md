# @ui2v/core

[English](README.md)

ui2v 的核心项目类型、JSON 解析、校验和共享工具。

## 安装

```bash
npm install @ui2v/core
```

## 使用

```ts
import {
  parseProject,
  validateProjectStructure,
  getProjectDimensions,
  getTotalFrames,
} from '@ui2v/core';

const project = parseProject(jsonString);
const validation = validateProjectStructure(project);

if (!validation.valid) {
  console.error(validation.errors);
}

console.log(getProjectDimensions(project));
console.log(getTotalFrames(project));
```

## 职责

- 解析 ui2v 动画 JSON。
- 校验常见项目结构问题。
- 提供共享 TypeScript 类型。
- 根据项目元数据解析尺寸和帧数。

渲染由 `@ui2v/engine` 和 `@ui2v/producer` 负责。

## 许可证

MIT
