/**
 * Browser-backed renderer for the standalone CLI.
 *
 * The ui2v engine is browser-first: it depends on DOM, Canvas, WebCodecs, and
 * browser ESM loading. The producer owns that browser environment and returns a
 * real file to Node instead of asking the user to click a generated HTML page.
 */

import { parseProject } from '@ui2v/core';
import type { AnimationProject } from '@ui2v/engine';
export type { AnimationProject } from '@ui2v/engine';
import { getFrameCount, validateRuntimeProject } from '@ui2v/runtime-core';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as http from 'http';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer-core';

export type RenderQuality = 'low' | 'medium' | 'high' | 'ultra' | 'cinema';
export type RenderFormat = 'mp4' | 'webm' | 'png' | 'jpg';
export type RenderCodec = 'avc' | 'hevc' | 'vp9';

export interface BrowserResolutionResult {
  executablePath?: string;
  source?: string;
  searched: string[];
  env: Record<string, string | undefined>;
}

export class BrowserExecutableNotFoundError extends Error {
  readonly searched: string[];

  constructor(searched: string[]) {
    super(formatBrowserExecutableNotFoundMessage(searched));
    this.name = 'BrowserExecutableNotFoundError';
    this.searched = searched;
  }
}

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
  sourcePath?: string;
  workspaceRoot?: string;
  exportDir?: string;
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
  try {
    const executablePath = resolveRequiredBrowserExecutable();
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
      executablePath: resolveRequiredBrowserExecutable(options.browserExecutablePath),
      protocolTimeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--enable-features=WebCodecs',
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

    let pageResult: PageRenderResult;
    try {
      pageResult = await page.evaluate(
        async ({ project: pageProject, options: pageOptions }) => {
          try {
            return await globalThis.__ui2vRender(pageProject, pageOptions);
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            };
          }
        },
        {
          project,
          options: normalizePageOptions(project, options),
        }
      ) as PageRenderResult;
    } catch (error) {
      throw new Error(formatRenderError(
        formatPageExecutionError((error as Error).message, diagnostics),
        diagnostics
      ));
    }

    if (!pageResult.success) {
      const stack = pageResult.stack ? `\n${pageResult.stack}` : '';
      throw new Error(formatRenderError(`${pageResult.error}${stack}`, diagnostics));
    }

    if (pageResult.streamed) {
      await fsp.rm(absoluteOutput, { force: true });
      await fsp.rename(tempOutput, absoluteOutput);
    } else if (pageResult.base64) {
      const buffer = Buffer.from(pageResult.base64, 'base64');
      await fsp.writeFile(tempOutput, buffer);
      await fsp.rm(absoluteOutput, { force: true });
      await fsp.rename(tempOutput, absoluteOutput);
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
      executablePath: resolveRequiredBrowserExecutable(options.browserExecutablePath),
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
    const viewportWidth = options.width ?? width;
    const viewportHeight = options.height ?? height;
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
    previewOptionOverrides: options,
    previewSourcePath: options.sourcePath,
    previewWorkspaceRoot: options.workspaceRoot,
    previewExportDir: options.exportDir,
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
  previewOptionOverrides?: PreviewOptions;
  previewSourcePath?: string;
  previewWorkspaceRoot?: string;
  previewExportDir?: string;
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
          sourcePath: options.previewSourcePath,
        });
        return;
      }

      if (url.pathname === '/preview/projects') {
        sendJson(res, await createPreviewProjectList(options));
        return;
      }

      if (url.pathname === '/preview/state') {
        const requestedPath = url.searchParams.get('path');
        sendJson(res, await createPreviewState(requestedPath, options));
        return;
      }

      if (url.pathname === '/preview/load') {
        const requestedPath = url.searchParams.get('path');
        const projectFile = resolvePreviewProjectPath(requestedPath, options);
        const project = await readPreviewProject(projectFile);
        sendJson(res, {
          project,
          options: normalizePreviewOptions(project, options.previewOptionOverrides ?? {}),
          sourcePath: projectFile,
        });
        return;
      }

      if (url.pathname === '/preview/export' && req.method === 'POST') {
        const body = await readRequestJson(req);
        const projectFile = resolvePreviewProjectPath(body?.path, options);
        const project = await readPreviewProject(projectFile);
        const previewOptions = normalizePreviewOptions(project, options.previewOptionOverrides ?? {});
        const outputPath = resolvePreviewExportPath(projectFile, project, options);
        const result = await renderToFile(project, outputPath, {
          quality: body?.quality === 'ultra' || body?.quality === 'cinema' || body?.quality === 'medium' || body?.quality === 'low' ? body.quality : 'high',
          fps: previewOptions.fps,
          width: previewOptions.width,
          height: previewOptions.height,
          renderScale: body?.renderScale ? Number(body.renderScale) : 1,
          codec: body?.codec === 'hevc' ? 'hevc' : 'avc',
        });
        sendJson(res, { ...result, outputPath });
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
      if ((req.url || '').startsWith('/preview/')) {
        res.writeHead(500, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        });
        res.end(JSON.stringify({ success: false, error: (error as Error).message }));
        return;
      }
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

function readRequestJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

async function createPreviewProjectList(options: StaticServerOptions) {
  const root = resolvePreviewWorkspaceRoot(options);
  const files = await findPreviewJsonProjects(root);
  const currentPath = options.previewSourcePath ? path.resolve(options.previewSourcePath) : undefined;
  return {
    root,
    currentPath,
    projects: files.map(file => {
      const project = safeReadProjectSummary(file);
      return {
        path: file,
        label: path.relative(root, file).replace(/\\/g, '/'),
        id: project?.id,
        name: project?.name,
        duration: project?.duration,
        fps: project?.fps,
        resolution: project?.resolution,
        current: currentPath === file,
      };
    }),
  };
}

async function createPreviewState(requestedPath: unknown, options: StaticServerOptions) {
  const root = resolvePreviewWorkspaceRoot(options);
  const projectFile = resolvePreviewProjectPath(requestedPath, options);
  const files = await findPreviewJsonProjects(root);
  const currentStat = await fsp.stat(projectFile);
  const projectListVersion = files
    .map(file => {
      try {
        const stat = fs.statSync(file);
        return `${path.relative(root, file).replace(/\\/g, '/')}@${stat.mtimeMs}@${stat.size}`;
      } catch {
        return `${path.relative(root, file).replace(/\\/g, '/')}@missing`;
      }
    })
    .join('|');

  return {
    root,
    currentPath: projectFile,
    currentMtimeMs: currentStat.mtimeMs,
    currentSize: currentStat.size,
    projectCount: files.length,
    projectListVersion,
  };
}

async function findPreviewJsonProjects(root: string): Promise<string[]> {
  const files: string[] = [];
  await walkPreviewProjects(root, files);
  return files.sort((a, b) => a.localeCompare(b));
}

async function walkPreviewProjects(dir: string, files: string[]): Promise<void> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'out' || entry.name === '.tmp') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkPreviewProjects(fullPath, files);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const summary = safeReadProjectSummary(fullPath);
    if (summary) {
      files.push(path.resolve(fullPath));
    }
  }
}

function safeReadProjectSummary(file: string): any | null {
  try {
    const json = JSON.parse(stripUtf8Bom(fs.readFileSync(file, 'utf8')));
    if (json?.schema === 'uiv-runtime') {
      return { id: json.id, name: json.name, duration: json.duration, fps: json.fps, resolution: json.resolution };
    }
    if (json && typeof json === 'object' && typeof json.id === 'string' && Number.isFinite(Number(json.duration))) {
      return { id: json.id, name: json.name, duration: json.duration, fps: json.fps, resolution: json.resolution };
    }
  } catch {
    return null;
  }
  return null;
}

async function readPreviewProject(file: string): Promise<AnimationProject> {
  const text = stripUtf8Bom(await fsp.readFile(file, 'utf8'));
  const rawProject = JSON.parse(text);

  if (rawProject?.schema === 'uiv-runtime') {
    const validation = validateRuntimeProject(rawProject);
    if (!validation.valid) {
      const details = validation.errors
        .slice(0, 5)
        .map(error => `${error.path}: ${error.message}`)
        .join('; ');
      throw new Error(`Invalid runtime project ${path.basename(file)}: ${details}`);
    }
    return rawProject as AnimationProject;
  }

  parseProject(text);
  return rawProject as AnimationProject;
}

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function resolvePreviewWorkspaceRoot(options: StaticServerOptions): string {
  if (options.previewWorkspaceRoot) {
    return path.resolve(options.previewWorkspaceRoot);
  }
  if (options.previewSourcePath) {
    return path.dirname(path.resolve(options.previewSourcePath));
  }
  return process.cwd();
}

