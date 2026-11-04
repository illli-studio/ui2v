# 发布必须上传动画封面

每次发布必须上传该动画的真实截图或设计封面，没有图片就不能发布，不使用通用占位封面。
`motion publish`、`skill publish`、旧 `publish` 别名和 `sync` 使用相同流程。

1. 优先使用 `--cover assets/thumbnail.png` 指定的图片（相对动画目录）。
2. 否则读取 manifest 的 `thumbnail` 本地路径，或根目录的 `thumbnail` / `cover` 图片。
3. 没有图片就启动本机浏览器，截取 `min(3, duration / 2)` 秒的一帧并上传。

图片压缩为最长边 640px 的 WebP，最多 512000 字节。生成的上传文件名为
`ui2v-cover.webp`，请勿把它作为源文件名。无需导出视频，也无需常驻服务。

```bash
ui2v motion publish ./my-motion --version 1.0.0
ui2v motion publish ./my-motion --version 1.0.1 --cover assets/thumbnail.png
ui2v motion publish ./my-motion --version 1.0.2 --cover-time 1.5
ui2v motion publish ./my-motion --version 1.0.3 --refresh-cover
```

截图保存在动画目录的 `.ui2v/cover.png` 中，以包内文件内容和截图时间为缓存键。
包未改动就复用；HTML、脚本、图片、字体或 manifest 改动后自动重截。
仅修改发布版本号不会重截。远程资源改动需手动 `--refresh-cover`。
生成的封面不参与 `sync` 内容指纹，避免重复上传未改动的动画。

本机已有 Chrome、Edge 或 Chromium 就可以截图。可用环境变量
`UI2V_COVER_BROWSER` 指定浏览器路径。Linux CI 首次安装浏览器：

```bash
npx playwright@1.64.1 install --with-deps chromium
```

指定现有图片时不需要浏览器。截图失败会停止发布并提示修复动画或使用 `--cover`。
不提供跳过封面的选项。

## API

使用普通用户 API token 向 `/api/v1/motions` 发 POST，无需管理员密钥。
multipart 请求在 `files` 中附上图片，并在 `payload` JSON 加入：

```json
{ "thumbnailPath": "assets/thumbnail.png" }
```

这里是发布 payload 的新增必填信息；slug、displayName、version 等既有字段仍需提供。
JSON 上传方式同样支持：先按现有流程上传文件，再把图片描述符加入 `files[]`，
`thumbnailPath` 必须与其中的路径一致。

后端校验图片签名、类型和大小，然后把持久存储 URL 设为首页封面。
字段指向的图片必须恰好存在于本次上传文件中，不能使用外部 URL。
旧客户端必须升级，或自行携带图片和 `thumbnailPath`；省略封面会被拒绝。
网页上传同样要求选择封面图片。浏览器仅在发布机器上短暂运行，
Vercel 请求中不运行截图任务。

English reference: [publish skill](../skills/ui2v/references/publish.md).
