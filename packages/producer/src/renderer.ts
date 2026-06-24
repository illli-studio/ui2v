/**
 * Browser-backed renderer for the standalone CLI.
 *
 * The ui2v engine is browser-first: it depends on DOM, Canvas, WebCodecs, and
 * browser ESM loading. The producer owns that browser environment and returns a
 * real file to Node instead of asking the user to click a generated HTML page.
 */

import { parseProject } from '@ui2v/core';
import type { AnimationProject } from '@ui2v/engine';
import { BROWSER_LIBRARY_IMPORT_MAP } from '@ui2v/engine';
export type { AnimationProject } from '@ui2v/engine';
import { getFrameCount, validateRuntimeProject } from '@ui2v/runtime-core';
import {
  applyPreviewTimelineUpdates,
  applyPreviewClipMetadataUpdates,
  assertPreviewProjectSaveable,
  buildPreviewTimeline,
  createPreviewInspectSummary,
  formatPreviewProjectJson,
  lintPreviewProject,
  splitPreviewClip,
  summarizeTimelineLint,
  type PreviewClipMetadataUpdate,
  type PreviewTimelineUpdate,
} from './previewStudio';
import { insertPreviewTemplate, listPreviewTemplates } from './previewTemplates';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as http from 'http';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { execFile, execFileSync } from 'child_process';
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
  sourcePath?: string;
  assetBaseDir?: string;
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
  assetBaseDir?: string;
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

interface ProjectAudioTrack {
  src: string;
  startTime?: number;
  duration?: number;
  volume?: number;
  loop?: boolean;
  trimStart?: number;
  trimEnd?: number;
  fadeIn?: number;
  fadeOut?: number;
}

