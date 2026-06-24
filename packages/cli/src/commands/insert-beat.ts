import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  assertPreviewProjectSaveable,
  formatPreviewProjectJson,
  insertPreviewTemplate,
  listPreviewTemplates,
} from '@ui2v/producer';
import {
  detectProjectSchema,
  filterBeatTemplatesBySchema,
  resolveBeatWorkspaceRoot,
} from './beats';
import { loadProjectJson, parseOptionalPositiveNumber } from './project';

interface InsertBeatOptions {
  time?: string;
  duration?: string;
  json?: boolean;
  list?: boolean;
}

export async function insertBeatCommand(
  input: string,
  templateId: string | undefined,
  options: InsertBeatOptions
): Promise<void> {
  const inputPath = path.resolve(input);

  if (options.list) {
    const workspaceRoot = resolveBeatWorkspaceRoot(inputPath);
    let templates = listPreviewTemplates(workspaceRoot);
    if (fs.existsSync(inputPath)) {
      try {
        const project = loadProjectJson(await fs.readFile(inputPath, 'utf-8'));
        const schema = detectProjectSchema(project);
        if (schema === 'template' || schema === 'uiv-runtime') {
          templates = filterBeatTemplatesBySchema(templates, schema);
        }
      } catch {
        // Keep the full catalog when the project cannot be parsed yet.
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ workspaceRoot, count: templates.length, templates }, null, 2));
      return;
    }

    console.log(chalk.cyan(`Compatible beat templates (${templates.length})`));
    for (const template of templates) {
      console.log(`${chalk.bold(template.id)}  ${template.label}`);
    }
    return;
  }

  if (!templateId?.trim()) {
    console.error(chalk.red('Template id is required. Run `ui2v list-beats` or `ui2v insert-beat project.json --list`.'));
    process.exit(1);
  }

  const spinner = options.json ? null : ora('Inserting beat template...').start();

  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const projectJson = await fs.readFile(inputPath, 'utf-8');
    const project = loadProjectJson(projectJson);
    const workspaceRoot = resolveBeatWorkspaceRoot(inputPath);
    const inserted = insertPreviewTemplate(project, {
      templateId: templateId.trim(),
      startTime: parseOptionalPositiveNumber(options.time, 'time', 86400),
      duration: parseOptionalPositiveNumber(options.duration, 'duration', 3600),
    }, workspaceRoot);

    assertPreviewProjectSaveable(inserted.project);
    await fs.writeFile(inputPath, formatPreviewProjectJson(inserted.project));

    spinner?.succeed(chalk.green(`Inserted ${templateId} as ${inserted.insertedId}`));

    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        path: inputPath,
        templateId: templateId.trim(),
        insertedId: inserted.insertedId,
        startTime: inserted.startTime,
        endTime: inserted.endTime,
        duration: inserted.endTime - inserted.startTime,
      }, null, 2));
      return;
    }

    console.log(chalk.dim(`  File: ${inputPath}`));
    console.log(chalk.dim(`  Clip: ${inserted.insertedId}`));
    console.log(chalk.dim(`  Time: ${inserted.startTime.toFixed(3)}s → ${inserted.endTime.toFixed(3)}s`));
  } catch (error) {
    spinner?.fail(chalk.red('Insert beat failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
