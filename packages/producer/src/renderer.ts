/**
 * Browser-backed renderer for the standalone CLI.
 *
 * The ui2v engine is browser-first: it depends on DOM, Canvas, WebCodecs, and
 * browser ESM loading. The producer owns that browser environment and returns a
 * real file to Node instead of asking the user to click a generated HTML page.
 */

import type { AnimationProject } from '@ui2v/engine';
export type { AnimationProject } from '@ui2v/engine';
import { getFrameCount } from '@ui2v/runtime-core';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as http from 'http';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer';

export type RenderQuality = 'low' | 'medium' | 'high' | 'ultra' | 'cinema';
export type RenderFormat = 'mp4' | 'webm' | 'png' | 'jpg';
export type RenderCodec = 'avc' | 'hevc' | 'vp9';

export interface RenderOptions {
  fps?: number;
  width?: number;
  height?: number;
  renderScale?: number;
  quality?: RenderQuality;
  format?: RenderFormat;
  codec?: RenderCodec;
  bitrate?: number;
  outputPath?: string;
  headless?: boolean;
  timeoutMs?: number;
  browserExecutablePath?: string;
  keepTemp?: boolean;
  onProgress?: (progress: RenderProgress) => void;
}

export interface RenderProgress {
  phase: 'setup' | 'rendering' | 'encoding' | 'finalizing' | 'complete';
  progress: number;
  currentFrame: number;
  totalFrames: number;
  fps?: number;
  estimatedTimeRemaining?: number;
  segmentId?: string;
  segmentLabel?: string;
  segmentFrameIndex?: number;
  segmentLocalTime?: number;
  segmentProgress?: number;
  message?: string;
}

export interface RenderResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number;
  duration: number;
  error?: string;
  diagnostics?: string[];
}

export interface PreviewOptions {
  fps?: number;
  width?: number;
  height?: number;
  pixelRatio?: number;
  headless?: boolean;
  timeoutMs?: number;
  browserExecutablePath?: string;
}

export interface PreviewSession {
  url: string;
  close: () => Promise<void>;
}

interface PageRenderSuccess {
  success: true;
  mimeType: string;
  base64?: string;
  streamed?: boolean;
  bytes?: number;
}

interface PageRenderFailure {
  success: false;
  error: string;
  stack?: string;
}

type PageRenderResult = PageRenderSuccess | PageRenderFailure;

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_DIAGNOSTICS = 25;

declare global {
  // eslint-disable-next-line no-var
  var __ui2vRender: (project: AnimationProject, options: ReturnType<typeof normalizePageOptions>) => Promise<PageRenderResult>;
  // eslint-disable-next-line no-var
  var __ui2vPreview: (project: AnimationProject, options: ReturnType<typeof normalizePreviewOptions>) => Promise<void>;
  // eslint-disable-next-line no-var
  var __ui2vWriteOutputChunk: ((chunkBase64: string) => Promise<void>) | undefined;
}

const IMPORT_MAP: Record<string, string> = {
  '@ui2v/core': '/core/index.mjs',
  '@ui2v/runtime-core': '/runtime-core/index.mjs',
  zod: 'https://esm.sh/zod@3.25.76',
  '@emotion/css': 'https://esm.sh/@emotion/css@11.13.5',
  '@tsparticles/engine': 'https://esm.sh/@tsparticles/engine@3.9.1',
  '@tweenjs/tween.js': 'https://esm.sh/@tweenjs/tween.js@25.0.0',
  animejs: 'https://esm.sh/animejs@4.2.2',
  'cannon-es': 'https://esm.sh/cannon-es@0.20.0',
  d3: 'https://esm.sh/d3@7.9.0',
  fabric: 'https://esm.sh/fabric@6.9.1',
  'globe.gl': 'https://esm.sh/globe.gl@2.45.0',
  'gsap': 'https://esm.sh/gsap@3.14.2',
  'iconify-icon': 'https://esm.sh/iconify-icon@3.0.2',
  katex: 'https://esm.sh/katex@0.16.21',
  konva: 'https://esm.sh/konva@9.3.22',
  'lottie-web': 'https://esm.sh/lottie-web@5.13.0',
  'matter-js': 'https://esm.sh/matter-js@0.20.0',
  mathjs: 'https://esm.sh/mathjs@14.9.1',
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
  mediabunny: 'https://esm.sh/mediabunny@1.25.1',
};

