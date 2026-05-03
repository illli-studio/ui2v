/**
 * @ui2v/core
 * Core types, parsers, and utilities for ui2v
 */

// Types
export type {
  AnimationProject,
  Resolution,
  ResolutionPreset,
  TemplateConfig,
  BackgroundConfig,
  Layer,
  LayerType,
  Transform,
  AnimationConfig,
  AnimationEffect,
  TimelineAnimation,
  CodeConfig,
  ProjectAssets,
  AssetReference,
  FontReference,
  ExportOptions,
  RenderProgress,
  SupportedLibrary,
} from './types';

export { RESOLUTIONS, DEFAULT_FPS, SUPPORTED_LIBRARIES } from './types';

// Parser
export {
  parseProject,
  validateProject,
  normalizeResolution,
  stringifyProject,
  getProjectDimensions,
  getTotalFrames,
  ProjectParseError,
} from './parser';

// Validator
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './validator';

export {
  validateProjectStructure,
  hasAssets,
  getAssetUrls,
} from './validator';
