import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { renderToFile } from '@ui2v/producer';
import type { RenderProgress } from '@ui2v/producer';
import * as path from 'path';
import {
  formatResolution,
  loadProjectFile,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
} from './project';

interface RenderOptions {
  output: string;
  format: string;
  quality: string;
  fps?: string;
  width?: string;
  height?: string;
  renderScale?: string;
  codec?: string;
  bitrate?: string;
  progress: boolean;
  headless?: boolean;
  timeout?: string;
}

export async function renderCommand(
  input: string,
  options: RenderOptions
): Promise<void> {
  const spinner = ora('Loading project...').start();

  try {
    const inputPath = path.resolve(input);
    if (!fs.existsSync(inputPath)) {
      spinner.fail(chalk.red(`Input file not found: ${inputPath}`));
      process.exit(1);
    }

    const project = await loadProjectFile(inputPath);
    const outputPath = path.resolve(options.output);
    const renderOptions = normalizeRenderOptions(options);

    spinner.succeed(chalk.green(`Loaded project: ${project.id}`));
    console.log(chalk.dim(`  Duration: ${project.duration}s`));
    console.log(chalk.dim(`  FPS: ${renderOptions.fps ?? project.fps}`));
    console.log(chalk.dim(`  Resolution: ${formatResolution(project.resolution, renderOptions.width, renderOptions.height)}`));
    console.log(chalk.dim(`  Quality: ${renderOptions.quality}`));
    console.log(chalk.dim(`  Render scale: ${renderOptions.renderScale}x`));
    console.log(chalk.dim(`  Output: ${outputPath}`));

    spinner.start('Starting browser renderer...');
    let lastMessage = '';

    const result = await renderToFile(project, outputPath, {
      ...renderOptions,
      sourcePath: inputPath,
      assetBaseDir: path.dirname(inputPath),
      onProgress: (progress: RenderProgress) => {
        if (!options.progress) {
          return;
        }

        const message = formatProgress(progress);
        if (message !== lastMessage) {
          spinner.text = message;
          lastMessage = message;
        }
      },
    });

    if (!result.success) {
      spinner.fail(chalk.red('Render failed'));
      console.error(chalk.red(result.error || 'Unknown render error'));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Render complete'));
    console.log(chalk.cyan(`\nVideo written to: ${result.outputPath}`));
    console.log(chalk.dim(`  Size: ${formatBytes(result.fileSize || 0)}`));
    console.log(chalk.dim(`  Time: ${(result.duration / 1000).toFixed(1)}s`));
  } catch (error) {
    spinner.fail(chalk.red('Render failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

function normalizeRenderOptions(options: RenderOptions) {
  const fps = parseOptionalPositiveInt(options.fps, 'fps', 240);
  const width = parseOptionalPositiveInt(options.width, 'width', 7680);
  const height = parseOptionalPositiveInt(options.height, 'height', 4320);
  const renderScale = parseOptionalPositiveNumber(options.renderScale, 'render-scale', 4) ?? 1;
  const timeoutMs = options.timeout ? parseOptionalPositiveInt(options.timeout, 'timeout')! * 1000 : undefined;
  const bitrate = parseOptionalPositiveInt(options.bitrate, 'bitrate', 200_000_000);

  if (options.format !== 'mp4') {
    throw new Error(`Only mp4 output is currently supported. Received: ${options.format}`);
  }

  if (options.codec && !['avc', 'hevc'].includes(options.codec)) {
    throw new Error(`Only avc and hevc codecs are currently supported. Received: ${options.codec}`);
  }

  return {
    fps,
    width,
    height,
    renderScale: Math.max(1, Math.min(4, renderScale)),
    timeoutMs,
    bitrate,
    format: 'mp4' as const,
    quality: normalizeQuality(options.quality),
    codec: (options.codec === 'hevc' ? 'hevc' : 'avc') as 'avc' | 'hevc',
    headless: options.headless ?? true,
  };
}

function normalizeQuality(quality: string): 'low' | 'medium' | 'high' | 'ultra' | 'cinema' {
  if (['low', 'medium', 'high', 'ultra', 'cinema'].includes(quality)) {
    return quality as any;
  }
  throw new Error(`Invalid quality: ${quality}. Use low, medium, high, ultra, or cinema.`);
}

function formatProgress(progress: RenderProgress): string {
  const frameText = progress.totalFrames > 0
    ? ` (${progress.currentFrame}/${progress.totalFrames})`
    : '';
  const fpsText = progress.fps ? ` ${progress.fps.toFixed(1)} fps` : '';
  const etaText = progress.estimatedTimeRemaining ? ` ETA ${progress.estimatedTimeRemaining}s` : '';
  const message = progress.message ? ` - ${progress.message}` : '';
  return `${progress.phase}: ${Math.round(progress.progress)}%${frameText}${fpsText}${etaText}${message}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
