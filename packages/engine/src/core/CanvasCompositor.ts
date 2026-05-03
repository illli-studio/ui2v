/**
 */

import type { ExportOptions } from '../types';

export class CanvasCompositor {
  private mainCanvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.mainCanvas = canvas;
    // @ts-ignore
    this.ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
    })!;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
  }

  /**
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  /**
   */
  fillBackground(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  /**
   */
  composite(templateCanvas: HTMLCanvasElement | OffscreenCanvas, codeCanvas?: HTMLCanvasElement | OffscreenCanvas): void {
    this.ctx.drawImage(templateCanvas as any, 0, 0);

    if (codeCanvas) {
      this.ctx.drawImage(codeCanvas as any, 0, 0);
    }
  }

  /**
   */
  drawCanvas(
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): void {
    // Check if source canvas has valid dimensions
    if (sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      return;
    }

    if (width !== undefined && height !== undefined) {
      this.ctx.drawImage(sourceCanvas as any, x, y, width, height);
    } else {
      this.ctx.drawImage(sourceCanvas as any, x, y);
    }
  }

  /**
   */
  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   */
  resetGlobalAlpha(): void {
    this.ctx.globalAlpha = 1;
  }

  /**
   */
  setBlendMode(mode: GlobalCompositeOperation): void {
    this.ctx.globalCompositeOperation = mode;
  }

  /**
   */
  resetBlendMode(): void {
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   */
  drawError(message: string): void {
    const width = this.mainCanvas.width;
    const height = this.mainCanvas.height;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, width - 20, height - 20);

    const centerX = width / 2;
    const centerY = height / 2 - 50;
    const radius = 40;

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    const crossSize = 25;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crossSize, centerY - crossSize);
    this.ctx.lineTo(centerX + crossSize, centerY + crossSize);
    this.ctx.moveTo(centerX + crossSize, centerY - crossSize);
    this.ctx.lineTo(centerX - crossSize, centerY + crossSize);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Render Error', centerX, centerY + radius + 40);

    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#666666';

    const maxWidth = width - 100;
    const lines = this.wrapText(message, maxWidth);
    lines.forEach((line, index) => {
      this.ctx.fillText(line, centerX, centerY + radius + 80 + index * 25);
    });

    this.ctx.restore();
  }

  /**
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   */
  captureFrame(): ImageData {
    console.warn('[CanvasCompositor] ⚠️ captureFrame() performs poorly on macOS; use  captureFrameAsBlob()');
    return this.ctx.getImageData(
      0,
      0,
      this.mainCanvas.width,
      this.mainCanvas.height
    );
  }

  /**
   */
  async captureFrameAsBlob(type: string = 'image/png', quality: number = 1.0): Promise<Blob> {
    if (this.mainCanvas instanceof OffscreenCanvas) {
      return this.mainCanvas.convertToBlob({
        type: type as any,
        quality
      });
    }

    return new Promise((resolve, reject) => {
      (this.mainCanvas as HTMLCanvasElement).toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture frame as blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   */
  getCanvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.mainCanvas;
  }

  /**
   */
  getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   */
  dispose(): void {
    this.clear();
  }
}


