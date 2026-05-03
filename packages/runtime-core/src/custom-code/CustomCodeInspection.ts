import type { SceneGraphSnapshot, SceneNode } from '../types';

export type StaticCustomCodeEntrypoint =
  | 'createRenderer'
  | 'createAnimation'
  | 'render-function'
  | 'setup-draw'
  | 'module-exports'
  | 'export-default'
  | 'script'
  | 'unknown';

export interface StaticCustomCodeDiagnostic {
  level: 'info' | 'warning' | 'error';
  code: string;
  message: string;
}

export interface StaticCustomCodeInspection {
  nodeId: string;
  segmentId?: string;
  entrypoint: StaticCustomCodeEntrypoint;
  sourceLength: number;
  sanitizedLength: number;
  sanitizedChanged: boolean;
  codePreview: string;
  dependencies: string[];
  diagnostics: StaticCustomCodeDiagnostic[];
}

export interface StaticCustomCodeInspectionSummary {
  total: number;
  withWarnings: number;
  withErrors: number;
  items: StaticCustomCodeInspection[];
}

export function inspectStaticCustomCode(scene: SceneGraphSnapshot): StaticCustomCodeInspectionSummary {
  const items = scene.nodes
    .filter(node => node.type === 'custom-code')
    .map(inspectNodeCustomCode);

  return {
    total: items.length,
    withWarnings: items.filter(item => item.diagnostics.some(diagnostic => diagnostic.level === 'warning')).length,
    withErrors: items.filter(item => item.diagnostics.some(diagnostic => diagnostic.level === 'error')).length,
    items,
  };
}

function inspectNodeCustomCode(node: SceneNode): StaticCustomCodeInspection {
  const rawCode = node.properties.code ?? (node.source as any)?.code;
  const diagnostics: StaticCustomCodeDiagnostic[] = [];
  const source = extractStaticCode(rawCode, diagnostics);
  const sanitized = sanitizeStaticCode(source, diagnostics);
  const entrypoint = detectEntrypoint(sanitized);
  const dependencies = Array.from(new Set([
    ...node.dependencies,
    ...extractDependenciesFromCode(sanitized),
  ])).sort();

  if (!source.trim()) {
    diagnostics.push({
      level: 'error',
      code: 'CUSTOM_CODE_EMPTY',
      message: 'custom-code node has no code',
    });
  }

  if (entrypoint === 'unknown') {
    diagnostics.push({
      level: 'warning',
      code: 'CUSTOM_CODE_ENTRYPOINT_UNKNOWN',
      message: 'Could not identify a custom-code entrypoint; it will run as a script if compilation succeeds',
    });
  }

  for (const dependency of dependencies) {
    if (!node.dependencies.includes(dependency)) {
      diagnostics.push({
        level: 'warning',
        code: 'CUSTOM_CODE_IMPLICIT_DEPENDENCY',
        message: `Code appears to use "${dependency}" but the node does not declare it`,
      });
    }
  }

  return {
    nodeId: node.id,
    segmentId: typeof node.properties.__runtimeSegmentId === 'string'
      ? node.properties.__runtimeSegmentId
      : undefined,
    entrypoint,
    sourceLength: source.length,
    sanitizedLength: sanitized.length,
    sanitizedChanged: source !== sanitized,
    codePreview: createCodePreview(sanitized),
    dependencies,
    diagnostics,
  };
}

