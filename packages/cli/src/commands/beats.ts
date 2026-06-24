import * as fs from 'fs-extra';
import * as path from 'path';

export function resolveBeatWorkspaceRoot(inputPath?: string): string {
  if (inputPath) {
    let dir = path.dirname(path.resolve(inputPath));
    while (true) {
      const candidate = path.join(dir, 'examples/library-timeline/animation.json');
      if (fs.existsSync(candidate)) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  return process.cwd();
}

export function filterBeatTemplatesBySchema<T extends { compatibleSchemas: string[] }>(
  templates: T[],
  schema?: string
): T[] {
  if (schema !== 'template' && schema !== 'uiv-runtime') {
    return templates;
  }
  return templates.filter(item => item.compatibleSchemas.includes(schema));
}

export function detectProjectSchema(project: { schema?: string; template?: unknown }): 'template' | 'uiv-runtime' | 'unknown' {
  if (project?.schema === 'uiv-runtime') {
    return 'uiv-runtime';
  }
  if (project?.template?.layers || (project as { layers?: unknown[] }).layers) {
    return 'template';
  }
  return 'unknown';
}