/**
 * The browser pipeline does not need a system FFmpeg binary. Keep this legacy
 * health-check name for older callers, but report true when Puppeteer's browser
 * can be resolved and launched.
 */
export async function checkBrowserEnvironment(): Promise<boolean> {
  const executablePath = findBrowserExecutable();
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

export const checkFFmpeg = checkBrowserEnvironment;

export async function renderToFile(
  project: AnimationProject,
  outputPath: string,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const startTime = Date.now();
  const absoluteOutput = path.resolve(outputPath);
  const diagnostics: string[] = [];
  let server: http.Server | null = null;
  let browser: Browser | null = null;
  const tempOutput = `${absoluteOutput}.tmp-${process.pid}-${Date.now()}`;
  let streamedOutput = false;

  try {
    validateRenderOptions(options);
    await fsp.mkdir(path.dirname(absoluteOutput), { recursive: true });
    await fsp.rm(tempOutput, { force: true });

    options.onProgress?.({
      phase: 'setup',
      progress: 0,
      currentFrame: 0,
      totalFrames: getTotalFrames(project, options),
      message: 'Starting browser renderer',
    });

    server = await createStaticServer(resolveEngineDistDir(), resolveRuntimeCoreDistDir(), {
      coreDistDir: resolveCoreDistDir(),
    });
    const pageUrl = `${getServerOrigin(server)}/render.html`;

    browser = await puppeteer.launch({
      headless: options.headless ?? true,
      executablePath: options.browserExecutablePath ?? findBrowserExecutable(),
      protocolTimeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--enable-features=WebCodecs',
        '--enable-unsafe-webgpu',
        '--ignore-gpu-blocklist',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const { width, height } = resolveDimensions(project, options);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.exposeFunction('__ui2vReportProgress', (progress: RenderProgress) => {
      options.onProgress?.(progress);
    });
    await page.exposeFunction('__ui2vWriteOutputChunk', async (chunkBase64: string) => {
      streamedOutput = true;
      await fsp.appendFile(tempOutput, Buffer.from(chunkBase64, 'base64'));
    });
    attachDiagnostics(page, options, diagnostics);

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle0' });
      await page.waitForFunction(
        () => typeof globalThis.__ui2vRender === 'function',
        { timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS }
      );
    } catch (error) {
      throw new Error(formatRenderError(
        `Failed to initialize the browser renderer: ${(error as Error).message}`,
        diagnostics
      ));
    }

    const pageResult = await page.evaluate(
      async ({ project: pageProject, options: pageOptions }) => {
        return await globalThis.__ui2vRender(pageProject, pageOptions);
      },
      {
        project,
        options: normalizePageOptions(project, options),
      }
    ) as PageRenderResult;

    if (!pageResult.success) {
      const stack = pageResult.stack ? `\n${pageResult.stack}` : '';
      throw new Error(formatRenderError(`${pageResult.error}${stack}`, diagnostics));
    }

    if (pageResult.streamed) {
      await fsp.rm(absoluteOutput, { force: true });
      await fsp.rename(tempOutput, absoluteOutput);
    } else if (pageResult.base64) {
      const buffer = Buffer.from(pageResult.base64, 'base64');
      await fsp.writeFile(absoluteOutput, buffer);
    } else {
      throw new Error('Browser renderer completed without returning video data');
    }

    const stat = await fsp.stat(absoluteOutput);
    options.onProgress?.({
      phase: 'complete',
      progress: 100,
      currentFrame: getTotalFrames(project, options),
      totalFrames: getTotalFrames(project, options),
      message: `Wrote ${absoluteOutput}`,
    });

    return {
      success: true,
      outputPath: absoluteOutput,
      fileSize: stat.size,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    if (streamedOutput || fs.existsSync(tempOutput)) {
      await fsp.rm(tempOutput, { force: true }).catch(() => {});
    }
    return {
      success: false,
      duration: Date.now() - startTime,
      error: (error as Error).message,
      diagnostics,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await closeServer(server);
    }
  }
}

export async function renderToVideo(
  project: AnimationProject,
  options: RenderOptions = {},
  onProgress?: (progress: RenderProgress) => void
): Promise<Blob> {
  const tempFile = path.join(process.cwd(), `ui2v-${Date.now()}.mp4`);

  try {
    const result = await renderToFile(project, tempFile, {
      ...options,
      onProgress: onProgress ?? options.onProgress,
    });

    if (!result.success) {
      throw new Error(result.error || 'Render failed');
    }

    const buffer = await fsp.readFile(tempFile);
    return new Blob([buffer], { type: 'video/mp4' });
  } finally {
    if (!options.keepTemp && fs.existsSync(tempFile)) {
      await fsp.unlink(tempFile);
    }
  }
}

export async function startPreview(
  project: AnimationProject,
  options: PreviewOptions = {}
): Promise<PreviewSession> {
  const session = await startPreviewServer(project, options);
  const url = session.url;
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: options.headless ?? false,
      executablePath: options.browserExecutablePath ?? findBrowserExecutable(),
      protocolTimeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--ignore-gpu-blocklist',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const { width, height } = resolveDimensions(project, {});
    const viewportWidth = options.width ?? Math.min(Math.max(width, 640), 1600);
    const viewportHeight = options.height ?? Math.min(Math.max(height, 360), 1000);
    const pixelRatio = normalizePreviewPixelRatio(options.pixelRatio);
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: pixelRatio,
    });

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('canvas[data-ui2v-ready="true"]', { timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS });

    const close = async () => {
      if (browser) {
        await browser.close();
        browser = null;
      }
      await session.close();
    };

    browser.on('disconnected', () => {
      session.close().catch(() => {});
    });

    return { url, close };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    await session.close();
    throw error;
  }
}

