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
  findBrowserExecutable
} from './renderer';
export type { RenderOptions, RenderProgress, RenderResult, PreviewOptions, PreviewSession, AnimationProject } from './renderer';
