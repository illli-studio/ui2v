import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseProject, validateProjectStructure } from '../packages/core/dist/index.mjs';
import { validateRuntimeProject } from '../packages/runtime-core/dist/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examplesDir = resolve(root, 'examples');
const jsonFiles = await findJsonFiles(examplesDir);

if (jsonFiles.length === 0) {
  throw new Error('No example JSON files found');
}

const failures = [];

for (const file of jsonFiles) {
  const label = relative(root, file).replace(/\\/g, '/');
  const fileStat = await stat(file);
  if (fileStat.size === 0) {
    failures.push(`${label}: file is empty`);
    continue;
  }

  let json;
  try {
    json = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    failures.push(`${label}: invalid JSON: ${error.message}`);
    continue;
  }

  try {
    if (json?.schema === 'uiv-runtime') {
      const result = validateRuntimeProject(json);
      if (!result.valid) {
        failures.push(`${label}: runtime validation failed: ${formatIssues(result.errors)}`);
      }
    } else {
      const project = parseProject(JSON.stringify(json));
      const result = validateProjectStructure(project);
      if (!result.valid) {
        failures.push(`${label}: project validation failed: ${formatIssues(result.errors)}`);
      }
    }
  } catch (error) {
    failures.push(`${label}: validation threw: ${error.message}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Example validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
}

console.log(`Example validation passed: ${jsonFiles.length} files`);

async function findJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function formatIssues(issues) {
  return issues
    .slice(0, 5)
    .map(issue => `${issue.code}${issue.path ? ` at ${issue.path}` : ''}: ${issue.message}`)
    .join('; ');
}
