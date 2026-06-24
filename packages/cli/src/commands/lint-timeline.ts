import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { lintPreviewProject, summarizeTimelineLint } from '@ui2v/producer';
import { loadProjectJson } from './project';

interface LintTimelineOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function lintTimelineCommand(
  input: string,
  options: LintTimelineOptions
): Promise<void> {
  const spinner = options.json ? null : ora('Linting timeline...').start();

  try {
    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    const project = loadProjectJson(await fs.readFile(input, 'utf-8'));
    const timeline = lintPreviewProject(project);
    const summary = summarizeTimelineLint(timeline.lint);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({
        valid: summary.ok,
        schema: timeline.schema,
        duration: timeline.duration,
        fps: timeline.fps,
        trackCount: timeline.tracks.length,
        clipCount: timeline.tracks.reduce((count, track) => count + track.clips.length, 0),
        errorCount: summary.errorCount,
        warningCount: summary.warningCount,
        lint: timeline.lint,
        tracks: options.verbose ? timeline.tracks : undefined,
      }, null, 2));
    } else {
      console.log(chalk.cyan('Timeline lint'));
      console.log(chalk.dim(`  Schema: ${timeline.schema}`));
      console.log(chalk.dim(`  Duration: ${timeline.duration}s @ ${timeline.fps}fps`));
      console.log(chalk.dim(`  Tracks: ${timeline.tracks.length}, clips: ${timeline.tracks.reduce((count, track) => count + track.clips.length, 0)}`));

      if (summary.ok && timeline.lint.length === 0) {
        console.log(chalk.green('\nOK Timeline looks clean'));
      } else if (summary.ok) {
        console.log(chalk.yellow(`\nOK with ${summary.warningCount} warning(s)`));
      } else {
        console.log(chalk.red(`\nFAIL ${summary.errorCount} error(s), ${summary.warningCount} warning(s)`));
      }

      for (const item of timeline.lint) {
        const prefix = item.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN ');
        const clip = item.clipId ? chalk.dim(` [${item.clipId}]`) : '';
        console.log(`${prefix}${clip} ${item.message}`);
      }
    }

    process.exit(summary.ok ? 0 : 1);
  } catch (error) {
    spinner?.fail(chalk.red('Timeline lint failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
