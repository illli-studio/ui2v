import type {
  DrawCommand,
  DrawCommandStream,
  DrawLayerCommand,
  RuntimeMatrix2D,
} from '@ui2v/runtime-core';

export interface CanvasDrawCommandExecutorOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  onDrawLayer?: (command: DrawLayerCommand, context: CanvasDrawCommandContext) => Promise<void> | void;
  onCustomCommand?: (command: Extract<DrawCommand, { op: 'custom' }>, context: CanvasDrawCommandContext) => Promise<void> | void;
}

export interface CanvasDrawCommandContext {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  stream: DrawCommandStream;
}

export interface CanvasDrawCommandExecutionResult {
  commandCount: number;
  drawLayerCount: number;
  customCommandCount: number;
  skippedDrawLayerCount: number;
}

export class CanvasDrawCommandExecutor {
  private readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  private readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private readonly onDrawLayer?: CanvasDrawCommandExecutorOptions['onDrawLayer'];
  private readonly onCustomCommand?: CanvasDrawCommandExecutorOptions['onCustomCommand'];

  constructor(options: CanvasDrawCommandExecutorOptions) {
    this.canvas = options.canvas;
    const context = options.context ?? options.canvas.getContext('2d');
    if (!context) {
      throw new Error('CanvasDrawCommandExecutor requires a 2D canvas context');
    }

    this.context = context;
    this.onDrawLayer = options.onDrawLayer;
    this.onCustomCommand = options.onCustomCommand;
  }

  async execute(stream: DrawCommandStream): Promise<CanvasDrawCommandExecutionResult> {
    const result: CanvasDrawCommandExecutionResult = {
      commandCount: stream.commands.length,
      drawLayerCount: 0,
      customCommandCount: 0,
      skippedDrawLayerCount: 0,
    };
    const commandContext: CanvasDrawCommandContext = {
      canvas: this.canvas,
      context: this.context,
      stream,
    };

    for (const command of stream.commands) {
      switch (command.op) {
        case 'clear':
          this.executeClear(command.color);
          break;
        case 'save':
          this.context.save();
          break;
        case 'restore':
          this.context.restore();
          break;
        case 'setTransform':
          this.setMatrix(command.matrix);
          break;
        case 'setOpacity':
          this.context.globalAlpha = clampOpacity(command.opacity);
          break;
        case 'drawLayer':
          result.drawLayerCount += 1;
          if (this.onDrawLayer) {
            await this.onDrawLayer(command, commandContext);
          } else {
            result.skippedDrawLayerCount += 1;
          }
          break;
        case 'custom':
          result.customCommandCount += 1;
          if (this.executeBuiltInCustomCommand(command)) {
            break;
          }
          if (this.onCustomCommand) {
            await this.onCustomCommand(command, commandContext);
          }
          break;
      }
    }

    return result;
  }

  private executeClear(color?: string): void {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.globalAlpha = 1;
    if (color) {
      this.context.fillStyle = color;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private setMatrix(matrix: RuntimeMatrix2D): void {
    this.context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  }

  private executeBuiltInCustomCommand(command: Extract<DrawCommand, { op: 'custom' }>): boolean {
    if (command.name !== 'runtime-transition-overlay') {
      return false;
    }

    const payload = command.payload as any;
    const transition = payload?.transition;
    if (!transition) {
      return true;
    }

    const progress = clampOpacity(Number(transition.progress ?? 0));
    const phase = transition.phase === 'out' ? 'out' : 'in';
    const type = String(transition.type ?? 'fade');
    const direction = String(transition.direction ?? 'left');
    const width = Number(payload?.size?.width ?? this.canvas.width);
    const height = Number(payload?.size?.height ?? this.canvas.height);
    const alpha = phase === 'in' ? 1 - progress : progress;

    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.globalAlpha = clampOpacity(alpha);
    this.context.fillStyle = resolveTransitionColor(payload?.backgroundColor);

    if (type === 'wipe' || type === 'slide' || type === 'dashboard-swap' || type === 'data-morph' || type === 'map-flyover') {
      const amount = phase === 'in' ? 1 - progress : progress;
      drawWipe(this.context, width, height, amount, direction);
    } else if (type === 'terminal-scan') {
      this.context.globalAlpha = clampOpacity(alpha * 0.75);
      const stripe = Math.max(10, height * 0.08);
      const y = phase === 'in' ? (1 - progress) * height : progress * height;
      this.context.fillRect(0, y - stripe / 2, width, stripe);
      this.context.globalAlpha = clampOpacity(alpha * 0.22);
      for (let line = 0; line < height; line += 10) {
        this.context.fillRect(0, line, width, 1);
      }
    } else if (type === 'glitch' || type === 'alert-zoom') {
      this.context.globalAlpha = clampOpacity(alpha * 0.24);
      this.context.fillRect(0, 0, width, height);
      this.context.globalAlpha = clampOpacity(alpha * 0.52);
      for (let i = 0; i < 8; i++) {
        const y = (i * 97 + progress * height * 0.7) % height;
        this.context.fillRect(0, y, width, 4 + (i % 3) * 3);
      }
    } else {
      this.context.fillRect(0, 0, width, height);
    }

    this.context.restore();
    return true;
  }
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(1, value));
}

function resolveTransitionColor(backgroundColor: unknown): string {
  return typeof backgroundColor === 'string' && backgroundColor.length > 0
    ? backgroundColor
    : '#000';
}

function drawWipe(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  direction: string
): void {
  const clamped = Math.max(0, Math.min(1, amount));
  if (direction === 'right') {
    context.fillRect(width * (1 - clamped), 0, width * clamped, height);
    return;
  }
  if (direction === 'up') {
    context.fillRect(0, 0, width, height * clamped);
    return;
  }
  if (direction === 'down') {
    context.fillRect(0, height * (1 - clamped), width, height * clamped);
    return;
  }
  context.fillRect(0, 0, width * clamped, height);
}
