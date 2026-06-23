/**
 * CDN import map for browser-side animation libraries.
 *
 * Runtime loads these through Puppeteer's import map; they are not required as
 * npm dependencies for CLI consumers.
 */
export const BROWSER_LIBRARY_IMPORT_MAP: Record<string, string> = {
  '@iconify/iconify': 'https://esm.sh/@iconify/iconify@3.1.1',
  '@iconify/utils': 'https://esm.sh/@iconify/utils@3.1.3',
  '@iconify-json/mdi/icons.json': 'https://esm.sh/@iconify-json/mdi@1.2.3/icons.json',
  '@tsparticles/engine': 'https://esm.sh/@tsparticles/engine@3.9.1',
  '@tweenjs/tween.js': 'https://esm.sh/@tweenjs/tween.js@25.0.0',
  animejs: 'https://esm.sh/animejs@4.2.2',
  'cannon-es': 'https://esm.sh/cannon-es@0.20.0',
  d3: 'https://esm.sh/d3@7.9.0',
  fabric: 'https://esm.sh/fabric@6.9.1',
  gsap: 'https://esm.sh/gsap@3.14.2',
  'iconify-icon': 'https://esm.sh/iconify-icon@3.0.2',
  katex: 'https://esm.sh/katex@0.16.21',
  konva: 'https://esm.sh/konva@9.3.22',
  'lottie-web': 'https://esm.sh/lottie-web@5.13.0',
  'matter-js': 'https://esm.sh/matter-js@0.20.0',
  mathjs: 'https://esm.sh/mathjs@14.9.1',
  mediabunny: 'https://esm.sh/mediabunny@1.25.1',
  'opentype.js': 'https://esm.sh/opentype.js@1.3.4',
  p5: 'https://esm.sh/p5@1.11.11',
  paper: 'https://esm.sh/paper@0.12.18',
  'pixi.js': 'https://esm.sh/pixi.js@8.15.0',
  postprocessing: 'https://esm.sh/postprocessing@6.38.2',
  roughjs: 'https://esm.sh/roughjs@4.6.6',
  'simplex-noise': 'https://esm.sh/simplex-noise@4.0.3',
  'split-type': 'https://esm.sh/split-type@0.3.4',
  three: 'https://esm.sh/three@0.182.0',
  tsparticles: 'https://esm.sh/tsparticles@3.9.1',
};
