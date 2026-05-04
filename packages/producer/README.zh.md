# @ui2v/producer

[English](README.md)

基于本机系统浏览器的 ui2v 预览和 MP4 渲染管线。

`@ui2v/producer` 会启动本地静态服务器，通过 `puppeteer-core` 控制本机 Chrome、Edge 或 Chromium，加载已构建的 ui2v bundle，通过 Canvas 渲染每一帧，用 WebCodecs 编码 MP4，并由 Node.js 写出结果文件。

## 安装

```bash
npm install @ui2v/producer
```

## 环境要求

- Node.js 18 或更新版本
- 本机已安装的 Chrome、Edge 或 Chromium
- 浏览器支持 WebCodecs MP4 导出

安装依赖时不会下载内置浏览器。如果自动检测失败，可以设置 `PUPPETEER_EXECUTABLE_PATH`、`CHROME_PATH`、`CHROMIUM_PATH` 或 `EDGE_PATH`。

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

预览页包含左侧 JSON 项目库、时间线控制、播放速度、适配/剧场/全屏模式、debug overlay、PNG 快照导出、可复制 CLI 渲染命令和 Export MP4 按钮。快捷键：Space 播放/暂停，`f` 全屏，`t` 剧场模式，`d` debug。通过 CLI 启动时，导出文件会写入 `.tmp/examples`。


## 浏览器发现

```ts
import {
  checkBrowserEnvironment,
  findBrowserExecutable,
  resolveBrowserExecutable,
  resolveRequiredBrowserExecutable,
} from '@ui2v/producer';

console.log(resolveBrowserExecutable());
console.log(findBrowserExecutable());
console.log(resolveRequiredBrowserExecutable());
console.log(await checkBrowserEnvironment());
```

`checkFFmpeg` 仍作为旧调用方的兼容别名保留。新代码应使用 `checkBrowserEnvironment`。

## 许可

MIT
