/**
 * Browser export utilities for ui2v.
 *
 * WebCodecsExporter is the primary MP4 export path used by the standalone CLI.
 * The chunked export helpers are lower-level building blocks for memory-aware
 * rendering and encoding flows.
 */

export { WebCodecsExporter, createWebCodecsExporter } from './WebCodecsExporter';

export { MemoryManager, createMemoryManager } from './MemoryManager';
export { BackpressureController, createBackpressureController } from './BackpressureController';
export { ProgressReporter, createProgressReporter, ExportErrorCode } from './ProgressReporter';
export { ChunkedExportEngine, createChunkedExportEngine } from './ChunkedExportEngine';

export type {
  WebCodecsExportOptions,
  WebCodecsExportProgress
} from './WebCodecsExporter';

export type {
  MemoryUsage,
  MemoryThresholds,
  MemoryEventType,
  MemoryEvent,
  MemoryEventHandler,
} from './MemoryManager';

export type {
  BackpressureConfig,
  BackpressureEventType,
  BackpressureEvent,
  BackpressureEventHandler,
} from './BackpressureController';

export type {
  ExportPhase,
  ExportProgress as ChunkedExportProgress,
  ExportStats,
  ExportResult,
  ExportError,
  ProgressEventType,
  ProgressEvent,
  ProgressEventHandler,
} from './ProgressReporter';

export type {
  ChunkedExportEngineConfig,
  ExportOptions as ChunkedExportOptions,
  ExportStatus,
  ExportStatusInfo,
  ChunkedExportEventType,
  ChunkedExportEvent,
  ChunkedExportEventHandler,
} from './ChunkedExportEngine';
