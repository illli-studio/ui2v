import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function getCliVersion(): string {
  const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}