const IMPORT_MAP: Record<string, string> = {
  '@ui2v/core': '/core/index.mjs',
  '@ui2v/runtime-core': '/runtime-core/index.mjs',
  zod: 'https://esm.sh/zod@3.25.76',
  ...BROWSER_LIBRARY_IMPORT_MAP,
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

    const assetBaseDir = resolveAssetBaseDir(project, options);
    server = await createStaticServer(resolveEngineDistDir(), resolveRuntimeCoreDistDir(), {
      coreDistDir: resolveCoreDistDir(),
      assetBaseDir,
    });
    const assetBaseUrl = `${getServerOrigin(server)}/assets/`;
    project = attachProjectAssetBase(project, assetBaseUrl, assetBaseDir);
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

    await muxAudioTracksWithFfmpegIfNeeded(absoluteOutput, project, normalizePageOptions(project, options).audioTracks, assetBaseDir, diagnostics);
    const finalStat = await fsp.stat(absoluteOutput);
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
      fileSize: finalStat.size,
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
  const assetBaseDir = resolveAssetBaseDir(project, options);
  const assetBaseUrl = options.sourcePath
    ? createPreviewAssetBaseUrl(path.resolve(options.sourcePath))
    : '/assets/';
  const server = await createStaticServer(resolveEngineDistDir(), resolveRuntimeCoreDistDir(), {
    coreDistDir: resolveCoreDistDir(),
    project: attachProjectAssetBase(project, assetBaseUrl, assetBaseDir),
    previewOptions: normalizePreviewOptions(project, options),
    previewOptionOverrides: options,
    previewSourcePath: options.sourcePath,
    assetBaseDir,
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
    audioTracks: collectAudioTracks(project),
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

function resolveAssetBaseDir(project: AnimationProject, options: RenderOptions | PreviewOptions): string | undefined {
  const explicit = (options as any).assetBaseDir ?? (project as any).__assetBaseDir ?? (project as any).assetBaseDir;
  if (typeof explicit === 'string' && explicit.trim()) {
    return path.resolve(explicit);
  }

  const sourcePath = (options as any).sourcePath;
  if (typeof sourcePath === 'string' && sourcePath.trim()) {
    return path.dirname(path.resolve(sourcePath));
  }

  return undefined;
}

function resolveStaticAssetBaseDir(options: StaticServerOptions): string | undefined {
  if (typeof options.assetBaseDir === 'string' && options.assetBaseDir.trim()) {
    return path.resolve(options.assetBaseDir);
  }
  if (typeof options.previewSourcePath === 'string' && options.previewSourcePath.trim()) {
    return path.dirname(path.resolve(options.previewSourcePath));
  }
  return undefined;
}

function createPreviewAssetBaseUrl(projectFile: string): string {
  return `/assets/${encodeURIComponent(path.resolve(projectFile))}/`;
}

function attachProjectAssetBase(project: AnimationProject, assetBaseUrl: string | undefined, assetBaseDir?: string): AnimationProject {
  const normalizedBaseUrl = assetBaseUrl
    ? (assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`)
    : undefined;
  const existingBaseUrl = (project as any).__assetBaseUrl ?? (project as any).assetBaseUrl;
  const baseUrl = normalizedBaseUrl || existingBaseUrl;
  const baseDir = assetBaseDir ?? (project as any).__assetBaseDir ?? (project as any).assetBaseDir;
  return {
    ...project,
    ...(baseUrl ? { assetBaseUrl: baseUrl, __assetBaseUrl: baseUrl } : {}),
    ...(baseDir ? { assetBaseDir: baseDir, __assetBaseDir: baseDir } : {}),
  } as AnimationProject;
}

function collectAudioTracks(project: AnimationProject): ProjectAudioTrack[] {
  const tracks: ProjectAudioTrack[] = [];
  const pushTrack = (candidate: any, fallbackStartTime?: number, fallbackEndTime?: number) => {
    if (!candidate || typeof candidate !== 'object' || typeof candidate.src !== 'string' || !candidate.src.trim()) {
      return;
    }
    const startTime = numberOrUndefined(candidate.startTime) ?? fallbackStartTime;
    const duration = numberOrUndefined(candidate.duration)
      ?? (typeof fallbackEndTime === 'number' && typeof startTime === 'number' ? Math.max(0, fallbackEndTime - startTime) : undefined);
    tracks.push({
      src: candidate.src,
      startTime,
      duration,
      volume: numberOrUndefined(candidate.volume),
      loop: Boolean(candidate.loop),
      trimStart: numberOrUndefined(candidate.trimStart),
      trimEnd: numberOrUndefined(candidate.trimEnd),
      fadeIn: numberOrUndefined(candidate.fadeIn),
      fadeOut: numberOrUndefined(candidate.fadeOut),
    });
  };

  const rootAudio = (project as any).audio;
  if (Array.isArray(rootAudio?.tracks)) {
    for (const track of rootAudio.tracks) {
      pushTrack(track);
    }
  }

  const layers = (project as any).template?.layers ?? (project as any).layers;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      if (layer?.type !== 'audio-layer') continue;
      pushTrack(layer.properties, numberOrUndefined(layer.startTime), numberOrUndefined(layer.endTime));
    }
  }

  return tracks;
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function muxAudioTracksWithFfmpegIfNeeded(
  outputPath: string,
  project: AnimationProject,
  tracks: ProjectAudioTrack[],
  assetBaseDir: string | undefined,
  diagnostics: string[]
): Promise<void> {
  if (!tracks.length || await outputHasAudioStream(outputPath)) {
    return;
  }

  const sourceTrack = tracks.find(track => typeof track.src === 'string' && track.src.trim());
  if (!sourceTrack) {
    return;
  }

  const audioPath = resolveLocalAudioTrackPath(sourceTrack.src, assetBaseDir);
  if (!audioPath) {
    diagnostics.push(`Audio mux skipped because track is not local: ${sourceTrack.src}`);
    return;
  }

  const tempPath = `${outputPath}.audio-${process.pid}-${Date.now()}.mp4`;
  const duration = Math.max(0.001, Number(sourceTrack.duration) || Number(project.duration) || 0.001);
  const audioFilters: string[] = [];
  const volume = Number.isFinite(sourceTrack.volume as number) ? Math.max(0, sourceTrack.volume as number) : 1;
  if (volume !== 1) {
    audioFilters.push(`volume=${volume}`);
  }
  const fadeIn = Math.max(0, Number(sourceTrack.fadeIn) || 0);
  const fadeOut = Math.max(0, Number(sourceTrack.fadeOut) || 0);
  if (fadeIn > 0) {
    audioFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
  }
  if (fadeOut > 0) {
    audioFilters.push(`afade=t=out:st=${Math.max(0, duration - fadeOut)}:d=${fadeOut}`);
  }

  const args = [
    '-y',
    '-i', outputPath,
    ...(sourceTrack.loop ? ['-stream_loop', '-1'] : []),
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-t', String(duration),
    ...(audioFilters.length ? ['-af', audioFilters.join(',')] : []),
    '-avoid_negative_ts', 'make_zero',
    '-movflags', '+faststart',
    tempPath,
  ];

  try {
    await execFileAsync('ffmpeg', args);
    await fsp.rm(outputPath, { force: true });
    await fsp.rename(tempPath, outputPath);
  } catch (error) {
    await fsp.rm(tempPath, { force: true }).catch(() => {});
    diagnostics.push(`Audio mux skipped because ffmpeg failed: ${(error as Error).message}`);
  }
}

function resolveLocalAudioTrackPath(src: string, assetBaseDir: string | undefined): string | undefined {
  if (/^file:/i.test(src)) {
    return path.normalize(new URL(src).pathname);
  }

  if (/^(?:https?:|data:|blob:)/i.test(src)) {
    return undefined;
  }

  const normalized = src.replace(/\\/g, path.sep).replace(/^\.?[\\/]/, '');
  const candidate = path.isAbsolute(normalized)
    ? normalized
    : assetBaseDir
      ? path.resolve(assetBaseDir, normalized)
      : path.resolve(normalized);

  return fs.existsSync(candidate) ? candidate : undefined;
}

async function outputHasAudioStream(outputPath: string): Promise<boolean> {
  try {
    const result = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=codec_type',
      '-of', 'csv=p=0',
      outputPath,
    ]);
    return result.stdout.includes('audio');
  } catch {
    return false;
  }
}

function execFileAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
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
  assetBaseDir?: string;
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

      if (url.pathname === '/preview/directories') {
        const requestedPath = url.searchParams.get('path');
        sendJson(res, await createPreviewDirectoryList(requestedPath, options));
        return;
      }

      if (url.pathname === '/preview/load') {
        const requestedPath = url.searchParams.get('path');
        const projectFile = resolvePreviewProjectPath(requestedPath, options);
        const assetBaseDir = path.dirname(projectFile);
        const project = attachProjectAssetBase(await readPreviewProject(projectFile), createPreviewAssetBaseUrl(projectFile), assetBaseDir);
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
        const assetBaseDir = path.dirname(projectFile);
        const previewOptions = normalizePreviewOptions(project, options.previewOptionOverrides ?? {});
        const outputPath = resolvePreviewExportPath(projectFile, project, options, body?.outputPath);
        const result = await renderToFile(project, outputPath, {
          quality: body?.quality === 'ultra' || body?.quality === 'cinema' || body?.quality === 'medium' || body?.quality === 'low' ? body.quality : 'high',
          fps: previewOptions.fps,
          width: previewOptions.width,
          height: previewOptions.height,
          renderScale: body?.renderScale ? Number(body.renderScale) : 1,
          codec: body?.codec === 'hevc' ? 'hevc' : 'avc',
          sourcePath: projectFile,
          assetBaseDir,
        });
        sendJson(res, { ...result, outputPath });
        return;
      }

      if (url.pathname === '/preview/timeline') {
        const projectFile = resolvePreviewProjectPath(url.searchParams.get('path'), options);
        const project = await readPreviewProject(projectFile);
        sendJson(res, buildPreviewTimeline(project));
        return;
      }

      if (url.pathname === '/preview/lint') {
        const projectFile = resolvePreviewProjectPath(url.searchParams.get('path'), options);
        const project = await readPreviewProject(projectFile);
        const timeline = lintPreviewProject(project);
        sendJson(res, {
          ...timeline,
          ...summarizeTimelineLint(timeline.lint),
        });
        return;
      }

      if (url.pathname === '/preview/inspect') {
        const projectFile = resolvePreviewProjectPath(url.searchParams.get('path'), options);
        const project = await readPreviewProject(projectFile);
        const time = Number(url.searchParams.get('time') || '0');
        sendJson(res, createPreviewInspectSummary(project, time));
        return;
      }

      if (url.pathname === '/preview/patch' && req.method === 'POST') {
        const body = await readRequestJson(req);
        sendJson(res, await applyPreviewProjectMutation(body, options, project => {
          const updates = normalizePreviewTimelineUpdates(body?.updates);
          const mode = body?.mode === 'ripple' ? 'ripple' : 'overwrite';
          return applyPreviewTimelineUpdates(project, updates, { mode });
        }));
        return;
      }

      if (url.pathname === '/preview/split' && req.method === 'POST') {
        const body = await readRequestJson(req);
        sendJson(res, await applyPreviewProjectMutation(body, options, project => {
          if (typeof body?.id !== 'string' || !body.id.trim()) {
            throw new Error('Split request requires clip id');
          }
          if (body?.kind !== 'segment' && body?.kind !== 'layer') {
            throw new Error('Split request requires clip kind');
          }
          const time = Number(body?.time);
          if (!Number.isFinite(time)) {
            throw new Error('Split request requires a numeric time');
          }
          return splitPreviewClip(project, {
            id: body.id.trim(),
            kind: body.kind,
            time,
          });
        }));
        return;
      }

      if (url.pathname === '/preview/metadata' && req.method === 'POST') {
        const body = await readRequestJson(req);
        sendJson(res, await applyPreviewProjectMutation(body, options, project => {
          const updates = normalizePreviewMetadataUpdates(body?.updates);
          return applyPreviewClipMetadataUpdates(project, updates);
        }));
        return;
      }

      if (url.pathname === '/preview/source') {
        const projectFile = resolvePreviewProjectPath(url.searchParams.get('path'), options);
        const json = formatPreviewProjectJson(JSON.parse(stripUtf8Bom(await fsp.readFile(projectFile, 'utf8'))));
        sendJson(res, { path: projectFile, json });
        return;
      }

      if (url.pathname === '/preview/templates') {
        const root = resolvePreviewWorkspaceRoot(options);
        const schema = url.searchParams.get('schema');
        let templates = listPreviewTemplates(root);
        if (schema === 'template' || schema === 'uiv-runtime') {
          templates = templates.filter(item => item.compatibleSchemas.includes(schema));
        }
        sendJson(res, { templates });
        return;
      }

      if (url.pathname === '/preview/insert-template' && req.method === 'POST') {
        const body = await readRequestJson(req);
        const projectFile = resolvePreviewProjectPath(body?.path, options);
        const project = stripPreviewTransportFields(await readPreviewProject(projectFile));
        const root = resolvePreviewWorkspaceRoot(options);
        if (typeof body?.templateId !== 'string' || !body.templateId.trim()) {
          throw new Error('Insert request requires templateId');
        }
        const inserted = insertPreviewTemplate(project, {
          templateId: body.templateId.trim(),
          startTime: body.startTime != null ? Number(body.startTime) : undefined,
          duration: body.duration != null ? Number(body.duration) : undefined,
        }, root);
        assertPreviewProjectSaveable(inserted.project);
        await fsp.writeFile(projectFile, formatPreviewProjectJson(inserted.project), 'utf8');
        const assetBaseDir = path.dirname(projectFile);
        sendJson(res, {
          success: true,
          path: projectFile,
          insertedId: inserted.insertedId,
          startTime: inserted.startTime,
          endTime: inserted.endTime,
          json: formatPreviewProjectJson(inserted.project),
          timeline: buildPreviewTimeline(inserted.project),
          project: attachProjectAssetBase(inserted.project, createPreviewAssetBaseUrl(projectFile), assetBaseDir),
        });
        return;
      }

      if (url.pathname === '/preview/save-project' && req.method === 'POST') {
        const body = await readRequestJson(req);
        const projectFile = resolvePreviewProjectPath(body?.path, options);
        const project = typeof body?.project === 'object' && body.project
          ? body.project
          : typeof body?.json === 'string'
            ? JSON.parse(body.json)
            : null;
        if (!project) {
          throw new Error('Save request requires project object or json string');
        }
        const cleaned = stripPreviewTransportFields(project);
        assertPreviewProjectSaveable(cleaned);
        await fsp.writeFile(projectFile, formatPreviewProjectJson(cleaned), 'utf8');
        const assetBaseDir = path.dirname(projectFile);
        sendJson(res, {
          success: true,
          path: projectFile,
          json: formatPreviewProjectJson(cleaned),
          timeline: buildPreviewTimeline(cleaned),
          project: attachProjectAssetBase(cleaned, createPreviewAssetBaseUrl(projectFile), assetBaseDir),
        });
        return;
      }

      if (url.pathname === '/preview/export-download' && req.method === 'POST') {
        const body = await readRequestJson(req);
        const projectFile = resolvePreviewProjectPath(body?.path, options);
        const project = await readPreviewProject(projectFile);
        const assetBaseDir = path.dirname(projectFile);
        const previewOptions = normalizePreviewOptions(project, options.previewOptionOverrides ?? {});
        const tempOutput = resolvePreviewExportPath(projectFile, project, options);
        const result = await renderToFile(project, tempOutput, {
          quality: body?.quality === 'ultra' || body?.quality === 'cinema' || body?.quality === 'medium' || body?.quality === 'low' ? body.quality : 'high',
          fps: previewOptions.fps,
          width: previewOptions.width,
          height: previewOptions.height,
          renderScale: body?.renderScale ? Number(body.renderScale) : 1,
          codec: body?.codec === 'hevc' ? 'hevc' : 'avc',
          sourcePath: projectFile,
          assetBaseDir,
        });
        if (!result.success) {
          res.writeHead(500, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'access-control-allow-origin': '*',
          });
          res.end(JSON.stringify(result));
          return;
        }
        const fileName = sanitizeFileName(String((project as any).id || path.basename(projectFile, '.json'))) + '.mp4';
        const buffer = await fsp.readFile(tempOutput);
        await fsp.rm(tempOutput, { force: true }).catch(() => {});
        sendBinary(res, buffer, 'video/mp4', fileName);
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

      if (url.pathname.startsWith('/assets/')) {
        await serveAssetFile(url, res, options);
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

function sendBinary(res: http.ServerResponse, buffer: Buffer, contentType: string, fileName: string): void {
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': String(buffer.length),
    'content-disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(buffer);
}

async function serveAssetFile(url: URL, res: http.ServerResponse, options: StaticServerOptions): Promise<void> {
  const { baseDir, relativePath } = resolveAssetRequest(url, options);
  if (!baseDir) {
    res.writeHead(404);
    res.end('No asset base directory configured');
    return;
  }

  const assetPath = path.resolve(baseDir, relativePath);
  if (!isPathInside(baseDir, assetPath) || !fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    res.writeHead(404);
    res.end('Asset not found');
    return;
  }

  const buffer = await fsp.readFile(assetPath);
  res.writeHead(200, {
    'content-type': getAssetContentType(assetPath),
    'content-length': String(buffer.length),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'accept-ranges': 'bytes',
  });
  res.end(buffer);
}

function resolveAssetRequest(url: URL, options: StaticServerOptions): { baseDir: string | undefined; relativePath: string } {
  const rawPath = url.pathname.slice('/assets/'.length);
  const slashIndex = rawPath.indexOf('/');
  if (slashIndex > 0) {
    const encodedProjectFile = rawPath.slice(0, slashIndex);
    const relativePath = decodeURIComponent(rawPath.slice(slashIndex + 1));
    try {
      const projectFile = path.resolve(decodeURIComponent(encodedProjectFile));
      const root = resolvePreviewWorkspaceRoot(options);
      if (isPathInside(root, projectFile)) {
        return { baseDir: path.dirname(projectFile), relativePath };
      }
    } catch {
      // Fall through to the server-level asset directory.
    }
  }

  return {
    baseDir: resolveStaticAssetBaseDir(options),
    relativePath: decodeURIComponent(rawPath),
  };
}

function getAssetContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.mp4':
    case '.m4v': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.mov': return 'video/quicktime';
    case '.mp3': return 'audio/mpeg';
    case '.m4a': return 'audio/mp4';
    case '.aac': return 'audio/aac';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
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
        title: project?.title,
        description: project?.description,
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

async function createPreviewDirectoryList(requestedPath: unknown, options: StaticServerOptions) {
  const root = resolvePreviewWorkspaceRoot(options);
  const current = resolvePreviewDirectoryPath(requestedPath, options);
  const entries = await fsp.readdir(current, { withFileTypes: true });
  const directories = entries
    .filter(entry => entry.isDirectory() && !isHiddenPreviewSystemDirectory(entry.name))
    .map(entry => {
      const fullPath = path.join(current, entry.name);
      return {
        name: entry.name,
        path: fullPath,
        label: path.relative(root, fullPath).replace(/\\/g, '/') || '.',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const parent = current === root ? null : path.dirname(current);

  return {
    root,
    current,
    currentLabel: path.relative(root, current).replace(/\\/g, '/') || '.',
    parent: parent && isPathInside(root, parent) ? parent : null,
    directories,
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
    if (isIgnoredPreviewProjectDirectory(entry.name)) {
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

function isIgnoredPreviewProjectDirectory(name: string): boolean {
  return name === 'node_modules' || name === '.git' || name === 'dist' || name === 'out' || name === '.tmp';
}

function isHiddenPreviewSystemDirectory(name: string): boolean {
  return name === 'node_modules' || name === '.git';
}

function safeReadProjectSummary(file: string): any | null {
  try {
    const json = JSON.parse(stripUtf8Bom(fs.readFileSync(file, 'utf8')));
    if (json?.schema === 'uiv-runtime') {
      return { id: json.id, title: json.title, description: json.description, name: json.name, duration: json.duration, fps: json.fps, resolution: json.resolution };
    }
    if (json && typeof json === 'object' && typeof json.id === 'string' && Number.isFinite(Number(json.duration))) {
      return { id: json.id, title: json.title, description: json.description, name: json.name, duration: json.duration, fps: json.fps, resolution: json.resolution };
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

function normalizePreviewTimelineUpdates(value: unknown): PreviewTimelineUpdate[] {
  if (!Array.isArray(value)) {
    throw new Error('Timeline patch requires an updates array');
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Timeline update ${index} must be an object`);
    }
    const update = entry as Record<string, unknown>;
    if (update.kind !== 'segment' && update.kind !== 'layer') {
      throw new Error(`Timeline update ${index} has an invalid kind`);
    }
    if (typeof update.id !== 'string' || !update.id.trim()) {
      throw new Error(`Timeline update ${index} requires an id`);
    }
    const normalized: PreviewTimelineUpdate = {
      id: update.id.trim(),
      kind: update.kind,
    };
    if (update.startTime != null) {
      normalized.startTime = Number(update.startTime);
    }
    if (update.endTime != null) {
      normalized.endTime = Number(update.endTime);
    }
    if (normalized.startTime == null && normalized.endTime == null) {
      throw new Error(`Timeline update ${index} must change startTime and/or endTime`);
    }
    return normalized;
  });
}

