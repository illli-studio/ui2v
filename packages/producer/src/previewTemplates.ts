import * as fs from 'fs';
import * as path from 'path';

export type PreviewTemplateKind = 'layer' | 'segment';

export interface PreviewTemplateSummary {
  id: string;
  label: string;
  description: string;
  kind: PreviewTemplateKind;
  libraries: string[];
  defaultDuration: number;
  compatibleSchemas: Array<'template' | 'uiv-runtime'>;
  source: 'library-timeline' | 'builtin';
}

export interface PreviewTemplateInsertRequest {
  templateId: string;
  startTime?: number;
  duration?: number;
}

interface PreviewTemplatePayload extends PreviewTemplateSummary {
  layer?: Record<string, unknown>;
  segment?: Record<string, unknown>;
}

const BUILTIN_RUNTIME_TEMPLATES: PreviewTemplatePayload[] = [
  {
    id: 'runtime-canvas-hook',
    label: 'Canvas Hook',
    description: 'Runtime segment opener with canvas2d title beat.',
    kind: 'segment',
    libraries: ['canvas2d'],
    defaultDuration: 2.5,
    compatibleSchemas: ['uiv-runtime'],
    source: 'builtin',
    segment: {
      label: 'Canvas Hook',
      dependencies: ['canvas2d'],
      transition: { type: 'fade', duration: 0.25, easing: 'easeOutCubic' },
      code: "function render(t, context) { const ctx = context.ctx, w = context.width, h = context.height, p = context.progress; ctx.fillStyle = '#050812'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffffff'; ctx.font = '900 72px system-ui, sans-serif'; ctx.fillText('New hook beat', 120, 280 - (1 - p) * 40); ctx.fillStyle = '#bdefff'; ctx.font = '700 24px system-ui, sans-serif'; ctx.fillText('Edit this segment code in JSON', 124, 340); }",
    },
  },
  {
    id: 'runtime-gsap-beat',
    label: 'GSAP Beat',
    description: 'Runtime segment stub wired for gsap dependency.',
    kind: 'segment',
    libraries: ['canvas2d', 'gsap'],
    defaultDuration: 2,
    compatibleSchemas: ['uiv-runtime'],
    source: 'builtin',
    segment: {
      label: 'GSAP Beat',
      dependencies: ['canvas2d', 'gsap'],
      transition: { type: 'fade', duration: 0.25, easing: 'easeOutCubic' },
      code: "function render(t, context) { const ctx = context.ctx, w = context.width, h = context.height, gsap = context.libs?.gsap || globalThis.gsap; const ease = gsap?.parseEase ? gsap.parseEase('power3.out') : (v)=>1-Math.pow(1-v,3); const p = ease(context.progress); ctx.fillStyle = '#07111f'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#7dd3fc'; ctx.font = '900 84px system-ui, sans-serif'; ctx.fillText('GSAP beat', 120, 320 - (1-p)*60); ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillText('Replace with your gsap.timeline render code', 124, 390); }",
    },
  },
  {
    id: 'runtime-data-reveal',
    label: 'Data Reveal',
    description: 'Runtime segment stub wired for d3 dependency.',
    kind: 'segment',
    libraries: ['canvas2d', 'd3'],
    defaultDuration: 2.5,
    compatibleSchemas: ['uiv-runtime'],
    source: 'builtin',
    segment: {
      label: 'Data Reveal',
      dependencies: ['canvas2d', 'd3'],
      transition: { type: 'fade', duration: 0.25, easing: 'easeOutCubic' },
      code: "function render(t, context) { const ctx = context.ctx, w = context.width, h = context.height, p = context.progress; ctx.fillStyle = '#041018'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#7bd88f'; ctx.font = '900 72px system-ui, sans-serif'; ctx.fillText('Data reveal', 120, 250); ctx.strokeStyle = '#7bd88f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(140, 420); ctx.lineTo(140 + (w - 280) * p, 420); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillText('Swap in d3-generated geometry here', 124, 500); }",
    },
  },
];

