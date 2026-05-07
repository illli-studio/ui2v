import * as fs from 'fs-extra';
import * as path from 'path';
import { parseProject, validateProjectStructure } from '@ui2v/core';
import { validateRuntimeProject } from '@ui2v/runtime-core';
import type { AnimationProject } from '@ui2v/producer';
import type { ValidationError, ValidationWarning } from '@ui2v/core';
import type { RuntimeValidationIssue } from '@ui2v/runtime-core';

export async function loadProjectFile(inputPath: string): Promise<AnimationProject> {
  const projectJson = await fs.readFile(inputPath, 'utf-8');
  const project = loadProjectJson(projectJson);
  const assetBaseDir = path.dirname(path.resolve(inputPath));
  return {
    ...project,
    assetBaseDir,
    __assetBaseDir: assetBaseDir,
  } as AnimationProject;
}

export function loadProjectJson(projectJson: string): AnimationProject {
  projectJson = stripUtf8Bom(projectJson);
  const rawProject = JSON.parse(projectJson);
  if (rawProject?.schema === 'uiv-runtime') {
    const validation = validateRuntimeProject(rawProject);
    if (!validation.valid) {
      const message = validation.errors
        .map(issue => `${issue.code} at ${issue.path}: ${issue.message}`)
        .join('\n');
    throw new Error(`Invalid ui2v runtime project:\n${message}`);
    }
    return rawProject as AnimationProject;
  }

  return parseProject(projectJson) as AnimationProject;
}

export function validateProjectJson(projectJson: string): {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  projectJson = stripUtf8Bom(projectJson);
  const rawProject = JSON.parse(projectJson);
  if (rawProject?.schema === 'uiv-runtime') {
    const result = validateRuntimeProject(rawProject);
    return {
      valid: result.valid,
      errors: result.errors.map(runtimeIssueToValidationError),
      warnings: result.warnings.map(runtimeIssueToValidationWarning),
    };
  }

  return validateProjectStructure(parseProject(projectJson));
}

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseOptionalPositiveInt(value: string | undefined, name: string, max?: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  if (max !== undefined && parsed > max) {
    throw new Error(`--${name} must be less than or equal to ${max}`);
  }
  return parsed;
}

export function parseOptionalPositiveNumber(value: string | undefined, name: string, max?: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive number`);
  }
  if (max !== undefined && parsed > max) {
    throw new Error(`--${name} must be less than or equal to ${max}`);
  }
  return parsed;
}

export function formatResolution(resolution: AnimationProject['resolution'], width?: number, height?: number): string {
  if (width && height) {
    return `${width}x${height}`;
  }
  if (typeof resolution === 'string') {
    return resolution;
  }
  return `${resolution.width}x${resolution.height}`;
}

function runtimeIssueToValidationError(issue: RuntimeValidationIssue): ValidationError {
  return {
    code: issue.code,
    message: issue.message,
    path: issue.path,
  };
}

function runtimeIssueToValidationWarning(issue: RuntimeValidationIssue): ValidationWarning {
  return {
    code: issue.code,
    message: issue.message,
    path: issue.path,
  };
}