function normalizePreviewMetadataUpdates(value: unknown): PreviewClipMetadataUpdate[] {
  if (!Array.isArray(value)) {
    throw new Error('Metadata patch requires an updates array');
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Metadata update ${index} must be an object`);
    }
    const update = entry as Record<string, unknown>;
    if (update.kind !== 'segment' && update.kind !== 'layer') {
      throw new Error(`Metadata update ${index} has an invalid kind`);
    }
    if (typeof update.id !== 'string' || !update.id.trim()) {
      throw new Error(`Metadata update ${index} requires an id`);
    }
    const normalized: PreviewClipMetadataUpdate = {
      id: update.id.trim(),
      kind: update.kind,
    };
    if (update.label != null) {
      normalized.label = String(update.label);
    }
    if (update.dependencies != null) {
      normalized.dependencies = Array.isArray(update.dependencies)
        ? update.dependencies.map(item => String(item))
        : String(update.dependencies)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
    }
    if (normalized.label == null && normalized.dependencies == null) {
      throw new Error(`Metadata update ${index} must change label and/or dependencies`);
    }
    return normalized;
  });
}

async function applyPreviewProjectMutation(
  body: Record<string, unknown>,
  options: StaticServerOptions,
  mutate: (project: AnimationProject) => AnimationProject | any
) {
  const projectFile = resolvePreviewProjectPath(body?.path, options);
  const project = stripPreviewTransportFields(await readPreviewProject(projectFile));
  const next = stripPreviewTransportFields(mutate(project));
  assertPreviewProjectSaveable(next);
  await fsp.writeFile(projectFile, formatPreviewProjectJson(next), 'utf8');
  const assetBaseDir = path.dirname(projectFile);
  return {
    success: true,
    path: projectFile,
    json: formatPreviewProjectJson(next),
    timeline: buildPreviewTimeline(next),
    project: attachProjectAssetBase(next, createPreviewAssetBaseUrl(projectFile), assetBaseDir),
  };
}

function stripPreviewTransportFields(project: any): any {
  const next = structuredClone(project);
  delete next.__assetBaseUrl;
  delete next.assetBaseUrl;
  return next;
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

function resolvePreviewDirectoryPath(requestedPath: unknown, options: StaticServerOptions): string {
  const root = resolvePreviewWorkspaceRoot(options);
  const resolved = typeof requestedPath === 'string' && requestedPath ? path.resolve(requestedPath) : root;
  if (!isPathInside(root, resolved)) {
    throw new Error('Preview directory path must stay inside the workspace root');
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('Preview directory path must be an existing directory');
  }
  return resolved;
}

function resolvePreviewExportPath(projectFile: string, project: AnimationProject, options: StaticServerOptions, requestedPath?: unknown): string {
  const root = resolvePreviewWorkspaceRoot(options);
  if (typeof requestedPath === 'string' && requestedPath.trim()) {
    const resolved = path.resolve(requestedPath.trim());
    if (path.extname(resolved).toLowerCase() !== '.mp4') {
      throw new Error('Preview export path must end with .mp4');
    }
    const parent = path.dirname(resolved);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
      throw new Error('Preview export parent folder must exist');
    }
    return resolved;
  }

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

function resolveBrowserMediaUrl(src: string, assetBaseUrl?: string): string {
  if (/^(?:https?:|data:|blob:|file:)/i.test(src)) {
    return src;
  }
  if (!assetBaseUrl) {
    return src;
  }
  const base = assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`;
  return new URL(src.replace(/\\/g, '/').replace(/^\.?\//, ''), base).toString();
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

    const resolveBrowserMediaUrl = (src, assetBaseUrl) => {
      if (!src || typeof src !== 'string') return src;
      if (/^(?:https?:|data:|blob:|file:)/i.test(src)) return src;
      if (!assetBaseUrl) return src;
      const base = assetBaseUrl.endsWith('/') ? assetBaseUrl : assetBaseUrl + '/';
      return new URL(src.replace(/\\\\/g, '/').replace(/^\\.?\\//, ''), base).toString();
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
            audioTracks: [],
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
  <title>ui2v Studio</title>
  <link rel="icon" href="data:,">
  <script type="importmap">${JSON.stringify({ imports: IMPORT_MAP })}</script>
  <style>
    :root { color-scheme: dark; --bg:#08090b; --surface:#11141a; --panel:#151922; --panel-2:#0f1218; --line:rgba(255,255,255,.12); --text:#f5f7fb; --muted:#9aa4b2; --accent:#48c7ff; --ok:#7dd3a7; --danger:#ff7474; }
    * { box-sizing:border-box; }
    html, body { margin:0; width:100%; height:100%; overflow:hidden; background:var(--bg); color:var(--text); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { width:100vw; height:100vh; height:100dvh; display:grid; grid-template-columns:clamp(260px, 18.75vw, 384px) minmax(0,1fr); grid-template-rows:minmax(0,1fr); }
    #sidebar { min-width:0; min-height:0; display:grid; grid-template-rows:auto auto minmax(0,1fr); border-right:1px solid var(--line); background:var(--panel-2); }
    #brand { padding:16px 14px 12px; border-bottom:1px solid var(--line); }
    #brand h1 { margin:0; font-size:17px; line-height:1.2; font-weight:780; }
    #brand p { margin:6px 0 0; color:var(--muted); font:11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #searchWrap { padding:10px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.02); }
    #search { width:100%; height:36px; border:1px solid var(--line); border-radius:7px; padding:0 10px; outline:none; color:var(--text); background:rgba(255,255,255,.06); }
    #listStatus { margin-top:8px; color:var(--muted); font:11px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; }
    #projectList { min-height:0; overflow:auto; padding:0; }
    .project { width:100%; height:42px; display:grid; grid-template-columns:minmax(0,1fr) 42px 88px; grid-template-rows:18px 15px; column-gap:8px; row-gap:1px; align-items:center; justify-items:start; margin:0; padding:4px 10px 4px 12px; border:0; border-left:3px solid transparent; border-bottom:1px solid rgba(255,255,255,.045); color:var(--text); background:transparent; text-align:left; cursor:pointer; overflow:hidden; }
    .project:hover { background:rgba(255,255,255,.04); }
    .project.active { border-left-color:var(--accent); background:rgba(72,199,255,.1); }
    .project strong, .project span { display:block; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .project strong { grid-column:1; grid-row:1; font-size:13px; line-height:18px; font-weight:690; }
    .project span { grid-column:1; grid-row:2; color:var(--muted); font-size:11px; line-height:16px; }
    .projectRatio { grid-column:2; grid-row:1 / span 2; justify-self:start; color:#c7d2df; font:10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; }
    .projectSize { grid-column:3; grid-row:1 / span 2; justify-self:start; color:#c7d2df; font:10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; }
    #workspace { width:100%; height:100%; min-width:0; min-height:0; display:grid; grid-template-rows:minmax(72px, auto) minmax(0,1fr) minmax(180px, auto) minmax(56px, auto); background:var(--surface); }
    #topbar { width:100%; min-width:0; display:grid; grid-template-columns:minmax(0,1fr) auto minmax(180px, 320px); align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--line); background:var(--panel); }
    #identity { min-width:0; }
    #title { margin:0; font-size:15px; line-height:1.2; font-weight:760; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #subtitle { margin-top:4px; color:var(--muted); font:11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #status { min-width:0; max-width:100%; padding:8px 10px; border:1px solid rgba(72,199,255,.28); border-radius:7px; color:#d8f3ff; background:rgba(72,199,255,.07); font:11px/1.25 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #status.error { color:#ffdada; border-color:rgba(255,116,116,.5); }
    #topActions { display:flex; gap:8px; align-items:center; }
    #stage { width:100%; height:100%; min-width:0; min-height:0; display:grid; place-items:center; padding:0; background:#090b0f; overflow:hidden; }
    #stageInner { width:100%; height:100%; min-width:0; min-height:0; display:grid; place-items:center; border:0; border-radius:0; background:#0b0d12; overflow:hidden; }
    #stage:fullscreen { padding:0; background:#000; }
    #stage:fullscreen #stageInner { border:0; border-radius:0; }
    #previewCanvas { display:block; width:100%; height:auto; max-width:100%; max-height:100%; aspect-ratio:var(--ui2v-aspect, 16 / 9); background:#000; outline:1px solid rgba(255,255,255,.22); box-shadow:none; }
    #controls { width:100%; min-width:0; min-height:56px; display:grid; grid-template-columns:auto auto auto auto minmax(160px,1fr) auto; gap:10px; align-items:center; padding:9px 14px; border-top:1px solid var(--line); background:var(--panel); }
    #editorPanel { min-width:0; min-height:180px; max-height:340px; display:grid; grid-template-columns:minmax(0,1fr) minmax(240px, 280px) minmax(260px, 360px); border-top:1px solid var(--line); background:var(--panel-2); overflow:hidden; }
    #timelinePanel { min-width:0; min-height:0; overflow:auto; padding:10px 14px 12px; border-right:1px solid var(--line); }
    #timelineHeader { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
    #timelineHeader h2 { margin:0; font-size:12px; font-weight:760; letter-spacing:.02em; text-transform:uppercase; color:#d8e2ef; }
    #timelineActions { display:flex; align-items:center; gap:6px; margin-left:auto; }
    #timelineRippleToggle[aria-pressed="true"] { background:rgba(72,199,255,.18); border-color:rgba(72,199,255,.42); color:#dff6ff; }
    #timelineHint { color:var(--muted); font:10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; }
    #templateStrip { display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:4px; }
    .template-chip { width:auto; min-width:132px; max-width:180px; height:auto; min-height:52px; padding:7px 10px; display:grid; gap:3px; align-content:start; text-align:left; border:1px solid rgba(255,255,255,.1); border-radius:8px; background:rgba(255,255,255,.04); cursor:pointer; }
    .template-chip:hover { border-color:rgba(72,199,255,.42); background:rgba(72,199,255,.1); }
    .template-chip strong { font-size:11px; line-height:1.2; font-weight:760; color:#eef4fb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .template-chip span { font:10px/1.25 ui-monospace, SFMono-Regular, Consolas, monospace; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #timelineTracks { display:flex; flex-direction:column; gap:8px; }
    .timeline-track { display:grid; grid-template-columns:92px minmax(0,1fr); gap:8px; align-items:center; }
    .timeline-track-label { color:var(--muted); font:10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .timeline-track-lane { position:relative; height:34px; border-radius:7px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); overflow:hidden; }
    .timeline-clip { position:absolute; top:4px; height:26px; border-radius:5px; border:1px solid rgba(255,255,255,.18); padding:0 8px; color:#fff; font:700 10px/24px ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:grab; user-select:none; box-shadow:inset 0 1px 0 rgba(255,255,255,.12); }
    .timeline-clip.non-editable { opacity:.55; cursor:default; }
    .timeline-clip.selected { outline:2px solid #fff; outline-offset:1px; z-index:2; }
    .timeline-clip.lint-error { box-shadow:inset 0 0 0 1px rgba(255,116,116,.75); }
    .timeline-clip.lint-warning { box-shadow:inset 0 0 0 1px rgba(250,204,21,.55); }
    .timeline-clip.dragging { cursor:grabbing; opacity:.92; }
    #timelineLint { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
    #timelineLint:empty { display:none; }
    .timeline-lint-chip { width:auto; min-height:24px; padding:4px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:#dbe4ee; font:10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; cursor:pointer; }
    .timeline-lint-chip.warning { color:#fde68a; border-color:rgba(250,204,21,.22); }
    .timeline-lint-chip.error { color:#fecaca; border-color:rgba(255,116,116,.24); }
    #timelineSummary { color:var(--muted); font:10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; }
    .timeline-handle { position:absolute; top:0; width:8px; height:100%; cursor:ew-resize; }
    .timeline-handle.left { left:0; border-radius:5px 0 0 5px; }
    .timeline-handle.right { right:0; border-radius:0 5px 5px 0; }
    .timeline-playhead { position:absolute; top:0; width:2px; height:100%; background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,.35); pointer-events:none; z-index:3; }
    #inspectPanel { min-width:0; min-height:0; overflow:auto; padding:10px 12px; border-right:1px solid var(--line); }
    #inspectPanel h2, #jsonPanel h2 { margin:0 0 8px; font-size:12px; font-weight:760; letter-spacing:.02em; text-transform:uppercase; color:#d8e2ef; }
    #clipForm { display:grid; gap:8px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,.08); }
    #clipForm label { display:grid; gap:4px; font:10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; color:var(--muted); }
    #clipForm input { width:100%; height:30px; border:1px solid var(--line); border-radius:6px; padding:0 8px; color:var(--text); background:rgba(255,255,255,.05); font:11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
    #clipForm .clip-times { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .panelActions { display:flex; flex-wrap:wrap; gap:6px; }
    .panelActions .textButton { min-width:64px; height:30px; padding:0 10px; font-size:11px; }
    #jsonPanel { min-width:0; min-height:0; display:grid; grid-template-rows:auto minmax(0,1fr); padding:10px 12px; overflow:hidden; }
    #jsonHeader { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
    #jsonEditorHost { width:100%; min-height:0; height:100%; border:1px solid var(--line); border-radius:7px; overflow:hidden; background:#0a0d12; }
    #jsonEditorHost .cm-editor { height:100%; outline:none; }
    #jsonEditorHost .cm-editor.cm-focused { border-color:rgba(72,199,255,.44); box-shadow:0 0 0 1px rgba(72,199,255,.18) inset; }
    #inspectBody { display:grid; gap:6px; font:11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; color:#dbe4ee; }
    .inspect-row { display:grid; grid-template-columns:92px minmax(0,1fr); gap:8px; align-items:start; }
    .inspect-row span:first-child { color:var(--muted); }
    #inspectLint { margin-top:8px; display:grid; gap:4px; }
    .inspect-lint { padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,.08); font:10px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .inspect-lint.warning { color:#fde68a; background:rgba(250,204,21,.08); border-color:rgba(250,204,21,.22); }
    .inspect-lint.error { color:#fecaca; background:rgba(255,116,116,.08); border-color:rgba(255,116,116,.24); }
    button { width:38px; height:38px; display:grid; place-items:center; border:1px solid var(--line); border-radius:7px; color:var(--text); background:rgba(255,255,255,.08); cursor:pointer; }
    button:hover { border-color:rgba(72,199,255,.44); background:rgba(72,199,255,.12); }
    button:disabled { opacity:.45; cursor:default; }
    svg { width:18px; height:18px; stroke:currentColor; stroke-width:2.2; fill:none; stroke-linecap:round; stroke-linejoin:round; }
    #toggle.playing svg.play { display:none; }
    #toggle:not(.playing) svg.pause { display:none; }
    #scrub { width:100%; accent-color:var(--accent); }
    #time { color:#eef4fb; font:700 12px/1 ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }
    .textButton { width:auto; min-width:72px; padding:0 12px; font-size:12px; font-weight:760; }
    #exportResult { position:fixed; right:14px; top:58px; z-index:8; max-width:460px; display:none; padding:9px 11px; border:1px solid var(--line); border-radius:7px; color:#d8f3ff; background:#10141b; font:11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-shadow:0 18px 54px rgba(0,0,0,.35); }
    #exportResult.visible { display:block; }
    @media (max-width:980px) {
      body { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); }
      #sidebar { grid-template-columns:minmax(170px, .8fr) minmax(180px, 1fr) minmax(0, 1.5fr); grid-template-rows:auto; border-right:0; border-bottom:1px solid var(--line); }
      #brand { min-width:0; padding:10px 12px; border-right:1px solid var(--line); border-bottom:0; }
      #brand h1 { font-size:15px; }
      #brand p { margin-top:4px; }
      #searchWrap { min-width:0; padding:9px 10px; border-right:1px solid var(--line); border-bottom:0; }
      #listStatus { display:none; }
      #projectList { display:flex; min-width:0; overflow-x:auto; overflow-y:hidden; padding:0; }
      .project { width:260px; min-width:260px; height:54px; grid-template-columns:minmax(0,1fr) 38px 76px; grid-template-rows:21px 18px; border-left:0; border-bottom:0; border-right:1px solid rgba(255,255,255,.055); padding:7px 10px; }
      .project.active { border-left-color:transparent; box-shadow:inset 0 -3px 0 var(--accent); }
      #workspace { min-height:0; }
      #editorPanel { grid-template-columns:1fr; max-height:280px; }
      #inspectPanel, #jsonPanel { display:none; }
      #topbar { grid-template-columns:minmax(0,1fr) auto; }
      #status { grid-column:1 / -1; }
    }
    @media (max-width:640px) {
      #sidebar { grid-template-columns:1fr; grid-template-rows:auto auto auto; max-height:210px; }
      #brand { border-right:0; border-bottom:1px solid var(--line); }
      #searchWrap { border-right:0; border-bottom:1px solid var(--line); }
      #projectList { min-height:54px; }
      #topbar { padding:9px 10px; gap:8px; }
      #subtitle { font-size:10px; }
      #status { padding:7px 9px; }
      #stage { padding:0; }
      #controls { grid-template-columns:auto auto minmax(0,1fr); grid-template-rows:auto auto; gap:8px; padding:8px 10px; }
      #scrub { grid-column:1 / -1; grid-row:2; }
      #time { font-size:11px; justify-self:end; }
      #exportAction { display:none; }
      button { width:36px; height:36px; }
    }
    @media (max-width:420px) {
      .project { width:220px; min-width:220px; grid-template-columns:minmax(0,1fr) 38px; }
      .projectSize { display:none; }
      #topbar { grid-template-columns:minmax(0,1fr) auto; }
      #title { font-size:14px; }
      #controls { grid-template-columns:auto auto minmax(78px,1fr); }
    }
  </style>
</head>
<body>
  <aside id="sidebar">
    <div id="brand"><h1>ui2v Studio</h1><p id="folder">Loading workspace...</p></div>
    <div id="searchWrap"><input id="search" placeholder="Search projects"><div id="listStatus">Scanning projects...</div></div>
    <div id="projectList"></div>
  </aside>
  <main id="workspace">
    <div id="topbar">
      <div id="identity"><h1 id="title">Loading preview</h1><div id="subtitle">Preparing ui2v runtime</div></div>
      <div id="topActions">
        <button id="exportAction" class="textButton" title="Export MP4">Export</button>
        <button id="fullscreen" title="Fullscreen" aria-label="Fullscreen"><svg viewBox="0 0 24 24"><path d="M8 3H3v5"></path><path d="M16 3h5v5"></path><path d="M8 21H3v-5"></path><path d="M16 21h5v-5"></path></svg></button>
      </div>
      <div id="status">Booting...</div>
    </div>
    <section id="stage"><div id="stageInner"><canvas id="previewCanvas" data-ui2v-ready="false"></canvas></div></section>
    <div id="editorPanel">
      <section id="timelinePanel">
        <div id="timelineHeader"><h2>Timeline</h2><div id="timelineSummary"></div><div id="timelineActions"><button id="timelineRippleToggle" class="textButton" type="button" aria-pressed="false" title="Ripple: pack runtime segments edge-to-edge; shift later layers on the same track">Ripple</button></div></div>
        <div id="timelineHint">Insert beats · drag to retime · Ripple packs runtime segments edge-to-edge</div>
        <div id="timelineLint" aria-label="Timeline lint"></div>
        <div id="templateStrip" aria-label="Beat templates"></div>
        <div id="timelineTracks"></div>
      </section>
      <aside id="inspectPanel">
        <h2>Clip</h2>
        <form id="clipForm" onsubmit="return false">
          <label>Label<input id="clipLabel" type="text" placeholder="Segment or layer label"></label>
          <div class="clip-times">
            <label>Start<input id="clipStart" type="text" readonly></label>
            <label>End<input id="clipEnd" type="text" readonly></label>
          </div>
          <label>Dependencies<input id="clipDeps" type="text" placeholder="gsap, d3, THREE"></label>
          <div class="panelActions">
            <button id="saveClipMeta" class="textButton" type="button">Save clip</button>
            <button id="splitClipAction" class="textButton" type="button">Split here</button>
          </div>
        </form>
        <h2>Inspect</h2>
        <div id="inspectBody"></div>
        <div id="inspectLint"></div>
      </aside>
      <aside id="jsonPanel">
        <div id="jsonHeader">
          <h2>Project JSON</h2>
          <div class="panelActions">
            <button id="focusClipJson" class="textButton" type="button">Focus clip</button>
            <button id="formatJson" class="textButton" type="button">Format</button>
            <button id="saveJson" class="textButton" type="button">Save</button>
          </div>
        </div>
        <div id="jsonEditorHost" aria-label="Project JSON editor"></div>
      </aside>
    </div>
    <div id="controls">
      <button id="toggle" title="Play / pause" aria-label="Play / pause">
        <svg class="play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
        <svg class="pause" viewBox="0 0 24 24"><path d="M9 5v14"></path><path d="M15 5v14"></path></svg>
      </button>
      <button id="restart" title="Restart" aria-label="Restart"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v7h7"></path></svg></button>
      <button id="prevFrame" title="Previous frame" aria-label="Previous frame"><svg viewBox="0 0 24 24"><path d="M6 5v14"></path><path d="M18 5v14"></path></svg></button>
      <button id="nextFrame" title="Next frame" aria-label="Next frame"><svg viewBox="0 0 24 24"><path d="M6 5v14"></path><path d="M18 5v14"></path></svg></button>
      <input id="scrub" type="range" min="0" max="1000" value="0" aria-label="Timeline">
      <div id="time">0.00 / 0.00s</div>
    </div>
  </main>
  <div id="exportResult"></div>
  <script type="module">
    import { TemplateCanvasAdapter } from '/engine/index.mjs';
    import { UivRuntime } from '/runtime-core/index.mjs';

    const canvas = document.getElementById('previewCanvas');
    const stage = document.getElementById('stage');
    const stageInner = document.getElementById('stageInner');
    const statusEl = document.getElementById('status');
    const titleEl = document.getElementById('title');
    const subtitleEl = document.getElementById('subtitle');
    const folderEl = document.getElementById('folder');
    const searchEl = document.getElementById('search');
    const listStatus = document.getElementById('listStatus');
    const projectList = document.getElementById('projectList');
    const toggle = document.getElementById('toggle');
    const restart = document.getElementById('restart');
    const scrub = document.getElementById('scrub');
    const timeEl = document.getElementById('time');
    const fullscreen = document.getElementById('fullscreen');
    const exportAction = document.getElementById('exportAction');
    const exportResult = document.getElementById('exportResult');
    const timelineTracks = document.getElementById('timelineTracks');
    const timelineLint = document.getElementById('timelineLint');
    const timelineSummary = document.getElementById('timelineSummary');
    const timelineRippleToggle = document.getElementById('timelineRippleToggle');
    const templateStrip = document.getElementById('templateStrip');
    const inspectBody = document.getElementById('inspectBody');
    const inspectLint = document.getElementById('inspectLint');
    const prevFrame = document.getElementById('prevFrame');
    const nextFrame = document.getElementById('nextFrame');
    const clipLabel = document.getElementById('clipLabel');
    const clipStart = document.getElementById('clipStart');
    const clipEnd = document.getElementById('clipEnd');
    const clipDeps = document.getElementById('clipDeps');
    const saveClipMeta = document.getElementById('saveClipMeta');
    const splitClipAction = document.getElementById('splitClipAction');
    const jsonEditorHost = document.getElementById('jsonEditorHost');
    const formatJson = document.getElementById('formatJson');
    const saveJson = document.getElementById('saveJson');
    const focusClipJson = document.getElementById('focusClipJson');

    let jsonEditorView = null;
    let jsonEditorFallback = null;
    let cmViewModule = null;

    function getJsonText() {
      if (jsonEditorView) return jsonEditorView.state.doc.toString();
      if (jsonEditorFallback) return jsonEditorFallback.value;
      return '';
    }

    function setJsonText(value, options = {}) {
      const next = value || '';
      if (jsonEditorView) {
        const current = jsonEditorView.state.doc.toString();
        if (current !== next) {
          jsonEditorView.dispatch({
            changes: { from: 0, to: jsonEditorView.state.doc.length, insert: next },
          });
        }
      } else if (jsonEditorFallback && jsonEditorFallback.value !== next) {
        jsonEditorFallback.value = next;
      }
      if (options.markDirty) markJsonDirty();
      else jsonDirty = false;
    }

    function ensureJsonFallback() {
      if (jsonEditorFallback || jsonEditorView) return;
      jsonEditorFallback = document.createElement('textarea');
      jsonEditorFallback.spellcheck = false;
      jsonEditorFallback.setAttribute('aria-label', 'Project JSON editor');
      jsonEditorFallback.style.cssText = 'width:100%;height:100%;resize:none;border:0;padding:10px;color:#e7edf5;background:#0a0d12;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none;';
      jsonEditorFallback.addEventListener('input', markJsonDirty);
      jsonEditorHost.appendChild(jsonEditorFallback);
    }

    async function initJsonEditor() {
      ensureJsonFallback();
      try {
        const [{ EditorState }, viewModule, { json }, { defaultKeymap, indentWithTab }, { oneDark }] = await Promise.all([
          import('https://esm.sh/@codemirror/state@6.4.1'),
          import('https://esm.sh/@codemirror/view@6.34.1'),
          import('https://esm.sh/@codemirror/lang-json@6.0.1'),
          import('https://esm.sh/@codemirror/commands@6.6.2'),
          import('https://esm.sh/@codemirror/theme-one-dark@6.1.2'),
        ]);
        const { EditorView, keymap, lineNumbers, highlightActiveLine } = viewModule;
        cmViewModule = viewModule;
        const initial = getJsonText();
        if (jsonEditorFallback) {
          jsonEditorFallback.remove();
          jsonEditorFallback = null;
        }
        jsonEditorView = new EditorView({
          state: EditorState.create({
            doc: initial,
            extensions: [
              lineNumbers(),
              highlightActiveLine(),
              json(),
              oneDark,
              keymap.of([...defaultKeymap, indentWithTab]),
              EditorView.updateListener.of(update => {
                if (update.docChanged) markJsonDirty();
              }),
              EditorView.theme({
                '&': { height: '100%', fontSize: '11px', backgroundColor: '#0a0d12' },
                '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', lineHeight: '1.45' },
                '.cm-content': { caretColor: '#48c7ff' },
                '.cm-gutters': { backgroundColor: '#0a0d12', borderRight: '1px solid rgba(255,255,255,.08)' },
              }),
            ],
          }),
          parent: jsonEditorHost,
        });
      } catch (error) {
        console.warn('CodeMirror unavailable, using textarea fallback:', error);
      }
    }

    initJsonEditor();

    let runtime;
    let adapter;
    let raf = 0;
    let currentSecond = 0;
    let duration = 0;
    let projectFps = 30;
    let startTime = 0;
    let playing = false;
    let currentPath = '';
    let projects = [];
    let lastState = null;
    let stateTimer = 0;
    let reloadInFlight = false;
    let currentProjectId = '';
    let workspaceRoot = '';
    let currentResolution = null;
    let previewAudio = null;
    let timelineModel = null;
    let selectedClipId = '';
    let selectedClipKind = '';
    let inspectTimer = 0;
    let dragState = null;
    let jsonDirty = false;
    let timelineEditMode = localStorage.getItem('ui2v-timeline-mode') === 'ripple' ? 'ripple' : 'overwrite';

    function syncTimelineEditModeUi() {
      if (!timelineRippleToggle) return;
      timelineRippleToggle.setAttribute('aria-pressed', timelineEditMode === 'ripple' ? 'true' : 'false');
      timelineRippleToggle.textContent = timelineEditMode === 'ripple' ? 'Ripple on' : 'Ripple';
    }

    syncTimelineEditModeUi();
    timelineRippleToggle?.addEventListener('click', () => {
      timelineEditMode = timelineEditMode === 'ripple' ? 'overwrite' : 'ripple';
      localStorage.setItem('ui2v-timeline-mode', timelineEditMode);
      syncTimelineEditModeUi();
      setStatus(timelineEditMode === 'ripple' ? 'Ripple edit enabled for this track' : 'Overwrite edit enabled');
    });

    function setStatus(text, error = false) {
      statusEl.textContent = text;
      statusEl.className = error ? 'error' : '';
    }

    function updatePlayState(nextPlaying) {
      playing = nextPlaying;
      toggle.classList.toggle('playing', playing);
    }

    function updateTime() {
      scrub.value = duration ? String(Math.round((currentSecond / duration) * 1000)) : '0';
      const frame = Math.max(0, Math.floor(currentSecond * projectFps));
      const totalFrames = Math.max(0, Math.floor(duration * projectFps));
      timeEl.textContent = currentSecond.toFixed(2) + ' / ' + duration.toFixed(2) + 's · f' + frame + '/' + totalFrames;
      scheduleInspectRefresh();
      renderTimelinePlayhead();
    }

    function snapTime(value) {
      if (!projectFps) return value;
      return Math.round(value * projectFps) / projectFps;
    }

    async function fetchTimelineModel() {
      if (!currentPath) {
        timelineModel = null;
        renderTimelineTracks();
        renderTemplateStrip([]);
        return null;
      }
      const response = await fetch('/preview/timeline?path=' + encodeURIComponent(currentPath), { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load timeline');
      timelineModel = payload;
      projectFps = Number(payload.fps) || projectFps;
      renderTimelineTracks();
      await loadTemplateStrip().catch(() => {});
      return payload;
    }

    async function loadTemplateStrip() {
      if (!currentPath) {
        renderTemplateStrip([]);
        return;
      }
      const schema = timelineModel?.schema;
      const query = schema === 'uiv-runtime' || schema === 'template' ? '?schema=' + encodeURIComponent(schema) : '';
      const response = await fetch('/preview/templates' + query, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load templates');
      renderTemplateStrip(payload.templates || []);
    }

    function renderTemplateStrip(templates) {
      templateStrip.innerHTML = '';
      if (!templates.length) {
        templateStrip.innerHTML = '<div id="timelineHint">No beat templates available for this project schema.</div>';
        return;
      }
      for (const item of templates) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'template-chip';
        button.title = item.description || item.label;
        button.innerHTML = '<strong>+ ' + escapeHtml(item.label) + '</strong><span>' + escapeHtml((item.libraries || []).join(', ') || item.kind) + ' · ' + escapeHtml(String(item.defaultDuration || 2)) + 's</span>';
        button.onclick = () => insertTemplate(item.id);
        templateStrip.appendChild(button);
      }
    }

    async function insertTemplate(templateId) {
      if (!currentPath) return;
      pausePlayback();
      try {
        setStatus('Inserting beat template...');
        const response = await fetch('/preview/insert-template', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: currentPath,
            templateId,
            startTime: currentSecond,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Template insert failed');
        timelineModel = payload.timeline;
        if (!jsonDirty && payload.json) setJsonText(payload.json);
        selectedClipId = payload.insertedId || '';
        selectedClipKind = timelineModel?.schema === 'uiv-runtime' ? 'segment' : 'layer';
        await loadProjectByPath(currentPath, { auto: true });
        await renderAt(Number(payload.startTime) || currentSecond);
        updateSelectedClipForm();
        setStatus('Inserted template at ' + Number(payload.startTime || currentSecond).toFixed(3) + 's');
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    function getClipLint(clipId) {
      return (timelineModel?.lint || []).filter(item => item.clipId === clipId);
    }

    function renderTimelineSummary() {
      const lint = timelineModel?.lint || [];
      const errors = lint.filter(item => item.severity === 'error').length;
      const warnings = lint.filter(item => item.severity === 'warning').length;
      if (!timelineModel) {
        timelineSummary.textContent = '';
        return;
      }
      timelineSummary.textContent = errors
        ? errors + ' error' + (errors === 1 ? '' : 's') + ', ' + warnings + ' warning' + (warnings === 1 ? '' : 's')
        : warnings
          ? warnings + ' warning' + (warnings === 1 ? '' : 's')
          : 'clean';
    }

    function renderTimelineLintBar() {
      timelineLint.innerHTML = '';
      const items = (timelineModel?.lint || []).slice(0, 8);
      for (const item of items) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'timeline-lint-chip ' + item.severity;
        chip.textContent = item.message;
        chip.title = item.message;
        chip.onclick = () => {
          if (item.clipId) {
            selectedClipId = item.clipId;
            const clip = getSelectedClip();
            selectedClipKind = clip?.kind || selectedClipKind;
            renderTimelineTracks();
            updateSelectedClipForm();
          }
          setStatus((item.severity === 'error' ? 'Timeline error: ' : 'Timeline warning: ') + item.message, item.severity === 'error');
        };
        timelineLint.appendChild(chip);
      }
      renderTimelineSummary();
    }

    function renderTimelinePlayhead() {
      for (const lane of timelineTracks.querySelectorAll('.timeline-track-lane')) {
        let playhead = lane.querySelector('.timeline-playhead');
        if (!playhead) {
          playhead = document.createElement('div');
          playhead.className = 'timeline-playhead';
          lane.appendChild(playhead);
        }
        const laneDuration = Number(lane.dataset.duration) || duration || 1;
        const percent = laneDuration ? Math.max(0, Math.min(100, (currentSecond / laneDuration) * 100)) : 0;
        playhead.style.left = 'calc(' + percent + '% - 1px)';
      }
    }

    function renderTimelineTracks() {
      timelineTracks.innerHTML = '';
      if (!timelineModel || !Array.isArray(timelineModel.tracks) || timelineModel.tracks.length === 0) {
        timelineTracks.innerHTML = '<div id="timelineHint">No editable timeline clips in this project yet.</div>';
        inspectLint.innerHTML = '';
        return;
      }
      for (const track of timelineModel.tracks) {
        const row = document.createElement('div');
        row.className = 'timeline-track';
        const label = document.createElement('div');
        label.className = 'timeline-track-label';
        label.textContent = track.label;
        label.title = track.label;
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane';
        lane.dataset.duration = String(timelineModel.duration || duration || 0);
        lane.addEventListener('pointerdown', event => {
          if (event.target !== lane) return;
          pausePlayback();
          const rect = lane.getBoundingClientRect();
          const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
          renderAt((timelineModel.duration || duration) * Math.max(0, Math.min(1, ratio))).catch(error => setStatus(error?.message || String(error), true));
        });
        for (const clip of track.clips || []) {
          lane.appendChild(createTimelineClipElement(clip, timelineModel.duration || duration || 0));
        }
        row.appendChild(label);
        row.appendChild(lane);
        timelineTracks.appendChild(row);
      }
      renderTimelinePlayhead();
      renderTimelineLintBar();
      renderInspectLint(timelineModel.lint || []);
      scheduleCanvasDisplaySize();
    }

    function createTimelineClipElement(clip, totalDuration) {
      const clipLint = getClipLint(clip.id);
      const hasError = clipLint.some(item => item.severity === 'error');
      const hasWarning = clipLint.some(item => item.severity === 'warning');
      const element = document.createElement('div');
      element.className = 'timeline-clip'
        + (clip.editable ? '' : ' non-editable')
        + (clip.id === selectedClipId ? ' selected' : '')
        + (hasError ? ' lint-error' : hasWarning ? ' lint-warning' : '');
      element.style.left = ((clip.startTime / totalDuration) * 100) + '%';
      element.style.width = Math.max(0.8, ((clip.endTime - clip.startTime) / totalDuration) * 100) + '%';
      element.style.background = clip.color || 'rgba(72,199,255,.42)';
      element.title = clip.label + ' · ' + clip.startTime.toFixed(2) + 's → ' + clip.endTime.toFixed(2) + 's';
      element.textContent = clip.label;
      element.dataset.clipId = clip.id;
      element.dataset.clipKind = clip.kind;
      element.dataset.startTime = String(clip.startTime);
      element.dataset.endTime = String(clip.endTime);
      if (clip.editable) {
        const leftHandle = document.createElement('div');
        leftHandle.className = 'timeline-handle left';
        leftHandle.addEventListener('pointerdown', event => beginClipDrag(event, clip, 'trim-start'));
        const rightHandle = document.createElement('div');
        rightHandle.className = 'timeline-handle right';
        rightHandle.addEventListener('pointerdown', event => beginClipDrag(event, clip, 'trim-end'));
        element.appendChild(leftHandle);
        element.appendChild(rightHandle);
        element.addEventListener('pointerdown', event => {
          if (event.target.classList.contains('timeline-handle')) return;
          beginClipDrag(event, clip, 'move');
        });
      }
      element.addEventListener('click', event => {
        event.stopPropagation();
        selectedClipId = clip.id;
        selectedClipKind = clip.kind;
        renderTimelineTracks();
        updateSelectedClipForm();
        refreshInspectPanel().catch(() => {});
      });
      return element;
    }

    function beginClipDrag(event, clip, mode) {
      if (!clip.editable || !timelineModel) return;
      event.preventDefault();
      event.stopPropagation();
      pausePlayback();
      selectedClipId = clip.id;
      const ripple = timelineEditMode === 'ripple';
      const subsequent = [];
      let previousClip = null;
      if (ripple) {
        const track = (timelineModel.tracks || []).find(item => (item.clips || []).some(entry => entry.id === clip.id));
        if (track) {
          const sorted = [...track.clips].sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
          const index = sorted.findIndex(entry => entry.id === clip.id);
          if (clip.kind === 'segment' && index > 0) {
            const previous = sorted[index - 1];
            previousClip = {
              id: previous.id,
              initialStart: previous.startTime,
              initialEnd: previous.endTime,
            };
          }
          for (let j = index + 1; j < sorted.length; j++) {
            subsequent.push({
              id: sorted[j].id,
              initialStart: sorted[j].startTime,
              initialEnd: sorted[j].endTime,
            });
          }
        }
      }
      dragState = {
        clip,
        mode,
        ripple,
        subsequent,
        previousClip,
        startX: event.clientX,
        initialStart: clip.startTime,
        initialEnd: clip.endTime,
        lane: event.currentTarget.closest('.timeline-track-lane') || event.currentTarget.parentElement,
      };
      event.currentTarget.classList.add('dragging');
      window.addEventListener('pointermove', onClipDrag);
      window.addEventListener('pointerup', finishClipDrag, { once: true });
    }

    function previewRippleClips(state, delta, totalDuration) {
      if (!state?.ripple || !state.subsequent?.length || Math.abs(delta) <= 0.0005) return;
      for (const item of state.subsequent) {
        const clipElement = state.lane.querySelector('[data-clip-id="' + item.id + '"]');
        if (!clipElement) continue;
        const nextStart = Math.max(0, item.initialStart + delta);
        const nextEnd = item.initialEnd + delta;
        clipElement.style.left = ((nextStart / totalDuration) * 100) + '%';
        clipElement.style.width = Math.max(0.8, ((nextEnd - nextStart) / totalDuration) * 100) + '%';
      }
    }

    function previewRippleTimelineEdits(state, nextStart, nextEnd, totalDuration) {
      if (!state?.ripple) return;
      const minDuration = 1 / (projectFps || 30);

      if (state.clip.kind === 'segment') {
        if (state.previousClip) {
          const previousElement = state.lane.querySelector('[data-clip-id="' + state.previousClip.id + '"]');
          if (previousElement) {
            const previousEnd = Math.max(state.previousClip.initialStart + minDuration, nextStart);
            previousElement.style.left = ((state.previousClip.initialStart / totalDuration) * 100) + '%';
            previousElement.style.width = Math.max(0.8, ((previousEnd - state.previousClip.initialStart) / totalDuration) * 100) + '%';
          }
        }

        let cursorEnd = nextEnd;
        for (const item of state.subsequent || []) {
          const clipElement = state.lane.querySelector('[data-clip-id="' + item.id + '"]');
          if (!clipElement) continue;
          const clipDuration = Math.max(minDuration, item.initialEnd - item.initialStart);
          const start = cursorEnd;
          const end = start + clipDuration;
          clipElement.style.left = ((start / totalDuration) * 100) + '%';
          clipElement.style.width = Math.max(0.8, ((end - start) / totalDuration) * 100) + '%';
          cursorEnd = end;
        }
        return;
      }

      let rippleDelta = 0;
      if (state.mode === 'trim-end') {
        rippleDelta = nextEnd - state.initialEnd;
      } else {
        rippleDelta = nextStart - state.initialStart;
      }
      previewRippleClips(state, rippleDelta, totalDuration);
    }

    function onClipDrag(event) {
      if (!dragState || !timelineModel) return;
      const laneRect = dragState.lane.getBoundingClientRect();
      const totalDuration = timelineModel.duration || duration || 1;
      const deltaSeconds = laneRect.width ? ((event.clientX - dragState.startX) / laneRect.width) * totalDuration : 0;
      let nextStart = dragState.initialStart;
      let nextEnd = dragState.initialEnd;
      if (dragState.mode === 'move') {
        const clipDuration = dragState.initialEnd - dragState.initialStart;
        nextStart = snapTime(Math.max(0, Math.min(totalDuration - clipDuration, dragState.initialStart + deltaSeconds)));
        nextEnd = nextStart + clipDuration;
      } else if (dragState.mode === 'trim-start') {
        nextStart = snapTime(Math.max(0, Math.min(dragState.initialEnd - (1 / (projectFps || 30)), dragState.initialStart + deltaSeconds)));
      } else {
        nextEnd = snapTime(Math.max(dragState.initialStart + (1 / (projectFps || 30)), Math.min(totalDuration, dragState.initialEnd + deltaSeconds)));
      }
      dragState.previewStart = nextStart;
      dragState.previewEnd = nextEnd;
      const clipElement = dragState.lane.querySelector('[data-clip-id="' + dragState.clip.id + '"]');
      if (clipElement) {
        clipElement.style.left = ((nextStart / totalDuration) * 100) + '%';
        clipElement.style.width = Math.max(0.8, ((nextEnd - nextStart) / totalDuration) * 100) + '%';
        clipElement.textContent = dragState.clip.label;
      }
      previewRippleTimelineEdits(dragState, nextStart, nextEnd, totalDuration);
    }

    async function finishClipDrag() {
      window.removeEventListener('pointermove', onClipDrag);
      const state = dragState;
      dragState = null;
      if (!state || state.previewStart == null || state.previewEnd == null) {
        renderTimelineTracks();
        return;
      }
      const changed = Math.abs(state.previewStart - state.initialStart) > 0.0005 || Math.abs(state.previewEnd - state.initialEnd) > 0.0005;
      if (!changed) {
        renderTimelineTracks();
        return;
      }
      try {
        setStatus('Saving timeline edit...');
        const response = await fetch('/preview/patch', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: currentPath,
            mode: timelineEditMode,
            updates: [{ id: state.clip.id, kind: state.clip.kind, startTime: state.previewStart, endTime: state.previewEnd }],
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Timeline patch failed');
        timelineModel = payload.timeline;
        if (!jsonDirty && payload.json) setJsonText(payload.json);
        await loadProjectByPath(currentPath, { auto: true });
        setStatus('Timeline saved: ' + state.clip.label);
      } catch (error) {
        setStatus(error?.message || String(error), true);
        await fetchTimelineModel();
      }
    }

    function scheduleInspectRefresh() {
      clearTimeout(inspectTimer);
      inspectTimer = setTimeout(() => {
        refreshInspectPanel().catch(() => {});
      }, 120);
    }

    async function refreshInspectPanel() {
      if (!currentPath) {
        inspectBody.innerHTML = '';
        inspectLint.innerHTML = '';
        return;
      }
      const response = await fetch('/preview/inspect?path=' + encodeURIComponent(currentPath) + '&time=' + encodeURIComponent(String(currentSecond)), { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to inspect project');
      const rows = [
        ['Time', payload.time?.toFixed?.(3) + 's'],
        ['Frame', String(payload.frame ?? 0)],
        ['Schema', payload.schema || 'unknown'],
        ['Active segment', payload.activeSegmentLabel || payload.activeSegmentId || '—'],
        ['Active clips', (payload.activeClipIds || []).join(', ') || '—'],
        ['Visible nodes', payload.visibleNodeCount == null ? '—' : String(payload.visibleNodeCount)],
        ['Render items', payload.renderPlanItemCount == null ? '—' : String(payload.renderPlanItemCount)],
        ['Dependencies', (payload.dependencies || []).join(', ') || '—'],
        ['Markers', (payload.markerIds || []).join(', ') || '—'],
      ];
      inspectBody.innerHTML = rows.map(([label, value]) => '<div class="inspect-row"><span>' + escapeHtml(label) + '</span><span>' + escapeHtml(value) + '</span></div>').join('');
      renderInspectLint(payload.lint || timelineModel?.lint || []);
    }

    function renderInspectLint(items) {
      inspectLint.innerHTML = (items || []).slice(0, 6).map(item =>
        '<div class="inspect-lint ' + escapeHtml(item.severity) + '">' + escapeHtml(item.message) + '</div>'
      ).join('');
    }

    function getSelectedClip() {
      if (!timelineModel || !selectedClipId) return null;
      for (const track of timelineModel.tracks || []) {
        const clip = (track.clips || []).find(item => item.id === selectedClipId);
        if (clip) return clip;
      }
      return null;
    }

    function updateSelectedClipForm() {
      const clip = getSelectedClip();
      const editable = Boolean(clip?.editable);
      clipLabel.value = clip?.label || '';
      clipStart.value = clip ? clip.startTime.toFixed(3) + 's' : '';
      clipEnd.value = clip ? clip.endTime.toFixed(3) + 's' : '';
      clipDeps.value = (clip?.dependencies || []).join(', ');
      clipLabel.disabled = !editable;
      clipDeps.disabled = !editable;
      saveClipMeta.disabled = !editable || !currentPath;
      splitClipAction.disabled = !editable || !currentPath;
    }

    async function loadJsonSource(force = false) {
      if (!currentPath || (jsonDirty && !force)) return;
      const response = await fetch('/preview/source?path=' + encodeURIComponent(currentPath), { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load project JSON');
      setJsonText(payload.json || '');
      jsonDirty = false;
    }

    function markJsonDirty() {
      jsonDirty = true;
    }

    async function saveJsonProject() {
      if (!currentPath) return;
      try {
        setStatus('Saving project JSON...');
        const response = await fetch('/preview/save-project', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: currentPath, json: getJsonText() }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'JSON save failed');
        setJsonText(payload.json || getJsonText());
        jsonDirty = false;
        timelineModel = payload.timeline;
        await loadProjectByPath(currentPath, { auto: true });
        setStatus('Project JSON saved');
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    function formatJsonEditor() {
      try {
        setJsonText(JSON.stringify(JSON.parse(getJsonText()), null, 2) + '\\n', { markDirty: true });
      } catch (error) {
        setStatus('JSON format failed: ' + (error?.message || error), true);
      }
    }

    function focusClipInJson() {
      if (!selectedClipId) {
        setStatus('Select a clip to focus in JSON', true);
        return;
      }
      const needle = '"id": "' + selectedClipId + '"';
      const altNeedle = '"id":"' + selectedClipId + '"';
      const source = getJsonText();
      let index = source.indexOf(needle);
      let matchLength = needle.length;
      if (index < 0) {
        index = source.indexOf(altNeedle);
        matchLength = altNeedle.length;
      }
      if (index < 0) {
        setStatus('Clip id not found in JSON: ' + selectedClipId, true);
        return;
      }
      if (jsonEditorView && cmViewModule) {
        jsonEditorView.dispatch({
          selection: { anchor: index, head: index + matchLength },
          effects: cmViewModule.EditorView.scrollIntoView(index, { y: 'center' }),
        });
        jsonEditorView.focus();
        return;
      }
      if (jsonEditorFallback) {
        jsonEditorFallback.focus();
        jsonEditorFallback.setSelectionRange(index, index + matchLength);
      }
    }

    async function saveClipMetadata() {
      const clip = getSelectedClip();
      if (!clip || !currentPath) return;
      try {
        setStatus('Saving clip metadata...');
        const response = await fetch('/preview/metadata', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: currentPath,
            updates: [{
              id: clip.id,
              kind: clip.kind,
              label: clipLabel.value,
              dependencies: clipDeps.value,
            }],
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Clip metadata save failed');
        timelineModel = payload.timeline;
        if (!jsonDirty && payload.json) setJsonText(payload.json);
        await loadProjectByPath(currentPath, { auto: true });
        setStatus('Clip saved: ' + clipLabel.value);
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    async function splitClipAtPlayhead() {
      const clip = getSelectedClip();
      if (!clip || !currentPath) {
        setStatus('Select an editable clip to split', true);
        return;
      }
      if (currentSecond <= clip.startTime + 0.0001 || currentSecond >= clip.endTime - 0.0001) {
        setStatus('Move playhead inside the selected clip before splitting', true);
        return;
      }
      try {
        setStatus('Splitting clip at playhead...');
        const response = await fetch('/preview/split', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: currentPath,
            id: clip.id,
            kind: clip.kind,
            time: currentSecond,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Split failed');
        timelineModel = payload.timeline;
        if (!jsonDirty && payload.json) setJsonText(payload.json);
        selectedClipId = '';
        selectedClipKind = '';
        await loadProjectByPath(currentPath, { auto: true });
        setStatus('Split clip at ' + currentSecond.toFixed(3) + 's');
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    function resolvePreviewMediaUrl(src, assetBaseUrl) {
      if (!src || typeof src !== 'string') return src;
      if (/^(?:https?:|data:|blob:|file:)/i.test(src)) return src;
      if (!assetBaseUrl) return src;
      const base = assetBaseUrl.endsWith('/') ? assetBaseUrl : assetBaseUrl + '/';
      const normalized = src.replace(/\\\\/g, '/').replace(/^\\.?\\//, '');
      if (base.startsWith('/')) {
        return base + normalized;
      }
      return new URL(normalized, base).toString();
    }

    function collectPreviewAudioTracks(project) {
      const tracks = [];
      const pushTrack = (track, startTime, endTime) => {
        if (!track || typeof track.src !== 'string' || !track.src.trim()) return;
        tracks.push({
          src: track.src,
          startTime: Number.isFinite(Number(track.startTime)) ? Number(track.startTime) : (Number(startTime) || 0),
          duration: Number.isFinite(Number(track.duration)) ? Number(track.duration) : Math.max(0, Number(endTime) - Number(startTime) || duration || 0),
          volume: Number.isFinite(Number(track.volume)) ? Number(track.volume) : 1,
          loop: Boolean(track.loop),
        });
      };
      if (Array.isArray(project?.audio?.tracks)) {
        project.audio.tracks.forEach(track => pushTrack(track, track.startTime, project.duration));
      }
      const layers = project?.template?.layers || project?.layers || [];
      if (Array.isArray(layers)) {
        layers.forEach(layer => {
          if (layer?.type === 'audio-layer') pushTrack(layer.properties, layer.startTime, layer.endTime);
        });
      }
      return tracks;
    }

    function stopPreviewAudio() {
      if (!previewAudio) return;
      previewAudio.pause();
      previewAudio.src = '';
      previewAudio.load();
      previewAudio = null;
    }

    function setupPreviewAudio(project) {
      stopPreviewAudio();
      const track = collectPreviewAudioTracks(project)[0];
      if (!track) return;
      previewAudio = new Audio(resolvePreviewMediaUrl(track.src, project.__assetBaseUrl || project.assetBaseUrl));
      previewAudio.preload = 'auto';
      previewAudio.loop = Boolean(track.loop);
      previewAudio.volume = Math.max(0, Math.min(1, Number(track.volume) || 1));
      previewAudio.dataset.startTime = String(track.startTime || 0);
    }

    function syncPreviewAudio(second, shouldPlay) {
      if (!previewAudio) return;
      const local = Math.max(0, second - (Number(previewAudio.dataset.startTime) || 0));
      if (Math.abs(previewAudio.currentTime - local) > 0.25) {
        try { previewAudio.currentTime = local; } catch {}
      }
      if (shouldPlay && previewAudio.paused) {
        previewAudio.play().catch(error => setStatus('Preview ready. Click play again to allow audio: ' + (error?.message || error), true));
      } else if (!shouldPlay && !previewAudio.paused) {
        previewAudio.pause();
      }
    }

    function updateCanvasDisplaySize() {
      if (!currentResolution) return;
      const bounds = stageInner.getBoundingClientRect();
      const width = currentResolution.width;
      const height = currentResolution.height;
      if (!bounds.width || !bounds.height || !width || !height) return;
      const scale = Math.min(bounds.width / width, bounds.height / height);
      const displayWidth = Math.max(1, Math.floor(width * scale));
      const displayHeight = Math.max(1, Math.floor(height * scale));
      canvas.style.setProperty('--ui2v-aspect', width + ' / ' + height);
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
    }

    function scheduleCanvasDisplaySize() {
      updateCanvasDisplaySize();
      requestAnimationFrame(updateCanvasDisplaySize);
    }

    const stageResizeObserver = new ResizeObserver(scheduleCanvasDisplaySize);
    stageResizeObserver.observe(stageInner);

    async function renderAt(second) {
      if (!runtime || !adapter) return;
      currentSecond = Math.max(0, Math.min(duration, second));
      await runtime.renderFrame(currentSecond, adapter);
      syncPreviewAudio(currentSecond, playing);
      updateTime();
    }

    function tick(now) {
      if (!playing || !runtime) return;
      const elapsed = (now - startTime) / 1000;
      if (elapsed >= duration) {
        updatePlayState(false);
        renderAt(duration).catch(error => setStatus(error?.message || String(error), true));
        return;
      }
      renderAt(elapsed)
        .then(() => { raf = requestAnimationFrame(tick); })
        .catch(error => {
          updatePlayState(false);
          setStatus(error?.message || String(error), true);
        });
    }

    function startPlayback(fromSecond = currentSecond) {
      startTime = performance.now() - fromSecond * 1000;
      updatePlayState(true);
      syncPreviewAudio(fromSecond, true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function pausePlayback() {
      updatePlayState(false);
      syncPreviewAudio(currentSecond, false);
      cancelAnimationFrame(raf);
    }

    function formatResolution(resolution) {
      return resolution?.width && resolution?.height ? resolution.width + 'x' + resolution.height : 'unknown';
    }

    function formatAspectRatio(resolution) {
      if (!resolution?.width || !resolution?.height) return '?';
      const width = Number(resolution.width);
      const height = Number(resolution.height);
      const divisor = gcd(width, height);
      return Math.round(width / divisor) + ':' + Math.round(height / divisor);
    }

    function gcd(a, b) {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b) {
        const next = a % b;
        a = b;
        b = next;
      }
      return a || 1;
    }

    function sanitizeFileName(value) {
      return String(value || 'ui2v-preview').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'ui2v-preview';
    }

    function defaultExportFileName() {
      return sanitizeFileName(currentProjectId) + '.mp4';
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    function getProjectTitle(project) {
      return project?.title || project?.name || project?.id || project?.label || 'ui2v preview';
    }

    function getProjectDescription(project) {
      return project?.description || '';
    }

    function renderProjectList() {
      const query = searchEl.value.trim().toLowerCase();
      const visible = projects.filter(item => !query || (item.label + ' ' + (item.title || '') + ' ' + (item.description || '') + ' ' + (item.name || '') + ' ' + (item.id || '')).toLowerCase().includes(query));
      projectList.innerHTML = '';
      listStatus.textContent = visible.length + ' / ' + projects.length + ' projects';
      for (const item of visible) {
        const button = document.createElement('button');
        button.className = 'project' + (item.path === currentPath ? ' active' : '');
        button.innerHTML =
          '<strong>' + escapeHtml(getProjectTitle(item)) + '</strong>' +
          '<span>' + escapeHtml(getProjectDescription(item) || item.label) + '</span>' +
          '<em class="projectRatio">' + escapeHtml(formatAspectRatio(item.resolution)) + '</em>' +
          '<em class="projectSize">' + escapeHtml(formatResolution(item.resolution)) + '</em>';
        button.onclick = () => loadProjectByPath(item.path);
        projectList.appendChild(button);
      }
    }

    async function refreshProjectList() {
      const response = await fetch('/preview/projects', { cache: 'no-store' });
      const payload = await response.json();
      projects = payload.projects || [];
      currentPath = currentPath || payload.currentPath || '';
      workspaceRoot = payload.root || workspaceRoot;
      folderEl.textContent = payload.root || 'Workspace';
      renderProjectList();
    }

    async function fetchPreviewState() {
      if (!currentPath) return null;
      const response = await fetch('/preview/state?path=' + encodeURIComponent(currentPath), { cache: 'no-store' });
      const state = await response.json();
      if (!response.ok) {
        throw new Error(state?.error || 'Unable to read preview state');
      }
      return state;
    }

    async function refreshPreviewState() {
      lastState = await fetchPreviewState();
      return lastState;
    }

    async function pollPreviewState() {
      if (!currentPath || reloadInFlight) return;
      try {
        const previous = lastState;
        const state = await fetchPreviewState();
        if (!state) return;
        if (previous && (state.projectListVersion !== previous.projectListVersion || state.projectCount !== previous.projectCount)) {
          await refreshProjectList();
        }
        if (previous && (state.currentMtimeMs !== previous.currentMtimeMs || state.currentSize !== previous.currentSize)) {
          lastState = state;
          await loadProjectByPath(currentPath, { auto: true });
          return;
        }
        lastState = state;
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    function startStatePolling() {
      clearInterval(stateTimer);
      stateTimer = setInterval(pollPreviewState, 900);
    }

    window.__ui2vPreview = async (project, options, sourcePath, loadOptions = {}) => {
      cancelAnimationFrame(raf);
      stopPreviewAudio();
      if (adapter?.dispose) adapter.dispose();
      adapter = undefined;
      runtime = undefined;
      canvas.dataset.ui2vReady = 'false';

      const pixelRatio = Math.max(1, Math.min(4, Number(options.pixelRatio) || 2));
      canvas.width = Math.round(options.width * pixelRatio);
      canvas.height = Math.round(options.height * pixelRatio);
      canvas.style.aspectRatio = options.width + ' / ' + options.height;
      currentResolution = { width: options.width, height: options.height };
      updateCanvasDisplaySize();

      const normalized = {
        ...project,
        fps: options.fps,
        resolution: { width: options.width, height: options.height },
      };
      currentPath = sourcePath || currentPath;
      currentProjectId = normalized.id || normalized.title || normalized.name || 'ui2v-preview';
      duration = Number(options.duration) || Number(normalized.duration) || 0;
      projectFps = Number(options.fps) || Number(normalized.fps) || 30;
      currentSecond = loadOptions.auto ? Math.min(currentSecond, duration) : 0;
      setupPreviewAudio(normalized);

      titleEl.textContent = getProjectTitle(normalized);
      const description = getProjectDescription(normalized);
      subtitleEl.textContent = description
        ? description + ' / ' + formatResolution(normalized.resolution) + ' / ' + options.fps + 'fps / ' + duration + 's'
        : formatResolution(normalized.resolution) + ' / ' + options.fps + 'fps / ' + duration + 's';
      setStatus(loadOptions.auto ? 'Reloading animation...' : 'Loading animation...');

      adapter = new TemplateCanvasAdapter({
        canvas,
        pixelRatio,
        enablePerformanceMonitoring: false,
        enableAutoQualityAdjust: false,
      });
      runtime = new UivRuntime(normalized);
      await runtime.initializeAdapter(adapter);
      scheduleCanvasDisplaySize();
      await renderAt(currentSecond);

      canvas.dataset.ui2vReady = 'true';
      renderProjectList();
      setStatus((loadOptions.auto ? 'Live reloaded: ' : 'Preview ready: ') + (normalized.id || 'project'));
      updatePlayState(false);
      syncPreviewAudio(currentSecond, false);
      await fetchTimelineModel().catch(error => setStatus(error?.message || String(error), true));
      await loadJsonSource().catch(error => setStatus(error?.message || String(error), true));
      updateSelectedClipForm();
      await refreshInspectPanel().catch(() => {});
    };

    async function loadProjectByPath(projectPath, { auto = false } = {}) {
      if (reloadInFlight) return;
      reloadInFlight = true;
      try {
        setStatus((auto ? 'Reloading ' : 'Loading ') + projectPath);
        const response = await fetch('/preview/load?path=' + encodeURIComponent(projectPath), { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || ('HTTP ' + response.status));
        await window.__ui2vPreview(payload.project, payload.options, payload.sourcePath, { auto });
        await refreshPreviewState();
      } catch (error) {
        setStatus((auto ? 'Waiting for valid project: ' : '') + (error?.message || String(error)), true);
      } finally {
        reloadInFlight = false;
      }
    }

    async function loadAttachedProject() {
      try {
        setStatus('Loading project...');
        await refreshProjectList();
        const response = await fetch('/project.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load /project.json: HTTP ' + response.status);
        const payload = await response.json();
        await window.__ui2vPreview(payload.project, payload.options, payload.sourcePath);
        await refreshPreviewState();
        startStatePolling();
      } catch (error) {
        setStatus(error?.message || String(error), true);
      }
    }

    toggle.onclick = () => {
      if (!runtime) return;
      if (playing) pausePlayback();
      else startPlayback(currentSecond);
    };

    restart.onclick = async () => {
      if (!runtime) return;
      pausePlayback();
      await renderAt(0);
      startPlayback(0);
    };

    scrub.oninput = async () => {
      if (!runtime) return;
      pausePlayback();
      await renderAt((Number(scrub.value) / 1000) * duration);
    };

    prevFrame.onclick = async () => {
      if (!runtime) return;
      pausePlayback();
      await renderAt(snapTime(Math.max(0, currentSecond - (1 / (projectFps || 30)))));
    };

    nextFrame.onclick = async () => {
      if (!runtime) return;
      pausePlayback();
      await renderAt(snapTime(Math.min(duration, currentSecond + (1 / (projectFps || 30)))));
    };

    searchEl.oninput = renderProjectList;

    formatJson.onclick = formatJsonEditor;
    saveJson.onclick = saveJsonProject;
    focusClipJson.onclick = focusClipInJson;
    saveClipMeta.onclick = saveClipMetadata;
    splitClipAction.onclick = splitClipAtPlayhead;

    fullscreen.onclick = async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    };

    window.addEventListener('resize', scheduleCanvasDisplaySize);
    window.visualViewport?.addEventListener('resize', scheduleCanvasDisplaySize);
    document.addEventListener('fullscreenchange', scheduleCanvasDisplaySize);

    function showExportResult(text, error = false) {
      exportResult.textContent = text;
      exportResult.className = 'visible' + (error ? ' error' : '');
      clearTimeout(showExportResult.timer);
      showExportResult.timer = setTimeout(() => { exportResult.className = ''; }, 6000);
    }

    exportAction.onclick = async () => {
      if (!currentPath || exportAction.disabled) return;
      const fileName = defaultExportFileName();
      exportAction.disabled = true;
      showExportResult('Choose save location...');
      try {
        const exportTarget = await chooseExportTarget(fileName);
        showExportResult('Rendering MP4...');
        const response = await fetch('/preview/export-download', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: currentPath, quality: 'high', renderScale: 1, codec: 'avc' }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || 'Export failed');
        }
        const blob = await response.blob();
        await writeExportFile(exportTarget, blob, fileName);
        showExportResult('Exported: ' + fileName);
      } catch (error) {
        if (error?.name === 'AbortError') {
          showExportResult('Export canceled');
          return;
        }
        showExportResult(error?.message || String(error), true);
      } finally {
        exportAction.disabled = false;
      }
    };

    async function chooseExportTarget(fileName) {
      if (!window.showSaveFilePicker) {
        return { mode: 'download' };
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
        excludeAcceptAllOption: false,
      });
      return { mode: 'file-system', handle };
    }

    async function writeExportFile(target, blob, fileName) {
      if (target.mode === 'download') {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        return;
      }
      const writable = await target.handle.createWritable();
      try {
        await writable.write(blob);
      } finally {
        await writable.close();
      }
    }

    document.addEventListener('keydown', event => {
      if (event.code === 'Space') {
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
          return;
        }
        event.preventDefault();
        toggle.click();
      }
      if (event.key.toLowerCase() === 'r') restart.click();
      if (event.key.toLowerCase() === 'f') fullscreen.click();
    });

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