export function listPreviewTemplates(workspaceRoot?: string): PreviewTemplateSummary[] {
  return [...loadLibraryTimelineBeatTemplates(workspaceRoot), ...BUILTIN_RUNTIME_TEMPLATES]
    .map(({ layer, segment, ...summary }) => summary)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function insertPreviewTemplate(
  project: any,
  request: PreviewTemplateInsertRequest,
  workspaceRoot?: string
): { project: any; insertedId: string; startTime: number; endTime: number } {
  const template = resolvePreviewTemplate(request.templateId, workspaceRoot);
  if (!template) {
    throw new Error(`Template not found: ${request.templateId}`);
  }

  const schema = project?.schema === 'uiv-runtime' ? 'uiv-runtime' : 'template';
  if (!template.compatibleSchemas.includes(schema)) {
    throw new Error(`Template ${template.id} is not compatible with ${schema} projects`);
  }

  const fps = Number(project?.fps) || 30;
  const duration = Number(request.duration) || template.defaultDuration;
  const startTime = snapTimeToFrame(
    request.startTime ?? suggestTemplateStartTime(project, duration),
    fps
  );
  const endTime = roundTime(startTime + duration);
  const next = structuredClone(project);

  if (template.kind === 'layer') {
    if (!next.template) next.template = { layers: [] };
    if (!Array.isArray(next.template.layers)) next.template.layers = [];
    if (!next.mode) next.mode = 'template';
    const insertedId = createUniqueId(template.id, collectLayerIds(next));
    const layer = structuredClone(template.layer ?? {}) as Record<string, unknown>;
    layer.id = insertedId;
    layer.name = `${template.label} copy`;
    layer.startTime = startTime;
    layer.endTime = endTime;
    delete layer.duration;
    next.template.layers.push(layer);
    mergeProjectDependencies(next, template.libraries);
    if (endTime > Number(next.duration) || 0) next.duration = endTime;
    return { project: next, insertedId, startTime, endTime };
  }

  if (!next.timeline) next.timeline = { segments: [] };
  if (!Array.isArray(next.timeline.segments)) next.timeline.segments = [];
  if (!next.schema) next.schema = 'uiv-runtime';
  const insertedId = createUniqueId(template.id.replace(/^runtime-/, 'beat-'), collectSegmentIds(next));
  const segment = structuredClone(template.segment ?? {}) as Record<string, unknown>;
  segment.id = insertedId;
  segment.label = String(segment.label || template.label);
  segment.startTime = startTime;
  segment.endTime = endTime;
  segment.dependencies = [...template.libraries];
  next.timeline.segments.push(segment);
  next.timeline.segments.sort((a: any, b: any) => Number(a.startTime) - Number(b.startTime));
  mergeProjectDependencies(next, template.libraries);
  if (endTime > Number(next.duration) || 0) next.duration = endTime;
  return { project: next, insertedId, startTime, endTime };
}

function loadLibraryTimelineBeatTemplates(workspaceRoot?: string): PreviewTemplatePayload[] {
  const file = resolveLibraryTimelinePath(workspaceRoot);
  if (!file) return [];

  try {
    const project = JSON.parse(stripUtf8Bom(fs.readFileSync(file, 'utf8')));
    const layers = project?.template?.layers || [];
    return layers
      .filter((layer: any) => typeof layer?.id === 'string' && layer.id.startsWith('beat-'))
      .map((layer: any) => {
        const startTime = Number(layer.startTime) || 0;
        const endTime = layer.endTime != null
          ? Number(layer.endTime)
          : startTime + (Number(layer.duration) || 2);
        const libraries = collectLayerDependencies(layer);
        return {
          id: String(layer.id),
          label: String(layer.name || layer.id),
          description: `Maintained ${libraries.join(' + ') || 'canvas'} beat from library-timeline.`,
          kind: 'layer' as const,
          libraries,
          defaultDuration: Math.max(0.5, roundTime(endTime - startTime)),
          compatibleSchemas: ['template'] as Array<'template' | 'uiv-runtime'>,
          source: 'library-timeline' as const,
          layer: stripLayerTiming(layer),
        };
      });
  } catch {
    return [];
  }
}

function resolvePreviewTemplate(templateId: string, workspaceRoot?: string): PreviewTemplatePayload | undefined {
  return [...loadLibraryTimelineBeatTemplates(workspaceRoot), ...BUILTIN_RUNTIME_TEMPLATES]
    .find(template => template.id === templateId);
}

function resolveLibraryTimelinePath(workspaceRoot?: string): string | undefined {
  const candidates = [
    workspaceRoot ? path.join(workspaceRoot, 'examples/library-timeline/animation.json') : undefined,
    path.resolve(process.cwd(), 'examples/library-timeline/animation.json'),
  ].filter(Boolean) as string[];
  return candidates.find(candidate => fs.existsSync(candidate));
}

function stripLayerTiming(layer: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(layer);
  delete next.startTime;
  delete next.endTime;
  delete next.duration;
  return next;
}

function suggestTemplateStartTime(project: any, duration: number): number {
  const timeline = buildOccupiedWindows(project);
  if (!timeline.length) return 0;
  const lastEnd = Math.max(...timeline.map(item => item.endTime));
  return roundTime(lastEnd);
}

function buildOccupiedWindows(project: any): Array<{ startTime: number; endTime: number }> {
  if (project?.schema === 'uiv-runtime' && Array.isArray(project?.timeline?.segments)) {
    return project.timeline.segments.map((segment: any) => ({
      startTime: Number(segment.startTime) || 0,
      endTime: Number(segment.endTime) || 0,
    }));
  }
  const layers = project?.template?.layers || project?.layers || [];
  return layers
    .filter((layer: any) => layer?.id !== 'stage')
    .map((layer: any) => {
      const startTime = Number(layer.startTime) || 0;
      const endTime = layer.endTime != null
        ? Number(layer.endTime)
        : startTime + (Number(layer.duration) || 0);
      return { startTime, endTime };
    });
}

function collectLayerIds(project: any): Set<string> {
  const layers = project?.template?.layers || project?.layers || [];
  return new Set(layers.map((layer: any) => String(layer.id)));
}

function collectSegmentIds(project: any): Set<string> {
  const segments = project?.timeline?.segments || [];
  return new Set(segments.map((segment: any) => String(segment.id)));
}

function createUniqueId(baseId: string, existingIds: Set<string>): string {
  if (!existingIds.has(baseId)) return baseId;
  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}

function mergeProjectDependencies(project: any, dependencies: string[]): void {
  const values = new Set<string>(Array.isArray(project?.dependencies) ? project.dependencies.map(String) : []);
  dependencies.forEach(item => values.add(item));
  project.dependencies = [...values].sort();
}

function collectLayerDependencies(layer: any): string[] {
  const values = new Set<string>();
  for (const source of [layer?.dependencies, layer?.properties?.dependencies]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (typeof item === 'string' && item.trim()) values.add(item.trim());
    }
  }
  return [...values].sort();
}

function snapTimeToFrame(value: number, fps: number): number {
  const frameDuration = 1 / (fps || 30);
  return roundTime(Math.round(value / frameDuration) * frameDuration);
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
