import { CodeSanitizer } from './CodeSanitizer';

export type CustomCodeEntrypointType =
    | 'factory'
    | 'class'
    | 'object'
    | 'render-function'
    | 'script';

export interface CustomCodeDiagnostic {
    stage: 'extract' | 'sanitize' | 'compile' | 'entrypoint' | 'init' | 'render' | 'runtime';
    level?: 'info' | 'warning' | 'error';
    message: string;
    detail?: string;
    frame?: number;
    time?: number;
}

export interface PreparedCustomCode {
    source: string;
    sanitized: string;
    changed: boolean;
    preview: string;
    diagnostics: CustomCodeDiagnostic[];
}

export interface CustomCodeRuntimeReport {
    layerId: string;
    segmentId?: string;
    entrypoint?: CustomCodeEntrypointType;
    sourceLength: number;
    sanitizedLength: number;
    sanitizedChanged: boolean;
    codePreview: string;
    dependencies: string[];
    diagnostics: CustomCodeDiagnostic[];
    lastCompiledAt: number;
    lastRenderedAt?: number;
    lastError?: string;
}

export interface CustomCodeEntrypoint {
    type: CustomCodeEntrypointType;
    value?: any;
}

export function prepareCustomCode(input: string): PreparedCustomCode {
    const diagnostics: CustomCodeDiagnostic[] = [];
    let source = extractCodeSource(input, diagnostics);

    if (source.includes('\\\\n') || source.includes('\\\\t')) {
        source = source.replace(/\\\\n/g, '\n').replace(/\\\\t/g, '\t');
        diagnostics.push({
            stage: 'extract',
            level: 'info',
            message: 'Decoded double-escaped newlines and tabs'
        });
    }

    const sanitized = CodeSanitizer.sanitize(source);
    if (sanitized !== source) {
        diagnostics.push({
            stage: 'sanitize',
            level: 'info',
            message: 'Applied AI-code compatibility fixups'
        });
    }

    return {
        source,
        sanitized,
        changed: sanitized !== source,
        preview: createCodePreview(sanitized),
        diagnostics
    };
}

export function createEntrypointProbe(): string {
    return [
        '',
        '// --- ui2v custom-code entrypoint probe ---',
        'const __ui2vDefaultExport = exports && Object.prototype.hasOwnProperty.call(exports, "default") ? exports.default : undefined;',
        'const __ui2vModuleExport = module ? module.exports : undefined;',
        'if (typeof createRenderer === "function") {',
        '    return { type: "factory", value: createRenderer };',
        '}',
        'if (typeof createAnimation === "function") {',
        '    return { type: "factory", value: createAnimation };',
        '}',
        'if (typeof setup === "function" && typeof draw === "function") {',
        '    return { type: "object", value: { init: setup, render: draw } };',
        '}',
        'if (typeof render === "function") {',
        '    return { type: "render-function", value: render };',
        '}',
        'if (__ui2vDefaultExport && typeof __ui2vDefaultExport === "function") {',
        '    return { type: "class", value: __ui2vDefaultExport };',
        '}',
        'if (__ui2vDefaultExport && typeof __ui2vDefaultExport === "object") {',
        '    return { type: "object", value: __ui2vDefaultExport };',
        '}',
        'if (__ui2vModuleExport && __ui2vModuleExport !== exports && typeof __ui2vModuleExport === "function") {',
        '    return { type: "class", value: __ui2vModuleExport };',
        '}',
        'if (__ui2vModuleExport && __ui2vModuleExport !== exports && typeof __ui2vModuleExport === "object" && Object.keys(__ui2vModuleExport).length > 0) {',
        '    return { type: "object", value: __ui2vModuleExport };',
        '}',
        'if (exports && Object.keys(exports).some((key) => key !== "default")) {',
        '    return { type: "object", value: exports };',
        '}',
        'return { type: "script" };'
    ].join('\n');
}

export function createCodePreview(code: string, maxLength = 240): string {
    const compact = String(code ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    if (compact.length <= maxLength) {
        return compact;
    }
    return `${compact.slice(0, maxLength - 1)}…`;
}

export function errorToDiagnostic(
    stage: CustomCodeDiagnostic['stage'],
    error: unknown,
    extra: Partial<CustomCodeDiagnostic> = {}
): CustomCodeDiagnostic {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
        stage,
        level: 'error',
        message: err.message,
        detail: err.stack,
        ...extra,
    };
}

export function normalizeEntrypoint(value: any): CustomCodeEntrypoint {
    if (!value || typeof value !== 'object') {
        return { type: 'script' };
    }

    if (value.type === 'simple') {
        return { type: 'script', value: value.value };
    }

    if (value.type === 'factory' || value.type === 'class' || value.type === 'object' || value.type === 'render-function' || value.type === 'script') {
        return value as CustomCodeEntrypoint;
    }

    return { type: 'script' };
}

function extractCodeSource(input: string, diagnostics: CustomCodeDiagnostic[]): string {
    let source = String(input ?? '').trim();

    const fenced = source.match(/```(?:javascript|js|jsx|ts|tsx|json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
        source = fenced[1].trim();
        diagnostics.push({
            stage: 'extract',
            level: 'info',
            message: 'Extracted code from Markdown fence'
        });
    }

    const jsonSource = tryExtractJsonCode(source);
    if (jsonSource !== null) {
        source = jsonSource;
        diagnostics.push({
            stage: 'extract',
            level: 'info',
            message: 'Extracted code from JSON wrapper'
        });
    }

    return source;
}

function tryExtractJsonCode(source: string): string | null {
    if (!source.includes('"code"') && !source.includes("'code'")) {
        return null;
    }

    const candidates = new Set<string>();
    candidates.add(source);

    const firstBrace = source.indexOf('{');
    const lastBrace = source.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        candidates.add(source.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed.code === 'string') {
                return parsed.code;
            }
        } catch {
            // Keep trying less exact wrappers.
        }
    }

    return null;
}