export async function startPreviewServer(
  project: AnimationProject,
  options: PreviewOptions = {}
): Promise<PreviewSession> {
  const server = await createStaticServer(resolveEngineDistDir(), resolveRuntimeCoreDistDir(), {
    coreDistDir: resolveCoreDistDir(),
    project,
    previewOptions: normalizePreviewOptions(project, options),
  });
  return {
    url: `${getServerOrigin(server)}/preview.html`,
    close: () => closeServer(server),
  };
}

function validateRenderOptions(options: RenderOptions): void {
  if (options.format && options.format !== 'mp4') {
    throw new Error(`Only mp4 output is currently supported by the browser renderer. Received: ${options.format}`);
  }

  if (options.codec && !['avc', 'hevc'].includes(options.codec)) {
    throw new Error(`Only avc and hevc codecs are supported for mp4 output. Received: ${options.codec}`);
  }
}

function resolveDimensions(project: AnimationProject, options: RenderOptions): { width: number; height: number } {
  const resolution = project.resolution as any;
  let width = options.width;
  let height = options.height;

  if (!width || !height) {
    if (typeof resolution === 'string') {
      const match = resolution.match(/^(\d+)x(\d+)$/);
      if (match) {
        width ??= Number(match[1]);
        height ??= Number(match[2]);
      }
    } else if (resolution && typeof resolution === 'object') {
      width ??= Number(resolution.width);
      height ??= Number(resolution.height);
    }
  }

  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('Unable to resolve output dimensions from project or CLI options');
  }

  return { width, height };
}

function getTotalFrames(project: AnimationProject, options: RenderOptions): number {
  return getFrameCount({
    duration: project.duration,
    fps: options.fps ?? project.fps,
  });
}

function normalizePageOptions(project: AnimationProject, options: RenderOptions) {
  const { width, height } = resolveDimensions(project, options);
  return {
    fps: options.fps ?? project.fps,
    width,
    height,
    renderScale: normalizeRenderScale(options.renderScale),
    duration: project.duration,
    quality: normalizeQuality(options.quality),
    codec: options.codec === 'hevc' ? 'hevc' : 'avc',
    bitrate: options.bitrate,
  };
}

