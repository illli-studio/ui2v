import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  // Exclude native modules and node-specific packages
  external: [
    'canvas',
    'fs',
    'path',
    'os',
    'html2canvas',
    'mediabunny',
    // Mark all animation libraries as external - they'll be loaded via CDN
    'gsap',
    'three',
    'd3',
    'animejs',
    'fabric',
    'pixi.js',
    'p5',
    'matter-js',
    'cannon-es',
    'lottie-web',
    'roughjs',
    'paper',
    'opentype.js',
    'simplex-noise',
    'split-type',
    'katex',
    'mathjs',
    '@tsparticles/engine',
    'tsparticles',
    'globe.gl',
    'konva',
    'postprocessing',
    '@tweenjs/tween.js',
    '@emotion/css'
  ],
  // Don't bundle node_modules - they'll be loaded via CDN
  noExternal: [],
});
