import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  shims: true,
  clean: true,
  external: [
    'canvas',
    'puppeteer-core',
    '@ui2v/core',
    '@ui2v/engine',
    '@ui2v/producer',
    '@ui2v/runtime-core',
  ],
  noExternal: [],
});