function normalizeRenderScale(renderScale?: number): number {
  if (renderScale === undefined) {
    return 1;
  }

  if (!Number.isFinite(renderScale) || renderScale <= 0) {
    return 1;
  }

  return Math.max(1, Math.min(4, renderScale));
}

function normalizePreviewOptions(project: AnimationProject, options: PreviewOptions) {
  const { width, height } = resolveDimensions(project, options);
  return {
    fps: options.fps ?? project.fps,
    width,
    height,
    pixelRatio: normalizePreviewPixelRatio(options.pixelRatio),
    duration: project.duration,
  };
}

function normalizePreviewPixelRatio(pixelRatio?: number): number {
  if (pixelRatio === undefined) {
    return 2;
  }

  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return 2;
  }

  return Math.max(1, Math.min(4, pixelRatio));
}

function normalizeQuality(quality?: RenderQuality): RenderQuality {
  if (quality === 'low' || quality === 'medium' || quality === 'ultra' || quality === 'cinema') {
    return quality;
  }
  return 'high';
}

function resolveEngineDistDir(): string {
  return resolvePackageDistDir('@ui2v/engine');
}

function resolveRuntimeCoreDistDir(): string {
  return resolvePackageDistDir('@ui2v/runtime-core');
}

function resolveCoreDistDir(): string {
  return resolvePackageDistDir('@ui2v/core');
}

function resolvePackageDistDir(packageName: string): string {
  const nodeRequire = createRequire(__filename);
  return path.dirname(nodeRequire.resolve(packageName));
}

interface StaticServerOptions {
  coreDistDir?: string;
  project?: AnimationProject;
  previewOptions?: ReturnType<typeof normalizePreviewOptions>;
}

async function createStaticServer(
  engineDistDir: string,
  runtimeCoreDistDir: string,
  options: StaticServerOptions = {}
): Promise<http.Server> {
  const renderHtml = createRenderHTML();
  const previewHtml = createPreviewHTML();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/' || url.pathname === '/render.html') {
        sendText(res, renderHtml, 'text/html; charset=utf-8');
        return;
      }

      if (url.pathname === '/preview.html') {
        sendText(res, previewHtml, 'text/html; charset=utf-8');
        return;
      }

      if (url.pathname === '/project.json') {
        if (!options.project || !options.previewOptions) {
          res.writeHead(404);
          res.end('No preview project is attached to this server');
          return;
        }
        sendJson(res, {
          project: options.project,
          options: options.previewOptions,
        });
        return;
      }

      if (url.pathname === '/engine/index.mjs') {
        const enginePath = path.join(engineDistDir, 'index.mjs');
        const code = await fsp.readFile(enginePath, 'utf8');
        sendText(res, code, 'text/javascript; charset=utf-8');
        return;
      }

      if (url.pathname === '/runtime-core/index.mjs') {
        const runtimeCorePath = path.join(runtimeCoreDistDir, 'index.mjs');
        const code = await fsp.readFile(runtimeCorePath, 'utf8');
        sendText(res, code, 'text/javascript; charset=utf-8');
        return;
      }

      if (url.pathname === '/core/index.mjs') {
        const corePath = path.join(options.coreDistDir ?? resolveCoreDistDir(), 'index.mjs');
        const code = await fsp.readFile(corePath, 'utf8');
        sendText(res, code, 'text/javascript; charset=utf-8');
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (error) {
      res.writeHead(500);
      res.end((error as Error).message);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  return server;
}

function getServerOrigin(server: http.Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start render server');
  }
  return `http://127.0.0.1:${address.port}`;
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()));
}

function sendText(res: http.ServerResponse, text: string, contentType: string): void {
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(text);
}

function sendJson(res: http.ServerResponse, value: unknown): void {
  sendText(res, JSON.stringify(value), 'application/json; charset=utf-8');
}

