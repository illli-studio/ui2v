# Fabric Poster Lab

一个由真实 `Fabric.js` 对象组成的动态海报板。画面使用 `StaticCanvas`、`Group`、`Rect`、`Circle`、`Text`、渐变、对象 transform 和 `renderAll()`。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/fabric-poster-lab/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/fabric-poster-lab/animation.json -o .tmp/examples/fabric-poster-lab.mp4 --quality high
```

