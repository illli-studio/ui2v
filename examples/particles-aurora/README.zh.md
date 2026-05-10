# tsParticles Aurora

一个粒子极光场景，会真实初始化 `tsParticles` engine，调用 `load()` 创建粒子画布，然后把该画布合成回 ui2v。

## 预览

```bash
node packages/cli/dist/cli.js preview examples/particles-aurora/animation.json --pixel-ratio 1
```

## 渲染

```bash
node packages/cli/dist/cli.js render examples/particles-aurora/animation.json -o .tmp/examples/particles-aurora.mp4 --quality high
```

