# @ui2v/core

[Chinese](README.zh.md)

Core project types, JSON parsing, validation, and shared helpers for ui2v.

## Install

```bash
npm install @ui2v/core
```

## Usage

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

## Responsibilities

- Parse ui2v animation JSON.
- Validate common project structure issues.
- Provide shared TypeScript types.
- Resolve dimensions and frame counts from project metadata.

Rendering is handled by `@ui2v/engine` and `@ui2v/producer`.

## License

MIT
