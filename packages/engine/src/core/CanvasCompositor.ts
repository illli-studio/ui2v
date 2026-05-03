/**
 * Canvas 合成器
 * 负责将多个canvas合成到主canvas上
 */

import type { ExportOptions } from '../types';

export class CanvasCompositor {
  private mainCanvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.mainCanvas = canvas;
    // [MAC PERF FIX] 优化 Canvas 上下文参数以提升 macOS Metal 性能
    // @ts-ignore
    this.ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true,  // 允许异步渲染，减少 GPU 同步等待（Mac Metal 优化）
      willReadFrequently: false,  // 明确声明不频繁读取，避免 GPU→CPU 回读
    })!;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
  }

  /**
   * 清空canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  /**
   * 填充背景色
   */
  fillBackground(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  /**
   * 合成两个canvas
   * @param templateCanvas Template模式渲染的canvas
   * @param codeCanvas Code模式渲染的canvas
   */
  composite(templateCanvas: HTMLCanvasElement | OffscreenCanvas, codeCanvas?: HTMLCanvasElement | OffscreenCanvas): void {
    // 先绘制Template层（背景/基础元素）
    this.ctx.drawImage(templateCanvas as any, 0, 0);

    // 再绘制Code层（特效/粒子）
    if (codeCanvas) {
      this.ctx.drawImage(codeCanvas as any, 0, 0);
    }
  }

  /**
   * 绘制单个canvas到指定位置
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
   * 应用全局透明度
   */
  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * 重置全局透明度
   */
  resetGlobalAlpha(): void {
    this.ctx.globalAlpha = 1;
  }

  /**
   * 设置混合模式
   */
  setBlendMode(mode: GlobalCompositeOperation): void {
    this.ctx.globalCompositeOperation = mode;
  }

  /**
   * 重置混合模式
   */
  resetBlendMode(): void {
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * 绘制错误占位符
   */
  drawError(message: string): void {
    const width = this.mainCanvas.width;
    const height = this.mainCanvas.height;

    this.ctx.save();

    // 绘制半透明红色背景
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, width, height);

    // 绘制边框
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, width - 20, height - 20);

    // 绘制错误图标
    const centerX = width / 2;
    const centerY = height / 2 - 50;
    const radius = 40;

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // 绘制叉号
    const crossSize = 25;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crossSize, centerY - crossSize);
    this.ctx.lineTo(centerX + crossSize, centerY + crossSize);
    this.ctx.moveTo(centerX + crossSize, centerY - crossSize);
    this.ctx.lineTo(centerX - crossSize, centerY + crossSize);
    this.ctx.stroke();

    // 绘制错误文本
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('渲染错误', centerX, centerY + radius + 40);

    // 绘制错误消息
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#666666';

    // 自动换行显示错误消息
    const maxWidth = width - 100;
    const lines = this.wrapText(message, maxWidth);
    lines.forEach((line, index) => {
      this.ctx.fillText(line, centerX, centerY + radius + 80 + index * 25);
    });

    this.ctx.restore();
  }

  /**
   * 文本自动换行
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
   * 捕获当前帧为ImageData
   * [MAC PERF WARNING] 此方法在 macOS Metal 管线上会造成 50-200ms 的卡顿
   * 建议使用 captureFrameAsBlob() 替代
   * @deprecated 使用 captureFrameAsBlob() 以获得更好的性能
   */
  captureFrame(): ImageData {
    console.warn('[CanvasCompositor] ⚠️ captureFrame() 在 macOS 上性能较差，建议使用 captureFrameAsBlob()');
    return this.ctx.getImageData(
      0,
      0,
      this.mainCanvas.width,
      this.mainCanvas.height
    );
  }

  /**
   * 捕获当前帧为Blob (用于导出)
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
   * 获取主canvas
   */
  getCanvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.mainCanvas;
  }

  /**
   * 获取渲染上下文
   */
  getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // Canvas的清理主要是清除内容
    this.clear();
  }
}


