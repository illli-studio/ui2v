/**
 * ui2v Producer - browser-backed video rendering pipeline.
 */

export {
  renderToVideo,
  renderToFile,
  startPreview,
  startPreviewServer,
  checkBrowserEnvironment,
  checkFFmpeg,
  findBrowserExecutable,
  resolveBrowserExecutable,
  resolveRequiredBrowserExecutable,
  BrowserExecutableNotFoundError,
} from './renderer';
export {
  buildPreviewTimeline,
  applyPreviewTimelineUpdates,
  snapRuntimeSegmentChain,
  createPreviewInspectSummary,
  splitPreviewClip,
  applyPreviewClipMetadataUpdates,
  formatPreviewProjectJson,
  assertPreviewProjectSaveable,
  lintPreviewProject,
  summarizeTimelineLint,
} from './previewStudio';
export {
  listPreviewTemplates,
  insertPreviewTemplate,
} from './previewTemplates';
export type { BrowserResolutionResult, RenderOptions, RenderProgress, RenderResult, PreviewOptions, PreviewSession, AnimationProject } from './renderer';
export type {
  PreviewTimelineModel,
  PreviewTimelineUpdate,
  PreviewTimelineEditMode,
  PreviewTimelineClip,
  PreviewInspectSummary,
  PreviewClipSplitRequest,
  PreviewClipMetadataUpdate,
} from './previewStudio';
export type {
  PreviewTemplateSummary,
  PreviewTemplateInsertRequest,
} from './previewTemplates';
