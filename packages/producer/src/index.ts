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
  BrowserExecutableNotFoundError
} from './renderer';
export type { BrowserResolutionResult, RenderOptions, RenderProgress, RenderResult, PreviewOptions, PreviewSession, AnimationProject } from './renderer';
