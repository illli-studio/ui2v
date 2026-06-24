import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  assertPreviewProjectSaveable,
  formatPreviewProjectJson,
  insertPreviewTemplate,
  listPreviewTemplates,
  type PreviewTemplateSummary,
} from '@ui2v/producer';
import { filterBeatTemplatesBySchema, resolveBeatWorkspaceRoot } from './beats';

interface ListBeatsOptions {
  schema?: string;
  json?: boolean;
  workspace?: string;
}

export async function listBeatsCommand(options: ListBeatsOptions): Promise<void> {
  const workspaceRoot = options.workspace
    ? path.resolve(options.workspace)
    : resolveBeatWorkspaceRoot();
  let templates = listPreviewTemplates(workspaceRoot);
  templates = filterBeatTemplatesBySchema(templates, options.schema);

  if (options.json) {
    console.log(JSON.stringify({ workspaceRoot, count: templates.length, templates }, null, 2));
    return;
  }

  if (templates.length === 0) {
    console.log(chalk.yellow('No beat templates found for the current filter.'));
    return;
  }

  console.log(chalk.cyan(`Beat templates (${templates.length})`));
  console.log(chalk.dim(`Workspace: ${workspaceRoot}`));
  for (const template of templates) {
    printTemplateLine(template);
  }
}

function printTemplateLine(template: PreviewTemplateSummary): void {
  const schema = template.compatibleSchemas.join(', ');
  const libraries = template.libraries.join(', ') || 'none';
  console.log(
    `${chalk.bold(template.id)}  ${chalk.white(template.label)}  ${chalk.dim(`${template.defaultDuration}s · ${libraries} · ${schema}`)}`
  );
  if (template.description) {
    console.log(chalk.dim(`  ${template.description}`));
  }
}
