/**
 * Project parser and validator
 */

import type { AnimationProject, Resolution, ResolutionPreset } from './types';
import { RESOLUTIONS } from './types';

export class ProjectParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProjectParseError';
  }
}

export function parseProject(json: string): AnimationProject {
  try {
    const data = JSON.parse(json);
    return validateProject(data);
  } catch (error) {
    if (error instanceof ProjectParseError) {
      throw error;
    }
    throw new ProjectParseError(
      `Invalid JSON: ${(error as Error).message}`,
      'INVALID_JSON'
    );
  }
}

export function validateProject(data: any): AnimationProject {
  if (!data || typeof data !== 'object') {
    throw new ProjectParseError('Project must be an object', 'INVALID_TYPE');
  }

  if (!data.id || typeof data.id !== 'string') {
    throw new ProjectParseError('Project must have a valid id', 'MISSING_ID');
  }

  if (!data.mode || !['template', 'code'].includes(data.mode)) {
    throw new ProjectParseError(
      'Project mode must be "template" or "code"',
      'INVALID_MODE'
    );
  }

  if (typeof data.duration !== 'number' || data.duration <= 0) {
    throw new ProjectParseError(
      'Project duration must be a positive number',
      'INVALID_DURATION'
    );
  }

  if (typeof data.fps !== 'number' || data.fps <= 0) {
    throw new ProjectParseError(
      'Project fps must be a positive number',
      'INVALID_FPS'
    );
  }

  const resolution = normalizeResolution(data.resolution);

  const project: AnimationProject = {
    id: data.id,
    version: data.version || '1.0.0',
    mode: data.mode,
    duration: data.duration,
    fps: data.fps,
    resolution,
    template: data.template,
    code: data.code,
    assets: data.assets,
    variables: data.variables,
    isPoster: data.isPoster,
  };

  if (project.mode === 'template' && !project.template) {
    throw new ProjectParseError(
      'Template mode requires template config',
      'MISSING_TEMPLATE'
    );
  }

  if (project.mode === 'code' && !project.code) {
    throw new ProjectParseError(
      'Code mode requires code config',
      'MISSING_CODE'
    );
  }

  return project;
}

export function normalizeResolution(
  resolution: Resolution | ResolutionPreset | string | any
): Resolution {
  if (
    resolution &&
    typeof resolution === 'object' &&
    'width' in resolution &&
    'height' in resolution
  ) {
    return {
      width: resolution.width,
      height: resolution.height,
    };
  }

  if (typeof resolution === 'string') {
    if (resolution in RESOLUTIONS) {
      return RESOLUTIONS[resolution as ResolutionPreset];
    }

    const match = resolution.match(/^(\d+)x(\d+)$/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10),
      };
    }
  }

  throw new ProjectParseError(
    'Invalid resolution format',
    'INVALID_RESOLUTION'
  );
}

export function stringifyProject(project: AnimationProject): string {
  return JSON.stringify(project, null, 2);
}

export function getProjectDimensions(project: AnimationProject): Resolution {
  return normalizeResolution(project.resolution);
}

export function getTotalFrames(project: AnimationProject): number {
  return Math.ceil(project.duration * project.fps);
}
