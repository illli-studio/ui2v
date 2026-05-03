/**
 * Public browser rendering engine exports for ui2v.
 */

import { OptimizedHybridEngine as EngineClass } from './core/OptimizedHybridEngine';
import { TemplateRenderer as TemplateRendererClass } from './core/TemplateRenderer';
import { CanvasCompositor as CanvasCompositorClass } from './core/CanvasCompositor';
import { CodeSandbox as CodeSandboxClass } from './sandbox/CodeSandbox';
import { PerformanceOptimizer as PerformanceOptimizerClass } from './core/PerformanceOptimizer';

export type {
  AnimationMode,
  AnimationProject,
  TemplateConfig,
  TemplateLayer,
  LayerType,
  LayerProperties,
  Animation,
  Keyframe,
  CodeConfig,
  AnimationContext,
  AnimationInstance,
  RenderContext,
  RenderPipelineConfig,
  ExportOptions,
  PerformanceStats
} from './types';

export {
  CodeExecutionError,
  SecurityError,
  RendererError
} from './types';

export { OptimizedHybridEngine, type OptimizedEngineConfig } from './core/OptimizedHybridEngine';
export { OptimizedHybridEngine as Ui2vEngine } from './core/OptimizedHybridEngine';
export { OptimizedHybridEngine as HybridExecutionEngine } from './core/OptimizedHybridEngine';
export { TemplateRenderer } from './core/TemplateRenderer';
export { CanvasCompositor } from './core/CanvasCompositor';
export { PerformanceOptimizer, PerformanceMonitor } from './core/PerformanceOptimizer';

export { CodeSandbox } from './sandbox/CodeSandbox';
export { CodeSanitizer } from './sandbox/CodeSanitizer';
export {
  createEntrypointProbe,
  createCodePreview,
  errorToDiagnostic,
  normalizeEntrypoint,
  prepareCustomCode,
  type CustomCodeDiagnostic,
  type CustomCodeEntrypoint,
  type CustomCodeEntrypointType,
  type CustomCodeRuntimeReport,
  type PreparedCustomCode
} from './sandbox/CustomCodeRuntime';
export { LibraryManager, getLibraryManager, type LibraryInfo } from './sandbox/LibraryManager';

export { WebCodecsExporter, type WebCodecsExportOptions, type WebCodecsExportProgress } from './export/WebCodecsExporter';
export {
  CanvasDrawCommandExecutor,
  type CanvasDrawCommandContext,
  type CanvasDrawCommandExecutionResult,
  type CanvasDrawCommandExecutorOptions
} from './draw/CanvasDrawCommandExecutor';

export type { IRenderer, RendererCapabilities, RendererConfig } from './renderers/base/IRenderer';
export { RendererType } from './renderers/base/IRenderer';
export { BaseRenderer } from './renderers/base/BaseRenderer';
export { RendererFactory } from './renderers/RendererFactory';
export { CustomCodeRenderer } from './renderers/CustomCodeRenderer';
export { PosterStaticRenderer } from './renderers/PosterStaticRenderer';
export {
  TEMPLATE_CANVAS_ADAPTER_ID,
  TemplateCanvasAdapter,
  registerTemplateCanvasAdapter,
  type TemplateCanvasAdapterOptions
} from './adapters/TemplateCanvasAdapter';

export const VERSION = '1.0.2';

export function createEngine(canvasId: string): EngineClass {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error(`Canvas element not found: ${canvasId}`);
  }

  return createEngineFromCanvas(canvas);
}

export function createEngineFromCanvas(canvas: HTMLCanvasElement): EngineClass {
  return new EngineClass(canvas);
}

export function createOptimizedEngine(
  canvasId: string,
  config?: ConstructorParameters<typeof EngineClass>[1]
): EngineClass {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error(`Canvas element not found: ${canvasId}`);
  }

  return new EngineClass(canvas, config);
}

export default {
  Engine: EngineClass,
  Ui2vEngine: EngineClass,
  OptimizedHybridEngine: EngineClass,
  HybridExecutionEngine: EngineClass,
  TemplateRenderer: TemplateRendererClass,
  CanvasCompositor: CanvasCompositorClass,
  CodeSandbox: CodeSandboxClass,
  PerformanceOptimizer: PerformanceOptimizerClass,
  createEngine,
  createOptimizedEngine,
  createEngineFromCanvas,
  VERSION,
};