function extractStaticCode(value: unknown, diagnostics: StaticCustomCodeDiagnostic[]): string {
  let source = typeof value === 'string' ? value.trim() : '';

  const fenced = source.match(/```(?:javascript|js|jsx|ts|tsx|json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    source = fenced[1].trim();
    diagnostics.push({
      level: 'info',
      code: 'CUSTOM_CODE_MARKDOWN_FENCE',
      message: 'Extracted code from Markdown fence',
    });
  }

  if (source.includes('"code"')) {
    const firstBrace = source.indexOf('{');
    const lastBrace = source.lastIndexOf('}');
    const candidate = firstBrace >= 0 && lastBrace > firstBrace
      ? source.slice(firstBrace, lastBrace + 1)
      : source;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed.code === 'string') {
        source = parsed.code;
        diagnostics.push({
          level: 'info',
          code: 'CUSTOM_CODE_JSON_WRAPPER',
          message: 'Extracted code from JSON wrapper',
        });
      }
    } catch {
      diagnostics.push({
        level: 'warning',
        code: 'CUSTOM_CODE_JSON_WRAPPER_INVALID',
        message: 'Code looks JSON-wrapped but could not be parsed',
      });
    }
  }

  return source;
}

function sanitizeStaticCode(source: string, diagnostics: StaticCustomCodeDiagnostic[]): string {
  let out = source
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u3002/g, '.')
    .replace(/\uff1b/g, ';')
    .replace(/\uff0c/g, ',');

  if (out.includes('\\\\n') || out.includes('\\\\t')) {
    out = out.replace(/\\\\n/g, '\n').replace(/\\\\t/g, '\t');
    diagnostics.push({
      level: 'info',
      code: 'CUSTOM_CODE_ESCAPED_WHITESPACE',
      message: 'Decoded double-escaped newlines and tabs',
    });
  }

  const esmOut = out
    .replace(
      /import\s+(?:(\w+)|\{([\w\s,]+)\})\s+from\s+(['"])([^'"]+)\3;?/g,
      (match, def, named, quote, id) => {
        if (def) return `const ${def} = require(${quote}${id}${quote});`;
        if (named) return `const {${named}} = require(${quote}${id}${quote});`;
        return match;
      }
    )
    .replace(/export\s+default\s+/g, 'exports.default = ');

  if (esmOut !== out) {
    diagnostics.push({
      level: 'info',
      code: 'CUSTOM_CODE_ESM_TRANSLATED',
      message: 'Translated ESM import/export syntax for runtime compatibility',
    });
    out = esmOut;
  }

  return out;
}

function detectEntrypoint(code: string): StaticCustomCodeEntrypoint {
  if (/function\s+createRenderer\b|const\s+createRenderer\s*=|let\s+createRenderer\s*=/.test(code)) {
    return 'createRenderer';
  }
  if (/function\s+createAnimation\b|const\s+createAnimation\s*=|let\s+createAnimation\s*=/.test(code)) {
    return 'createAnimation';
  }
  if (/function\s+render\b|const\s+render\s*=|let\s+render\s*=/.test(code)) {
    return 'render-function';
  }
  if (/function\s+setup\b[\s\S]*function\s+draw\b|function\s+draw\b[\s\S]*function\s+setup\b/.test(code)) {
    return 'setup-draw';
  }
  if (/module\.exports\s*=/.test(code)) {
    return 'module-exports';
  }
  if (/exports\.default\s*=/.test(code) || /export\s+default\s+/.test(code)) {
    return 'export-default';
  }
  if (code.trim().length > 0) {
    return 'script';
  }
  return 'unknown';
}

function extractDependenciesFromCode(code: string): string[] {
  const dependencies = new Set<string>();
  const patterns: Array<[RegExp, string]> = [
    [/\bTHREE\b|require\(['"]three['"]\)/, 'three'],
    [/\banime\b|\banimate\s*\(|require\(['"]animejs?['"]\)/, 'animejs'],
    [/\bgsap\b|require\(['"]gsap['"]\)/, 'gsap'],
    [/\bd3\b|require\(['"]d3['"]\)/, 'd3'],
    [/\bPIXI\b|require\(['"]pixi(?:\.js)?['"]\)/, 'pixi.js'],
    [/\blottie\b|require\(['"]lottie(?:-web)?['"]\)/, 'lottie-web'],
    [/\brough\b|require\(['"]roughjs?['"]\)/, 'rough'],
    [/\bMatter\b|require\(['"]matter-js['"]\)/, 'matter-js'],
    [/\bfabric\b|require\(['"]fabric(?:\.js)?['"]\)/, 'fabric'],
  ];

  for (const [pattern, dependency] of patterns) {
    if (pattern.test(code)) {
      dependencies.add(dependency);
    }
  }

  return Array.from(dependencies);
}

function createCodePreview(code: string, maxLength = 180): string {
  const compact = code.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}
