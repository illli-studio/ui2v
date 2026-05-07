import { existsSync, statSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'out', '.tmp']);
const mojibakeMarkers = ['????', '涓', '鏋', '鎷', '娓', '瀹', '绋', '鍣', '鐨', '浠', '銆', '锛', '蹇'];
const maxShowcaseGifBytes = 3 * 1024 * 1024;
const requiredShowcaseAssets = [];
const markdownFiles = await findFiles(root, file => file.endsWith('.md'));

for (const file of markdownFiles) {
  const label = relative(root, file).replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');

  if (text.charCodeAt(0) === 0xFEFF) {
    failures.push(`${label}: contains UTF-8 BOM`);
  }
  if (text.includes('\uFFFD')) {
    failures.push(`${label}: contains Unicode replacement character`);
  }
  const markerHits = mojibakeMarkers.filter(marker => text.includes(marker));
  if (markerHits.length >= 2 || text.includes('????')) {
    failures.push(`${label}: likely contains mojibake text (${markerHits.slice(0, 4).join(', ') || 'question marks'})`);
  }

  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')) {
      continue;
    }
    const cleanHref = href.split('#')[0];
    if (!cleanHref) {
      continue;
    }
    const target = resolve(dirname(file), decodeURIComponent(cleanHref));
    if (!existsSync(target)) {
      failures.push(`${label}: broken markdown link ${href}`);
    }
  }

  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (href.startsWith('http://') || href.startsWith('https://')) {
      continue;
    }
    const target = resolve(dirname(file), decodeURIComponent(href.split('#')[0]));
    if (!existsSync(target)) {
      failures.push(`${label}: broken image reference ${href}`);
    }
  }
}

for (const asset of requiredShowcaseAssets) {
  const target = resolve(root, asset);
  if (!existsSync(target)) {
    failures.push(`${asset}: missing required README showcase asset`);
    continue;
  }
  const size = statSync(target).size;
  if (asset.endsWith('.gif') && size > maxShowcaseGifBytes) {
    failures.push(`${asset}: GIF is ${(size / 1024 / 1024).toFixed(2)} MB; keep README GIFs under 3 MB`);
  }
}

for (const exampleDir of await listImmediateDirs(resolve(root, 'examples'))) {
  const base = relative(root, exampleDir).replace(/\\/g, '/');
  for (const name of ['README.md', 'README.zh.md']) {
    if (!existsSync(resolve(exampleDir, name))) {
      failures.push(`${base}: missing ${name}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Docs/assets validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
}

console.log(`Docs/assets validation passed: ${markdownFiles.length} Markdown files, ${requiredShowcaseAssets.length} showcase assets`);

async function findFiles(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function listImmediateDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => resolve(dir, entry.name));
}