function attachDiagnostics(page: Page, options: RenderOptions, diagnostics: string[]): void {
  const record = (message: string) => {
    diagnostics.push(message);
    if (diagnostics.length > MAX_DIAGNOSTICS) {
      diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS);
    }
  };

  page.on('console', (message: ConsoleMessage) => {
    const text = message.text();
    if (message.type() === 'error') {
      record(`Browser console error: ${text}`);
      options.onProgress?.({
        phase: 'setup',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        message: `Browser console: ${text}`,
      });
    }
  });

  page.on('pageerror', error => {
    const message = error instanceof Error ? error.message : String(error);
    record(`Browser page error: ${message}`);
    options.onProgress?.({
      phase: 'setup',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      message: `Browser error: ${message}`,
    });
  });

  page.on('requestfailed', (request: HTTPRequest) => {
    const failure = request.failure();
    record(`Request failed: ${request.url()} ${failure?.errorText || ''}`.trim());
    options.onProgress?.({
      phase: 'setup',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      message: `Request failed: ${request.url()} ${failure?.errorText || ''}`,
    });
  });
}

function formatRenderError(message: string, diagnostics: string[]): string {
  const trimmed = message.trim();
  if (diagnostics.length === 0) {
    return trimmed;
  }

  const uniqueDiagnostics = Array.from(new Set(diagnostics));
  return [
    trimmed,
    '',
    'Browser diagnostics:',
    ...uniqueDiagnostics.map(item => `- ${item}`),
  ].join('\n');
}