function resolvePreviewProjectPath(requestedPath: unknown, options: StaticServerOptions): string {
  const root = resolvePreviewWorkspaceRoot(options);
  const fallback = options.previewSourcePath ? path.resolve(options.previewSourcePath) : undefined;
  const resolved = typeof requestedPath === 'string' && requestedPath ? path.resolve(requestedPath) : fallback;
  if (!resolved) {
    throw new Error('No preview project path was provided');
  }
  if (!isPathInside(root, resolved)) {
    throw new Error('Preview project path must stay inside the workspace root');
  }
  if (!resolved.endsWith('.json')) {
    throw new Error('Preview project path must be a JSON file');
  }
  return resolved;
}

function resolvePreviewExportPath(projectFile: string, project: AnimationProject, options: StaticServerOptions): string {
  const root = resolvePreviewWorkspaceRoot(options);
  const exportDir = path.resolve(options.previewExportDir ?? path.join(root, '.tmp', 'examples'));
  if (!isPathInside(root, exportDir)) {
    throw new Error('Preview export directory must stay inside the workspace root');
  }
  const baseName = sanitizeFileName(String((project as any).id || path.basename(projectFile, '.json')));
  return path.join(exportDir, `${baseName}.mp4`);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'ui2v-preview';
}

function isPathInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
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

function formatPageExecutionError(message: string, diagnostics: string[]): string {
  if (!message.includes('Protocol error (Runtime.callFunctionOn)')) {
    return `Browser render execution failed: ${message}`;
  }

  const meaningful = extractMeaningfulBrowserError(diagnostics);
  return meaningful
    ? `Browser render failed: ${meaningful}`
    : `Browser render execution failed: ${message}`;
}

