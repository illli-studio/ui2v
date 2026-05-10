# Anime Motion Rig

一个以 `anime.js` 为主角的运动绑定例子。它使用注入进来的 anime.js v4 timeline/animation API 更新 orbit、spread、glow、tilt、scale 状态，再由 canvas 绘制最终画面。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/anime-motion-rig/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/anime-motion-rig/animation.json -o .tmp/examples/anime-motion-rig.mp4 --quality high
```