function createRenderHTML(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ui2v render</title>
  <script type="importmap">${JSON.stringify({ imports: IMPORT_MAP })}</script>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    #stage { position: fixed; inset: 0; display: grid; place-items: center; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="stage"><canvas id="renderCanvas"></canvas></div>
  <script type="module">
    import { TemplateCanvasAdapter, WebCodecsExporter } from '/engine/index.mjs';
    import { createSegmentFramePlan, UivRuntime } from '/runtime-core/index.mjs';

    const report = (progress) => {
      if (typeof window.__ui2vReportProgress === 'function') {
        window.__ui2vReportProgress(progress);
      }
    };

    const blobToBase64 = async (blob) => {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 32768;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const bytesToBase64 = (bytes) => {
      let binary = '';
      const chunkSize = 32768;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const streamBlobToNode = async (blob, totalFrames) => {
      if (typeof window.__ui2vWriteOutputChunk !== 'function' || typeof blob.stream !== 'function') {
        report({
          phase: 'finalizing',
          progress: 96,
          currentFrame: totalFrames,
          totalFrames,
          message: 'Transferring encoded video to Node',
        });
        return { base64: await blobToBase64(blob) };
      }

      const reader = blob.stream().getReader();
      let written = 0;
      let lastReported = 0;

      while (true) {
        const result = await reader.read();
        if (result.done) break;

        const chunk = result.value;
        written += chunk.byteLength;
        await window.__ui2vWriteOutputChunk(bytesToBase64(chunk));

        if (blob.size > 0) {
          const transferProgress = 96 + Math.min(3, (written / blob.size) * 3);
          if (transferProgress - lastReported >= 0.25 || written === blob.size) {
            lastReported = transferProgress;
            report({
              phase: 'finalizing',
              progress: transferProgress,
              currentFrame: totalFrames,
              totalFrames,
              message: 'Writing encoded video to disk',
            });
          }
        }
      }

      return { streamed: true, bytes: written };
    };

    window.__ui2vRender = async (project, options) => {
      let adapter;
      try {
        if (!WebCodecsExporter.isSupported()) {
          throw new Error('WebCodecs is not available in the launched browser');
        }

        const canvas = document.getElementById('renderCanvas');
        const renderScale = Math.max(1, Math.min(4, Number(options.renderScale) || 1));
        canvas.width = Math.round(options.width * renderScale);
        canvas.height = Math.round(options.height * renderScale);
        canvas.style.width = options.width + 'px';
        canvas.style.height = options.height + 'px';

        project = {
          ...project,
          fps: options.fps,
          resolution: { width: options.width, height: options.height },
        };
        const segmentFramePlan = createSegmentFramePlan(project);
        const totalFrames = segmentFramePlan.totalFrames;

        report({
          phase: 'setup',
          progress: 2,
          currentFrame: 0,
          totalFrames,
          message: 'Loading ui2v project',
        });

        adapter = new TemplateCanvasAdapter({
          canvas,
          pixelRatio: renderScale,
          enablePerformanceMonitoring: false,
          enableAutoQualityAdjust: false,
        });
        const runtime = new UivRuntime(project);
        await runtime.initializeAdapter(adapter);
        const engine = adapter.getEngine();
        if (!engine) {
          throw new Error('Runtime adapter did not expose a render engine');
        }

        const dependencyPlan = runtime.getDependencyPlan({ lookAheadSeconds: 0.25 });
        if (dependencyPlan.dependencies.length > 0 && typeof engine.preloadDependencies === 'function') {
          report({
            phase: 'setup',
            progress: 6,
            currentFrame: 0,
            totalFrames,
            message: 'Preloading runtime dependencies: ' + dependencyPlan.dependencies.join(', '),
          });
          await engine.preloadDependencies(dependencyPlan.dependencies);
        }
        engine.setExportMode(true);

        const exporter = new WebCodecsExporter();
        const blob = await exporter.exportToVideo(
          engine,
          canvas,
          {
            fps: options.fps,
            width: options.width,
            height: options.height,
            renderScale,
            duration: options.duration,
            quality: options.quality,
            codec: options.codec,
            bitrate: options.bitrate,
            framePlan: segmentFramePlan.frames,
          },
          (progressInfo) => {
            report({
              phase: progressInfo.phase,
              progress: progressInfo.progress,
              currentFrame: progressInfo.renderedFrames,
              totalFrames: progressInfo.totalFrames,
              fps: progressInfo.fps,
              estimatedTimeRemaining: progressInfo.estimatedTimeRemaining,
              segmentId: progressInfo.segmentId,
              segmentLabel: progressInfo.segmentLabel,
              segmentFrameIndex: progressInfo.segmentFrameIndex,
              segmentLocalTime: progressInfo.segmentLocalTime,
              segmentProgress: progressInfo.segmentProgress,
            });
          }
        );

        const output = await streamBlobToNode(blob, totalFrames);

        return {
          success: true,
          mimeType: blob.type || 'video/mp4',
          ...output,
        };
      } catch (error) {
        console.error(error);
        return {
          success: false,
          error: error && error.message ? error.message : String(error),
          stack: error && error.stack ? error.stack : undefined,
        };
      } finally {
        if (adapter) {
          adapter.dispose();
        }
      }
    };
  </script>
</body>
</html>`;
}

function createPreviewHTML(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ui2v Preview</title>
  <script type="importmap">${JSON.stringify({ imports: IMPORT_MAP })}</script>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #111; color: #f6f6f6; font-family: Arial, sans-serif; }
    #stage { position: fixed; inset: 0; display: grid; place-items: center; background: #111; }
    canvas { display: block; max-width: 100vw; max-height: 100vh; box-shadow: 0 8px 40px rgba(0,0,0,.45); background: #000; }
    #bar { position: fixed; left: 16px; right: 16px; bottom: 16px; display: flex; gap: 10px; align-items: center; padding: 10px 12px; background: rgba(20,20,20,.82); border: 1px solid rgba(255,255,255,.14); border-radius: 8px; backdrop-filter: blur(10px); }
    button { height: 34px; border: 0; border-radius: 6px; padding: 0 12px; color: #111; background: #f2aa4c; font-weight: 700; cursor: pointer; }
    input[type="range"] { flex: 1; min-width: 120px; }
    #time { min-width: 128px; text-align: right; font-variant-numeric: tabular-nums; color: #ddd; }
    #status { position: fixed; top: 16px; left: 16px; max-width: min(720px, calc(100vw - 32px)); padding: 10px 12px; border-radius: 8px; background: rgba(20,20,20,.82); color: #ddd; border: 1px solid rgba(255,255,255,.14); }
    #status.error { color: #ffd6d6; border-color: rgba(255,100,100,.5); }
    #debug { position: fixed; top: 16px; right: 16px; width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 104px); overflow: auto; padding: 12px; border-radius: 8px; background: rgba(6,9,14,.86); border: 1px solid rgba(121,217,255,.26); color: #dfe9f5; font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; backdrop-filter: blur(12px); display: none; }
    #debug.visible { display: block; }
    #debug b { color: #79d9ff; font-weight: 800; }
    #debug .muted { color: #8da1b3; }
  </style>
</head>
<body>
  <div id="stage"><canvas id="previewCanvas"></canvas></div>
  <div id="status">Loading...</div>
  <pre id="debug"></pre>
  <div id="bar">
    <button id="toggle">Pause</button>
    <button id="restart">Restart</button>
    <input id="scrub" type="range" min="0" max="1000" value="0">
    <div id="time">0.00 / 0.00s</div>
  </div>
  <script type="module">
    import { TemplateCanvasAdapter } from '/engine/index.mjs';
    import { UivRuntime } from '/runtime-core/index.mjs';

    let adapter;
    let runtime;
    let duration = 0;
    let playing = true;
    let startTime = 0;
    let pausedAt = 0;
    let raf = 0;
    let renderingFrame = false;

    const status = document.getElementById('status');
    const toggle = document.getElementById('toggle');
    const restart = document.getElementById('restart');
    const scrub = document.getElementById('scrub');
    const timeLabel = document.getElementById('time');
    const debugPanel = document.getElementById('debug');
    let debugVisible = new URLSearchParams(location.search).get('debug') === '1';
    debugPanel.className = debugVisible ? 'visible' : '';

    const setStatus = (message, isError = false) => {
      status.textContent = message;
      status.className = isError ? 'error' : '';
    };

    const formatTime = (seconds) => seconds.toFixed(2).padStart(5, '0');

    const updateTimeUI = (time) => {
      const safeDuration = duration || 1;
      scrub.value = String(Math.round((time / safeDuration) * 1000));
      timeLabel.textContent = formatTime(time) + ' / ' + formatTime(duration) + 's';
    };

    const renderAt = async (time) => {
      if (!runtime || renderingFrame) return;
      renderingFrame = true;
      try {
        const frame = runtime.evaluate(time);
        await adapter.render(frame);
        updateDebug(frame);
      } finally {
        renderingFrame = false;
      }
    };

    const updateDebug = (frame) => {
      if (!debugVisible || !frame) return;
      const transition = frame.transition
        ? frame.transition.type + ' ' + frame.transition.phase + ' ' + Math.round(frame.transition.progress * 100) + '%'
        : 'none';
      const camera = frame.camera
        ? 'x=' + frame.camera.x.toFixed(1) + ' y=' + frame.camera.y.toFixed(1) + ' z=' + frame.camera.z.toFixed(1) + ' zoom=' + frame.camera.zoom.toFixed(2) + ' eff=' + frame.camera.effectiveZoom.toFixed(2) + ' r=' + frame.camera.rotation.toFixed(1)
        : 'default';
      const caption = frame.activeNarration && frame.activeNarration[0] ? frame.activeNarration[0].text : 'none';
      debugPanel.textContent = [
        'UIV Runtime Debug',
        'project: ' + frame.composition.id,
        'time: ' + frame.time.toFixed(3) + 's',
        'frame: ' + frame.frame + ' @ ' + frame.fps + 'fps',
        'segment: ' + (frame.activeSegment ? frame.activeSegment.id + ' "' + (frame.activeSegment.label || '') + '"' : 'none'),
        'camera: ' + camera,
        'transition: ' + transition,
        'caption: ' + caption,
        'deps: ' + frame.dependencies.join(', '),
        'nodes: ' + frame.nodes.map(node => node.id).join(', '),
      ].join('\\n');
    };

    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'd') {
        debugVisible = !debugVisible;
        debugPanel.className = debugVisible ? 'visible' : '';
      }
    });

    const tick = async () => {
      if (!runtime || !playing) return;
      const elapsed = ((performance.now() - startTime) / 1000) % duration;
      await renderAt(elapsed);
      updateTimeUI(elapsed);
      raf = requestAnimationFrame(tick);
    };

    const seekSeconds = async (seconds) => {
      const clamped = Math.max(0, Math.min(duration, seconds));
      await renderAt(clamped);
      pausedAt = clamped;
      startTime = performance.now() - clamped * 1000;
      updateTimeUI(clamped);
    };

    toggle.addEventListener('click', () => {
      if (!runtime) return;
      if (playing) {
        playing = false;
        cancelAnimationFrame(raf);
        const seconds = (performance.now() - startTime) / 1000;
        pausedAt = duration ? seconds % duration : 0;
        toggle.textContent = 'Play';
      } else {
        playing = true;
        startTime = performance.now() - pausedAt * 1000;
        toggle.textContent = 'Pause';
        tick();
      }
    });

    restart.addEventListener('click', async () => {
      if (!runtime) return;
      await seekSeconds(0);
      if (!playing) {
        playing = true;
        toggle.textContent = 'Pause';
        tick();
      }
    });

    scrub.addEventListener('input', () => {
      if (!runtime) return;
      const seconds = (Number(scrub.value) / 1000) * duration;
      seekSeconds(seconds);
    });

    window.__ui2vPreview = async (project, options) => {
      try {
        const canvas = document.getElementById('previewCanvas');
        const pixelRatio = Math.max(1, Math.min(4, Number(options.pixelRatio) || 2));
        canvas.width = Math.round(options.width * pixelRatio);
        canvas.height = Math.round(options.height * pixelRatio);
        canvas.style.width = options.width + 'px';
        canvas.style.height = options.height + 'px';
        canvas.style.aspectRatio = options.width + ' / ' + options.height;
        canvas.dataset.ui2vReady = 'false';

        duration = options.duration;
        project = {
          ...project,
          fps: options.fps,
          resolution: { width: options.width, height: options.height },
        };

        setStatus('Loading project...');
        adapter = new TemplateCanvasAdapter({
          canvas,
          pixelRatio,
          enablePerformanceMonitoring: false,
          enableAutoQualityAdjust: false,
        });
        runtime = new UivRuntime(project);
        await runtime.initializeAdapter(adapter);
        await renderAt(0);
        canvas.dataset.ui2vReady = 'true';
        startTime = performance.now();
        playing = true;
        toggle.textContent = 'Pause';
        setStatus(project.id ? 'Preview: ' + project.id : 'Preview ready');
        tick();
      } catch (error) {
        console.error(error);
        setStatus(error && error.message ? error.message : String(error), true);
        throw error;
      }
    };

    const loadAttachedProject = async () => {
      try {
        setStatus('Loading project...');
        const response = await fetch('/project.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Unable to load /project.json: HTTP ' + response.status);
        }
        const payload = await response.json();
        if (!payload || !payload.project || !payload.options) {
          throw new Error('Invalid preview payload from /project.json');
        }
        await window.__ui2vPreview(payload.project, payload.options);
      } catch (error) {
        console.error(error);
        setStatus(error && error.message ? error.message : String(error), true);
      }
    };

    loadAttachedProject();
  </script>
</body>
</html>`;
}

export function getEngineBundleFileUrl(): string {
  return pathToFileURL(path.join(resolveEngineDistDir(), 'index.mjs')).href;
}

export function findBrowserExecutable(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const candidates = getBrowserCandidates();
  return candidates.find(candidate => fs.existsSync(candidate));
}

function getBrowserCandidates(): string[] {
  if (process.platform === 'win32') {
    const prefixes = [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.LOCALAPPDATA,
    ].filter(Boolean) as string[];

    return prefixes.flatMap(prefix => [
      path.join(prefix, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(prefix, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(prefix, 'Chromium', 'Application', 'chrome.exe'),
    ]);
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }

  const commands = ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium', 'microsoft-edge'];
  const paths: string[] = [];
  for (const command of commands) {
    try {
      const resolved = execFileSync('which', [command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (resolved) {
        paths.push(resolved);
      }
    } catch {
      // ignore
    }
  }
  return paths;
}
