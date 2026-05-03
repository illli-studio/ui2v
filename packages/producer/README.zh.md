# @ui2v/producer

[English](README.md)

基于 Puppeteer 的 ui2v 预览和 MP4 渲染管线。

`@ui2v/producer` 会启动本地静态服务器、启动浏览器、加载已构建的 ui2v
bundle，通过 Canvas 渲染帧，用 WebCodecs 编码 MP4，并由 Node.js 写出结果。

## 安装

```bash
npm install @ui2v/producer
```

## 环境要求

- Node.js 18 或更高版本
- Chrome、Edge、Chromium，或 Puppeteer 已安装的 Chromium
- 浏览器支持 WebCodecs MP4 导出

## 渲染到文件

```ts
import { readFile } from 'node:fs/promises';
import { parseProject } from '@ui2v/core';
import { renderToFile } from '@ui2v/producer';

const project = parseProject(await readFile('animation.json', 'utf8'));

const result = await renderToFile(project, 'output.mp4', {
  quality: 'high',
  codec: 'avc',
  onProgress(progress) {
    console.log(`${progress.phase}: ${Math.round(progress.progress)}%`);
  },
});

if (!result.success) {
  throw new Error(result.error);
}
```

## 预览

```ts
import { startPreview } from '@ui2v/producer';

const session = await startPreview(project, { headless: false });
console.log(session.url);
await session.close();
```

## 环境检查

```ts
import { checkBrowserEnvironment, findBrowserExecutable } from '@ui2v/producer';

console.log(findBrowserExecutable());
console.log(await checkBrowserEnvironment());
```

`checkFFmpeg` 仍作为旧调用方的兼容别名保留。新代码应使用
`checkBrowserEnvironment`。

## 许可证

MIT