function extractMeaningfulBrowserError(diagnostics: string[]): string | undefined {
  const patterns = [/Error:\s*([^\n]+)/, /Browser page error:\s*(.+)$/];
  for (let index = diagnostics.length - 1; index >= 0; index--) {
    const diagnostic = diagnostics[index];
    if (!diagnostic || diagnostic.includes('Protocol error') || diagnostic.includes('Failed to load resource')) {
      continue;
    }
    for (const pattern of patterns) {
      const match = diagnostic.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }
  return undefined;
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
  <title>ui2v Studio Preview</title>
  <script type="importmap">${JSON.stringify({ imports: IMPORT_MAP })}</script>
  <style>
    :root { color-scheme: dark; --bg:#030712; --panel:rgba(7,17,31,.78); --line:rgba(255,255,255,.12); --text:#f8fbff; --muted:#8ea4bc; --cyan:#00d4ff; --green:#7bd88f; --amber:#f2aa4c; --danger:#ff6b6b; }
    * { box-sizing: border-box; } html,body { margin:0; width:100%; height:100%; overflow:hidden; background:radial-gradient(circle at 20% 10%,rgba(0,212,255,.18),transparent 28%),radial-gradient(circle at 86% 74%,rgba(242,170,76,.16),transparent 30%),var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { display:grid; grid-template-columns:340px minmax(0,1fr); }
    #sidebar { z-index:12; min-width:0; display:flex; flex-direction:column; border-right:1px solid var(--line); background:linear-gradient(180deg,rgba(3,7,18,.96),rgba(5,12,24,.9)); backdrop-filter:blur(18px); }
    #brand { padding:22px 20px 18px; border-bottom:1px solid var(--line); } #brand .eyebrow { color:var(--cyan); font:800 12px/1 ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing:.16em; text-transform:uppercase; } #brand h1 { margin:10px 0 8px; font-size:24px; letter-spacing:-.03em; } #brand p { margin:0; color:var(--muted); font-size:13px; line-height:1.45; } #folder { margin-top:12px; padding:8px 10px; border:1px solid rgba(0,212,255,.18); border-radius:11px; color:#b9ddf2; background:rgba(0,212,255,.055); font:11px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace; word-break:break-all; }
    #searchWrap { padding:14px 16px 10px; display:grid; gap:8px; } #search { width:100%; height:38px; border:1px solid var(--line); border-radius:12px; padding:0 12px; background:rgba(255,255,255,.06); color:var(--text); outline:none; } #listStatus { color:var(--muted); font-size:12px; }
    #projectList { flex:1; overflow:auto; padding:0 12px 14px; } .project { width:100%; display:block; text-align:left; margin:8px 0; border:1px solid var(--line); border-radius:14px; padding:12px; color:var(--text); background:rgba(255,255,255,.045); cursor:pointer; transition:border-color .18s,background .18s,transform .18s; } .project:hover { border-color:rgba(0,212,255,.42); background:rgba(0,212,255,.08); transform:translateY(-1px); } .project.active { border-color:rgba(123,216,143,.78); background:linear-gradient(135deg,rgba(0,212,255,.14),rgba(123,216,143,.08)); } .project strong,.project span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .project strong { font-size:14px; } .project span { margin-top:6px; color:var(--muted); font-size:12px; }
    .meta { display:flex; gap:6px; margin-top:9px; flex-wrap:wrap; } .pill { border:1px solid var(--line); border-radius:999px; padding:3px 7px; color:#c8d7e8; background:rgba(255,255,255,.05); font-size:11px; font-style:normal; }
    #main { min-width:0; display:grid; grid-template-rows:auto minmax(0,1fr) auto; } #topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:16px 18px; border-bottom:1px solid var(--line); background:rgba(3,7,18,.58); backdrop-filter:blur(18px); } #titleBlock { min-width:0; } #title { margin:0; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } #subtitle { margin-top:4px; color:var(--muted); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } #actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
    button,select { height:36px; border-radius:11px; border:1px solid var(--line); padding:0 12px; color:var(--text); background:rgba(255,255,255,.07); font-weight:750; cursor:pointer; } select.compact { width:104px; } select.speed { width:82px; } button.primary { color:#07111f; border-color:transparent; background:linear-gradient(135deg,var(--cyan),var(--green)); } button.warn { color:#07111f; border-color:transparent; background:var(--amber); } button:disabled { opacity:.5; cursor:not-allowed; }
    #projectsToggle { display:none; }
    #stageOuter { min-width:0; min-height:0; display:grid; place-items:center; padding:22px; } #stageOuter.theater { position:fixed; inset:0; z-index:20; padding:26px; background:radial-gradient(circle at 50% 20%,rgba(0,212,255,.16),transparent 36%),rgba(3,7,18,.96); } #stage { position:relative; max-width:100%; max-height:100%; padding:18px; border:1px solid rgba(255,255,255,.12); border-radius:24px; background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)); box-shadow:0 28px 90px rgba(0,0,0,.38); } #stageOuter.theater #stage { padding:0; border-radius:18px; border-color:rgba(0,212,255,.22); background:#000; } canvas { display:block; max-width:min(calc(100vw - 410px),100%); max-height:calc(100vh - 190px); border-radius:14px; background:#000; box-shadow:0 16px 60px rgba(0,0,0,.45); } #stageOuter.fit-width canvas { width:min(calc(100vw - 410px),100%) !important; height:auto !important; } #stageOuter.actual canvas { max-width:none; max-height:none; }
    #status { position:fixed; left:362px; top:78px; z-index:5; max-width:min(720px,calc(100vw - 392px)); padding:10px 12px; border:1px solid rgba(0,212,255,.24); border-radius:12px; background:rgba(3,7,18,.78); color:#cfeeff; font:12px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace; backdrop-filter:blur(16px); } #status.error { border-color:rgba(255,107,107,.5); color:#ffd2d2; }
    #controls { display:grid; grid-template-columns:auto auto minmax(160px,1fr) auto; gap:12px; align-items:center; padding:14px 18px 18px; border-top:1px solid var(--line); background:rgba(3,7,18,.68); } #scrub { width:100%; accent-color:var(--cyan); } #time { color:#dbeafe; font-variant-numeric:tabular-nums; font:700 12px ui-monospace,SFMono-Regular,Consolas,monospace; text-align:right; }
    #debug { position:fixed; top:86px; right:18px; z-index:7; width:min(420px,calc(100vw - 380px)); max-height:calc(100vh - 160px); overflow:auto; padding:14px; border-radius:14px; background:rgba(6,9,14,.9); border:1px solid rgba(121,217,255,.26); color:#dfe9f5; font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace; backdrop-filter:blur(14px); display:none; } #debug.visible { display:block; }
    #exportPanel { position:fixed; right:18px; bottom:82px; z-index:8; width:360px; display:none; padding:14px; border:1px solid var(--line); border-radius:16px; background:rgba(3,7,18,.92); box-shadow:0 24px 80px rgba(0,0,0,.45); backdrop-filter:blur(18px); } #exportPanel.visible { display:block; } #exportPanel h3 { margin:0 0 10px; font-size:15px; } .field { display:grid; grid-template-columns:96px minmax(0,1fr); gap:10px; align-items:center; margin:10px 0; color:var(--muted); font-size:12px; } .field select { width:100%; } #exportResult { margin-top:10px; color:var(--muted); font-size:12px; line-height:1.45; word-break:break-word; }
    #scrim { display:none; }
    @media (max-width:900px) { body { grid-template-columns:1fr; } #sidebar { position:fixed; inset:0 auto 0 0; width:min(360px,calc(100vw - 34px)); transform:translateX(-105%); transition:transform .22s ease; box-shadow:24px 0 80px rgba(0,0,0,.52); } body.projects-open #sidebar { transform:translateX(0); } #scrim { display:block; position:fixed; inset:0; z-index:11; background:rgba(0,0,0,.48); opacity:0; pointer-events:none; transition:opacity .22s ease; } body.projects-open #scrim { opacity:1; pointer-events:auto; } #projectsToggle { display:inline-flex; align-items:center; } #status { left:16px; top:72px; max-width:calc(100vw - 32px); } canvas { max-width:calc(100vw - 64px); } #stageOuter.fit-width canvas { width:calc(100vw - 64px) !important; } #debug { width:calc(100vw - 32px); right:16px; } #controls { grid-template-columns:auto minmax(120px,1fr) auto; } }
  </style>
</head>
<body>
  <aside id="sidebar"><div id="brand"><div class="eyebrow">ui2v studio</div><h1>Project Library</h1><p>Browse local JSON videos, live-reload edits, scrub frames, inspect runtime state, and export MP4 from this page.</p><div id="folder">Folder: loading...</div></div><div id="searchWrap"><input id="search" placeholder="Search JSON projects..."><div id="listStatus">Scanning projects...</div></div><div id="projectList"></div></aside>
  <div id="scrim"></div>
  <main id="main"><div id="topbar"><div id="titleBlock"><h2 id="title">Loading preview...</h2><div id="subtitle">Starting ui2v Studio</div></div><div id="actions"><button id="projectsToggle">Projects</button><button id="debugToggle">Debug</button><select id="fitMode" class="compact"><option value="fit">Fit</option><option value="width">Fit width</option><option value="actual">Actual</option></select><button id="theaterToggle">Theater</button><button id="fullscreenToggle">Fullscreen</button><button id="snapshotFrame">Snapshot</button><button id="copyCommand">Copy render</button><button id="exportOpen" class="primary">Export MP4</button></div></div><div id="stageOuter" class="fit"><div id="stage"><canvas id="previewCanvas"></canvas></div></div><div id="controls"><button id="toggle" class="primary">Play</button><button id="restart">Restart</button><input id="scrub" type="range" min="0" max="1000" value="0"><select id="playbackRate" class="speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select><div id="time">0.00 / 0.00</div></div></main>
  <div id="status">Booting...</div><pre id="debug"></pre>
  <div id="exportPanel"><h3>Export current project</h3><div class="field"><label>Quality</label><select id="exportQuality"><option>high</option><option>ultra</option><option>cinema</option><option>medium</option><option>low</option></select></div><div class="field"><label>Render scale</label><select id="exportScale"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option><option value="4">4x</option></select></div><div class="field"><label>Codec</label><select id="exportCodec"><option value="avc">AVC / H.264</option><option value="hevc">HEVC</option></select></div><button id="exportStart" class="warn">Render MP4</button><div id="exportResult"></div></div>
  <script type="module">
    import { TemplateCanvasAdapter, UivRuntime } from '/engine/index.mjs';
    const canvas=document.getElementById('previewCanvas'),stageOuter=document.getElementById('stageOuter'),statusEl=document.getElementById('status'),titleEl=document.getElementById('title'),subtitleEl=document.getElementById('subtitle'),listEl=document.getElementById('projectList'),searchEl=document.getElementById('search'),listStatus=document.getElementById('listStatus'),folderEl=document.getElementById('folder'),toggle=document.getElementById('toggle'),restart=document.getElementById('restart'),playbackRate=document.getElementById('playbackRate'),scrub=document.getElementById('scrub'),timeEl=document.getElementById('time'),debugPanel=document.getElementById('debug'),debugToggle=document.getElementById('debugToggle'),fitMode=document.getElementById('fitMode'),theaterToggle=document.getElementById('theaterToggle'),fullscreenToggle=document.getElementById('fullscreenToggle'),exportOpen=document.getElementById('exportOpen'),exportPanel=document.getElementById('exportPanel'),exportStart=document.getElementById('exportStart'),snapshotFrame=document.getElementById('snapshotFrame'),copyCommand=document.getElementById('copyCommand'),exportResult=document.getElementById('exportResult'),projectsToggle=document.getElementById('projectsToggle'),scrim=document.getElementById('scrim');
    let runtime,adapter,raf=0,startTime=0,pausedAt=0,currentSecond=0,duration=0,playing=false,debugVisible=false,currentPath='',currentProjectId='',projects=[],lastState=null,stateTimer=0,reloadInFlight=false,lastSuccessfulLoad=0;
    function setStatus(text,error=false){statusEl.textContent=text;statusEl.className=error?'error':'';}
    function playbackSpeed(){return Number(playbackRate.value)||1;}
    function formatTime(s){return s.toFixed(2)+' / '+duration.toFixed(2)+'s';}
    function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
    function formatResolution(r){return r&&r.width&&r.height?r.width+'x'+r.height:'?';}
    function closeProjects(){document.body.classList.remove('projects-open');}
    function openProjects(){document.body.classList.add('projects-open');}
    async function renderAt(second){if(!runtime)return;currentSecond=Math.max(0,Math.min(duration,second));await runtime.seek(currentSecond);scrub.value=duration?String(Math.round((currentSecond/duration)*1000)):'0';timeEl.textContent=formatTime(currentSecond);if(debugVisible){const frame=runtime.getCurrentFrame?.();debugPanel.textContent=JSON.stringify(frame||{time:currentSecond},null,2);}}
    function tick(){if(!playing||!runtime)return;const elapsed=((performance.now()-startTime)/1000)*playbackSpeed();if(elapsed>=duration){playing=false;toggle.textContent='Play';renderAt(duration);return;}renderAt(elapsed).catch(error=>setStatus(error&&error.message?error.message:String(error),true));raf=requestAnimationFrame(tick);}
    function renderList(){const q=searchEl.value.trim().toLowerCase();const visible=projects.filter(x=>!q||(x.label+' '+(x.id||'')+' '+(x.name||'')).toLowerCase().includes(q));listEl.innerHTML='';listStatus.textContent=visible.length+' / '+projects.length+' projects';for(const item of visible){const b=document.createElement('button');b.className='project'+(item.path===currentPath?' active':'');b.innerHTML='<strong>'+escapeHtml(item.name||item.id||item.label)+'</strong><span>'+escapeHtml(item.label)+'</span><div class="meta"><em class="pill">'+escapeHtml(String(item.duration||'?'))+'s</em><em class="pill">'+escapeHtml(String(item.fps||'?'))+'fps</em><em class="pill">'+escapeHtml(formatResolution(item.resolution))+'</em></div>';b.onclick=()=>{closeProjects();loadProjectByPath(item.path);};listEl.appendChild(b);}}
    async function refreshProjectList(){const r=await fetch('/preview/projects',{cache:'no-store'});const p=await r.json();projects=p.projects||[];currentPath=p.currentPath||currentPath;folderEl.textContent='Folder: '+(p.root||'unknown');renderList();}
    async function loadProjectByPath(projectPath,{auto=false}={}){if(reloadInFlight)return;reloadInFlight=true;try{setStatus((auto?'Reloading ':'Loading ')+projectPath+'...');const r=await fetch('/preview/load?path='+encodeURIComponent(projectPath),{cache:'no-store'});const p=await r.json().catch(()=>null);if(!r.ok)throw new Error((p&&p.error)||('HTTP '+r.status));await window.__ui2vPreview(p.project,p.options,p.sourcePath,{auto});lastSuccessfulLoad=Date.now();await refreshPreviewState();}catch(error){console.error(error);setStatus((auto?'Waiting for valid JSON: ':'')+(error&&error.message?error.message:String(error)),true);}finally{reloadInFlight=false;}}
    async function fetchPreviewState(){if(!currentPath)return null;const r=await fetch('/preview/state?path='+encodeURIComponent(currentPath),{cache:'no-store'});const state=await r.json();if(!r.ok)throw new Error(state&&state.error?state.error:'Unable to read preview state');return state;} async function refreshPreviewState(){lastState=await fetchPreviewState();return lastState;}
    async function pollPreviewState(){if(!currentPath||reloadInFlight)return;try{const previous=lastState;const state=await fetchPreviewState();if(!state)return;if(previous&&(state.projectListVersion!==previous.projectListVersion||state.projectCount!==previous.projectCount)){await refreshProjectList();}if(previous&&(state.currentMtimeMs!==previous.currentMtimeMs||state.currentSize!==previous.currentSize)){lastState=state;if(Date.now()-lastSuccessfulLoad>350){await loadProjectByPath(currentPath,{auto:true});}return;}lastState=state;}catch(error){setStatus(error&&error.message?error.message:String(error),true);}}
    function startStatePolling(){clearInterval(stateTimer);stateTimer=setInterval(pollPreviewState,800);}
    window.__ui2vPreview=async(project,options,sourcePath,loadOptions={})=>{try{cancelAnimationFrame(raf);if(adapter&&typeof adapter.dispose==='function')adapter.dispose();const pixelRatio=Math.max(1,Math.min(4,Number(options.pixelRatio)||2));canvas.width=Math.round(options.width*pixelRatio);canvas.height=Math.round(options.height*pixelRatio);canvas.style.width=options.width+'px';canvas.style.height=options.height+'px';canvas.style.aspectRatio=options.width+' / '+options.height;duration=options.duration;currentPath=sourcePath||currentPath;currentProjectId=project.id||project.name||'project';const normalized={...project,fps:options.fps,resolution:{width:options.width,height:options.height}};adapter=new TemplateCanvasAdapter({canvas,pixelRatio,enablePerformanceMonitoring:false,enableAutoQualityAdjust:false});runtime=new UivRuntime(normalized);await runtime.initializeAdapter(adapter);await renderAt(loadOptions.auto?Math.min(currentSecond,duration):0);startTime=performance.now()-(currentSecond/playbackSpeed())*1000;playing=true;toggle.textContent='Pause';titleEl.textContent=normalized.name||normalized.id||'ui2v preview';subtitleEl.textContent=(currentPath||'attached project')+' - '+options.width+'x'+options.height+' - '+options.fps+'fps - '+duration+'s';setStatus((loadOptions.auto?'Live reloaded: ':'Preview ready: ')+(normalized.id||'project'));renderList();tick();}catch(error){console.error(error);setStatus(error&&error.message?error.message:String(error),true);throw error;}};
    async function loadAttachedProject(){try{setStatus('Loading project...');await refreshProjectList();const r=await fetch('/project.json',{cache:'no-store'});if(!r.ok)throw new Error('Unable to load /project.json: HTTP '+r.status);const p=await r.json();await window.__ui2vPreview(p.project,p.options,p.sourcePath);await refreshPreviewState();startStatePolling();}catch(error){console.error(error);setStatus(error&&error.message?error.message:String(error),true);}}
    toggle.onclick=()=>{if(!runtime)return;if(playing){playing=false;cancelAnimationFrame(raf);pausedAt=currentSecond;toggle.textContent='Play';}else{playing=true;startTime=performance.now()-(pausedAt/playbackSpeed())*1000;toggle.textContent='Pause';tick();}}; restart.onclick=async()=>{if(!runtime)return;await seekSeconds(0);if(!playing){playing=true;toggle.textContent='Pause';tick();}}; async function seekSeconds(second){playing=false;cancelAnimationFrame(raf);pausedAt=second;toggle.textContent='Play';await renderAt(second);} scrub.oninput=()=>{if(!runtime)return;seekSeconds((Number(scrub.value)/1000)*duration);}; playbackRate.onchange=()=>{startTime=performance.now()-(currentSecond/playbackSpeed())*1000;}; searchEl.oninput=renderList; debugToggle.onclick=()=>{debugVisible=!debugVisible;debugPanel.className=debugVisible?'visible':'';}; fitMode.onchange=()=>{stageOuter.classList.toggle('fit-width',fitMode.value==='width');stageOuter.classList.toggle('actual',fitMode.value==='actual');}; theaterToggle.onclick=()=>{stageOuter.classList.toggle('theater');theaterToggle.textContent=stageOuter.classList.contains('theater')?'Exit theater':'Theater';}; fullscreenToggle.onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await stageOuter.requestFullscreen();}}catch(error){setStatus(error&&error.message?error.message:String(error),true);}}; projectsToggle.onclick=()=>document.body.classList.toggle('projects-open'); scrim.onclick=closeProjects; document.addEventListener('fullscreenchange',()=>{fullscreenToggle.textContent=document.fullscreenElement?'Exit full':'Fullscreen';}); document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='d')debugToggle.click();if(e.key.toLowerCase()==='f')fullscreenToggle.click();if(e.key.toLowerCase()==='t')theaterToggle.click();if(e.key.toLowerCase()==='p')projectsToggle.click();if(e.key.toLowerCase()==='r'&&currentPath)loadProjectByPath(currentPath);if(e.key==='Escape'){closeProjects();if(stageOuter.classList.contains('theater'))theaterToggle.click();}if(e.code==='Space'){e.preventDefault();toggle.click();}}); exportOpen.onclick=()=>exportPanel.classList.toggle('visible'); snapshotFrame.onclick=downloadCanvas; copyCommand.onclick=copyRenderCommand;
    function downloadCanvas(){const a=document.createElement('a');a.download=(currentProjectId||'ui2v-preview')+'-'+currentSecond.toFixed(2)+'.png';a.href=canvas.toDataURL('image/png');a.click();}
    async function copyRenderCommand(){const command='ui2v render '+(currentPath||'animation.json')+' -o .tmp/examples/'+(currentProjectId||'ui2v-preview')+'.mp4 --quality high';try{await navigator.clipboard.writeText(command);setStatus('Copied render command');}catch{setStatus(command);}}
    exportStart.onclick=async()=>{if(!currentPath)return;exportStart.disabled=true;exportResult.textContent='Rendering MP4... keep this preview server running.';try{const r=await fetch('/preview/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:currentPath,quality:document.getElementById('exportQuality').value,renderScale:document.getElementById('exportScale').value,codec:document.getElementById('exportCodec').value})});const result=await r.json();if(!r.ok||!result.success)throw new Error(result.error||'Export failed');exportResult.textContent='Exported: '+result.outputPath+' ('+(Math.round(((result.fileSize||0)/1024/1024)*10)/10)+' MB)';}catch(error){exportResult.textContent=error&&error.message?error.message:String(error);}finally{exportStart.disabled=false;}};
    loadAttachedProject();
  </script>
</body>
</html>`;
}

export function resolveRequiredBrowserExecutable(explicitPath?: string): string {
  const normalizedExplicitPath = normalizeExecutablePath(explicitPath);
  if (normalizedExplicitPath) {
    if (fs.existsSync(normalizedExplicitPath)) {
      return normalizedExplicitPath;
    }
    throw new Error(`Browser executable does not exist: ${normalizedExplicitPath}`);
  }

  const resolution = resolveBrowserExecutable();
  if (resolution.executablePath) {
    return resolution.executablePath;
  }

  throw new BrowserExecutableNotFoundError(resolution.searched);
}

export function findBrowserExecutable(): string | undefined {
  return resolveBrowserExecutable().executablePath;
}

export function resolveBrowserExecutable(): BrowserResolutionResult {
  const envNames = [
    'PUPPETEER_EXECUTABLE_PATH',
    'CHROME_PATH',
    'CHROMIUM_PATH',
    'EDGE_PATH',
  ];
  const env: Record<string, string | undefined> = {};
  const searched: string[] = [];

  for (const name of envNames) {
    const value = process.env[name];
    env[name] = value;
    const candidate = normalizeExecutablePath(value);
    if (!candidate) continue;
    searched.push(candidate);
    if (fs.existsSync(candidate)) {
      return { executablePath: candidate, source: name, searched, env };
    }
  }

  const candidates = getBrowserCandidates();
  for (const candidate of candidates) {
    searched.push(candidate);
    if (fs.existsSync(candidate)) {
      return { executablePath: candidate, source: 'auto-detected', searched, env };
    }
  }

  return { searched, env };
}

function formatBrowserExecutableNotFoundMessage(searched: string[]): string {
  const searchedMessage = searched.length > 0
    ? ` Searched ${searched.length} candidate paths.`
    : '';
  return `No local Chrome, Edge, or Chromium executable was found.${searchedMessage} Install a browser or set PUPPETEER_EXECUTABLE_PATH, CHROME_PATH, CHROMIUM_PATH, or EDGE_PATH.`;
}

function normalizeExecutablePath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
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
      path.join(prefix, 'Google', 'Chrome Beta', 'Application', 'chrome.exe'),
      path.join(prefix, 'Google', 'Chrome Dev', 'Application', 'chrome.exe'),
      path.join(prefix, 'Google', 'Chrome SxS', 'Application', 'chrome.exe'),
      path.join(prefix, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(prefix, 'Microsoft', 'Edge Beta', 'Application', 'msedge.exe'),
      path.join(prefix, 'Microsoft', 'Edge Dev', 'Application', 'msedge.exe'),
      path.join(prefix, 'Microsoft', 'Edge SxS', 'Application', 'msedge.exe'),
      path.join(prefix, 'Chromium', 'Application', 'chrome.exe'),
    ]);
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
      '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
      '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }

  const commands = ['google-chrome-stable', 'google-chrome', 'google-chrome-beta', 'google-chrome-unstable', 'chromium-browser', 'chromium', 'microsoft-edge', 'microsoft-edge-beta', 'microsoft-edge-dev'];
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

