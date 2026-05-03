export type {
  EngineAdapter,
  EngineAdapterCapabilities,
  EngineAdapterContext,
  EvaluatedNode,
  RuntimeClock,
  RuntimeComposition,
  RuntimeFrame,
  RuntimeCameraKeyframe,
  RuntimeCameraShot,
  RuntimeCameraState,
  RuntimeKeyframe,
  RuntimeMotionTrack,
  RuntimeNarrationCue,
  RuntimeProject,
  RuntimeProjectNode,
  RuntimeProjectSegment,
  RuntimeMatrix2D,
  RuntimeResolution,
  RuntimeTheme,
  RuntimeTiming,
  RuntimeTransform,
  RuntimeTransition,
  SceneGraphSnapshot,
  SceneNode,
  SchedulerState,
  SchedulerStatus,
} from './types';

export { AdapterRegistry, globalAdapterRegistry, type AdapterFactory, type RegisteredAdapter } from './adapters/AdapterRegistry';
export {
  createAdapterRoutingPlan,
  resolveAdapterRoute,
  type AdapterRoute,
  type AdapterRouteGroup,
  type AdapterRoutingOptions,
  type AdapterRoutingPlan,
  type AdapterRoutingRule,
  type RoutedRenderPlanItem
} from './adapters/AdapterRouter';
export {
  IDENTITY_MATRIX,
  decomposeMatrix,
  matrixFromTransform,
  multiplyMatrix,
  transformPoint,
  type Matrix2DValue,
  type Point2D
} from './math/Matrix2D';
export {
  inspectRuntimeProject,
  type RuntimeFrameInspection,
  type RuntimeInspection,
  type RuntimeInspectionOptions,
  type RuntimeNodeInspection
} from './inspect/inspectRuntime';
export {
  createVideoFramePlan,
  createSegmentFramePlan,
  getFrameCount,
  getFrameTime,
  sampleFrames,
  type FrameSample,
  type FrameSamplingOptions,
  type SegmentFramePlan,
  type SegmentFramePlanItem,
  type SegmentFrameRange,
  type VideoFramePlan,
  type VideoFramePlanOptions
} from './timeline/FrameSampler';
export {
  createSegmentPlan,
  type SegmentPlan,
  type SegmentPlanItem
} from './timeline/SegmentPlan';
export {
  createRenderPlan,
  type RenderPlan,
  type RenderPlanItem
} from './render-plan/RenderPlan';
export {
  createDependencyPlan,
  getDependenciesForRange,
  type DependencyPlan,
  type DependencyPlanOptions,
  type DependencyWindow
} from './dependencies/DependencyPlan';
export {
  inspectStaticCustomCode,
  type StaticCustomCodeDiagnostic,
  type StaticCustomCodeEntrypoint,
  type StaticCustomCodeInspection,
  type StaticCustomCodeInspectionSummary
} from './custom-code/CustomCodeInspection';
export {
  createDrawCommandsForItem,
  createDrawCommandStream,
  type ClearCommand,
  type CustomCommand,
  type DrawCommand,
  type DrawCommandOptions,
  type DrawCommandStream,
  type DrawLayerCommand,
  type RestoreCommand,
  type SaveCommand,
  type SetOpacityCommand,
  type SetTransformCommand
} from './draw-commands/DrawCommand';
export {
  validateRuntimeProject,
  type RuntimeValidationIssue,
  type RuntimeValidationResult
} from './validate/validateRuntimeProject';
export { SceneGraph } from './scene/SceneGraph';
export { createDefaultTransform, createRootNode } from './scene/defaults';
export { applyEasing, interpolateValue, type EasingFunction } from './timeline/easing';
export { TimelineEngine } from './timeline/TimelineEngine';
export { ManualClock } from './scheduler/ManualClock';
export { MotionScheduler, type MotionSchedulerOptions } from './scheduler/MotionScheduler';
export { normalizeProject, type NormalizedRuntimeProject } from './normalize/normalizeProject';
export { UivRuntime, type UivRuntimeOptions } from './Runtime';
export { RuntimeHost, type RuntimeHostOptions } from './RuntimeHost';
export { MultiAdapterHost, type MultiAdapterHostOptions, type MultiAdapterRenderResult } from './MultiAdapterHost';

export const RUNTIME_CORE_VERSION = '1.0.2';
