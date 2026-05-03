/**
 * Project validation utilities
 */

import type { AnimationProject, Layer } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export function validateProjectStructure(
  project: AnimationProject
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (project.duration > 300) {
    warnings.push({
      code: 'LONG_DURATION',
      message: `Duration ${project.duration}s is very long, may cause performance issues`,
    });
  }

  if (project.fps > 120) {
    warnings.push({
      code: 'HIGH_FPS',
      message: `FPS ${project.fps} is very high, may cause performance issues`,
    });
  }

  if (project.mode === 'template' && project.template) {
    validateLayers(project.template.layers, errors, warnings);
  }

  if (project.mode === 'code' && project.code) {
    if (!project.code.html) {
      errors.push({
        code: 'MISSING_HTML',
        message: 'Code mode requires HTML content',
        path: 'code.html',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateLayers(
  layers: Layer[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(layers)) {
    errors.push({
      code: 'INVALID_LAYERS',
      message: 'Layers must be an array',
      path: 'template.layers',
    });
    return;
  }

  const layerIds = new Set<string>();

  layers.forEach((layer, index) => {
    const path = `template.layers[${index}]`;

    if (!layer.id) {
      errors.push({
        code: 'MISSING_LAYER_ID',
        message: 'Layer must have an id',
        path,
      });
    } else if (layerIds.has(layer.id)) {
      errors.push({
        code: 'DUPLICATE_LAYER_ID',
        message: `Duplicate layer id: ${layer.id}`,
        path,
      });
    } else {
      layerIds.add(layer.id);
    }

    if (!layer.type) {
      errors.push({
        code: 'MISSING_LAYER_TYPE',
        message: 'Layer must have a type',
        path,
      });
    }

    if (layer.startTime !== undefined && layer.startTime < 0) {
      errors.push({
        code: 'INVALID_START_TIME',
        message: 'Layer startTime must be >= 0',
        path: `${path}.startTime`,
      });
    }

    if (layer.duration !== undefined && layer.duration <= 0) {
      errors.push({
        code: 'INVALID_DURATION',
        message: 'Layer duration must be > 0',
        path: `${path}.duration`,
      });
    }
  });
}

export function hasAssets(project: AnimationProject): boolean {
  if (!project.assets) return false;

  return Boolean(
    (project.assets.images && project.assets.images.length > 0) ||
    (project.assets.videos && project.assets.videos.length > 0) ||
    (project.assets.audio && project.assets.audio.length > 0) ||
    (project.assets.fonts && project.assets.fonts.length > 0)
  );
}

export function getAssetUrls(project: AnimationProject): string[] {
  const urls: string[] = [];

  if (!project.assets) return urls;

  if (project.assets.images) {
    urls.push(...project.assets.images.map((a) => a.url));
  }

  if (project.assets.videos) {
    urls.push(...project.assets.videos.map((a) => a.url));
  }

  if (project.assets.audio) {
    urls.push(...project.assets.audio.map((a) => a.url));
  }

  if (project.assets.fonts) {
    urls.push(...project.assets.fonts.filter((f) => !!f.url).map((f) => f.url as string));
  }

  return urls;
}
