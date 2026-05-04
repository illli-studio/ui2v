import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { startPreviewServer } from '@ui2v/producer';
import * as path from 'path';
import {
  formatResolution,
  loadProjectFile,
  parseOptionalPositiveInt,
} from './project';

interface PreviewOptions {
  fps?: string;
  width?: string;
  height?: string;
  pixelRatio?: string;
  timeout?: string;
}

export async function previewCommand(
  input: string,
  options: PreviewOptions
): Promise<void> {
  const spinner = ora('Loading project...').start();
  let session: Awaited<ReturnType<typeof startPreviewServer>> | null = null;

  try {
    const inputPath = path.resolve(input);
    if (!fs.existsSync(inputPath)) {
      spinner.fail(chalk.red(`Input file not found: ${inputPath}`));
      process.exit(1);
    }

    const project = await loadProjectFile(inputPath);
    const previewOptions = {
      ...normalizePreviewOptions(options),
      sourcePath: inputPath,
      workspaceRoot: process.cwd(),
      exportDir: path.resolve(process.cwd(), '.tmp/examples'),
    };

    spinner.succeed(chalk.green(`Loaded project: ${project.id}`));
    console.log(chalk.dim(`  Duration: ${project.duration}s`));
    console.log(chalk.dim(`  FPS: ${previewOptions.fps ?? project.fps}`));
    console.log(chalk.dim(`  Resolution: ${formatResolution(project.resolution, previewOptions.width, previewOptions.height)}`));
    console.log(chalk.dim(`  Preview pixel ratio: ${previewOptions.pixelRatio}x`));

    spinner.start('Starting ui2v runtime preview server...');
    session = await startPreviewServer(project, previewOptions);
    spinner.succeed(chalk.green('Preview server ready'));
    console.log(chalk.cyan(`\nPreview URL: ${session.url}`));
    console.log(chalk.dim('Open the URL in your browser. Press Ctrl+C to stop the preview server.'));

    await waitUntilInterrupted(async () => {
      if (session) {
        await session.close();
        session = null;
      }
    });
  } catch (error) {
    spinner.fail(chalk.red('Preview failed'));
    console.error(chalk.red((error as Error).message));
    if (session) {
      await session.close();
    }
    process.exit(1);
  }
}

function normalizePreviewOptions(options: PreviewOptions) {
  return {
    fps: parseOptionalPositiveInt(options.fps, 'fps', 240),
    width: parseOptionalPositiveInt(options.width, 'width', 7680),
    height: parseOptionalPositiveInt(options.height, 'height', 4320),
    pixelRatio: parsePreviewPixelRatio(options.pixelRatio),
    timeoutMs: options.timeout ? parseOptionalPositiveInt(options.timeout, 'timeout')! * 1000 : undefined,
  };
}

function parsePreviewPixelRatio(value: string | undefined): number {
  if (value === undefined) {
    return 2;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('--pixel-ratio must be a positive number');
  }
  if (parsed > 4) {
    throw new Error('--pixel-ratio must be less than or equal to 4');
  }

  return parsed;
}

function waitUntilInterrupted(onStop: () => Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    let stopping = false;

    const stop = async () => {
      if (stopping) {
        return;
      }
      stopping = true;
      await onStop();
      resolve();
    };

    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}
