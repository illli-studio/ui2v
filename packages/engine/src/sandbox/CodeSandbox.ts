/**
 * Code 沙箱
 * 安全地执行用户生成的动画代码
 */

import type { CodeConfig, AnimationContext, AnimationInstance } from '../types';
import { CodeExecutionError, SecurityError } from '../types';
import { getLibraryManager } from './LibraryManager';

// Legacy browser sandbox retained for compatibility. The primary custom-code
// path uses the runtime helpers in CustomCodeRuntime.

export class CodeSandbox {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private instance: AnimationInstance | null = null;

  private startTime = 0;
  private frameCount = 0;
  private config: CodeConfig | null = null;

  constructor() {
    // 创建离屏canvas用于Code模式渲染
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext('2d')!;

    if (!this.ctx) {
      throw new Error('Failed to create canvas context for sandbox');
    }
  }

  /**
   * 加载并初始化动画代码
   */
  async load(config: CodeConfig): Promise<void> {
    this.config = config;

    // 1. 加载依赖库
    if (config.dependencies && config.dependencies.length > 0) {
      await this.loadDependencies(config.dependencies);
    }

    // 2. 安全验证
    this.validateCode(config.source);

    // 3. 执行代码获取工厂函数
    try {
      const factory = this.executeCode(config.source);

      // 4. 创建动画实例
      const context: AnimationContext = {
        canvas: this.canvas,
        ctx: this.ctx,
        width: this.canvas.width,
        height: this.canvas.height
      };

      this.instance = factory(context);

      if (!this.instance || typeof this.instance.animate !== 'function') {
        throw new Error('代码必须返回包含 animate 方法的对象');
      }

      // 5. 调用初始化方法
      if (this.instance.init) {
        this.instance.init();
      }

      this.startTime = Date.now();
      this.frameCount = 0;
    } catch (error) {
      throw new CodeExecutionError(error);
    }
  }

  /**
   * 加载依赖库
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    const libraryManager = getLibraryManager();

    for (const dep of dependencies) {
      switch (dep.toLowerCase()) {
        case 'anime':
        case 'animejs':
          await libraryManager.loadAnime();
          break;
        case 'three':
        case 'threejs':
          await libraryManager.loadThree();
          break;
        case 'matter':
        case 'matterjs':
          await libraryManager.loadMatter();
          break;
        case 'emotion':
          await libraryManager.loadEmotion();
          break;
        case 'katex':
          await libraryManager.loadKatex();
          break;
        case 'math':
        case 'mathjs':
          await libraryManager.loadMathjs();
          break;
        case 'd3':
        case 'd3js':
          await libraryManager.loadD3();
          break;
        case 'gsap':
          await libraryManager.loadGSAP();
          break;
        case 'p5':
        case 'p5js':
          await libraryManager.loadP5();
          break;
        case 'fabric':
        case 'fabricjs':
          await libraryManager.loadFabric();
          break;
        case 'rough':
        case 'roughjs':
          await libraryManager.loadRough();
          break;
        case 'pixi':
        case 'pixijs':
          await libraryManager.loadPixi();
          break;
        case 'tween':
        case 'tweenjs':
          await libraryManager.loadTween();
          break;
        case 'paper':
        case 'paperjs':
          await libraryManager.loadPaper();
          break;
        case 'konva':
          await libraryManager.loadKonva();
          break;
        case 'lottie':
        case 'lottiejs':
        case 'lottie-web':
          await libraryManager.loadLottie();
          break;
      }
    }
  }

  /**
   * 渲染单帧
   */
  render(timestamp: number): void {
    if (!this.instance) {
      throw new Error('动画实例未初始化，请先调用 load()');
    }

    this.frameCount++;

    // 执行动画代码
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.instance.animate(timestamp);
  }

  /**
   * 执行代码
   */
  private executeCode(code: string): (ctx: AnimationContext) => AnimationInstance {
    // 创建安全的执行环境
    const sandbox = this.createSandbox();

    // 构建包装代码
    const wrappedCode = `
      'use strict';
      ${code}
      
      // 确保返回工厂函数
      if (typeof createAnimation === 'function') {
        return createAnimation;
      } else {
        throw new Error('代码必须导出 createAnimation 函数');
      }
    `;

    // 使用Function构造函数执行（注意：这不如VM2安全）
    try {
      const func = new Function(...Object.keys(sandbox), wrappedCode);
      return func(...Object.values(sandbox));
    } catch (error) {
      throw new CodeExecutionError(error);
    }
  }

  /**
   * 创建沙箱环境
   */
  private createSandbox(): Record<string, any> {
    const libraryManager = getLibraryManager();

    // 创建沙箱并注入库
    const sandbox: Record<string, any> = {
      // 基础对象
      console: {
        log: (...args: any[]) => console.log('[用户代码]', ...args),
        warn: (...args: any[]) => console.warn('[用户代码]', ...args),
        error: (...args: any[]) => console.error('[用户代码]', ...args)
      },
      Math,
      Date
    };

    // 注入已加载的库
    const libraries = ['anime', 'THREE', 'Matter', 'emotion', 'katex', 'math', 'd3', 'gsap', 'p5', 'fabric', 'rough', 'PIXI', 'TWEEN', 'paper', 'Chart'];
    libraries.forEach(libName => {
      const lib = libraryManager.getLibrary(libName);
      sandbox[libName] = lib;
    });

    return sandbox;
  }

  /**
   * 代码安全验证
   */
  private validateCode(code: string): void {

    // 危险模式检测
    const dangerousPatterns = [
      { pattern: /require\s*\(/g, msg: '不允许使用 require' },
      { pattern: /import\s+/g, msg: '不允许使用 import' },
      { pattern: /eval\s*\(/g, msg: '不允许使用 eval' },
      { pattern: /new\s+Function\s*\(/g, msg: '不允许使用 Function 构造函数' }, // 修改：只检查 new Function，允许普通的 function 关键字
      { pattern: /process\./g, msg: '不允许访问 process' },
      { pattern: /global\./g, msg: '不允许访问 global' },
      { pattern: /window\./g, msg: '不允许访问 window' },
      { pattern: /document\.(?!createElement|createTextNode)/g, msg: '不允许访问 document（除了createElement）' },
      { pattern: /\.exec\s*\(/g, msg: '不允许执行外部命令' },
      { pattern: /child_process/g, msg: '不允许使用子进程' },
      { pattern: /fs\./g, msg: '不允许文件系统访问' },
      { pattern: /fetch\s*\(/g, msg: '不允许网络请求' },
      { pattern: /XMLHttpRequest/g, msg: '不允许网络请求' },
      { pattern: /localStorage/g, msg: '不允许访问 localStorage' },
      { pattern: /sessionStorage/g, msg: '不允许访问 sessionStorage' },
      { pattern: /indexedDB/g, msg: '不允许访问 indexedDB' },
    ];

    for (const { pattern, msg } of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new SecurityError(msg);
      }
    }

    // 代码长度检查
    if (code.length > 100000) {
      throw new SecurityError('代码过长（>100KB）');
    }

    // 检查是否导出createAnimation函数
    if (!code.includes('createAnimation')) {
      throw new SecurityError('代码必须包含 createAnimation 函数');
    }

  }

  /**
   * 获取渲染canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 获取渲染上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    frameCount: number;
    elapsed: number;
    fps: number;
  } {
    const elapsed = Date.now() - this.startTime;
    const fps = this.frameCount / (elapsed / 1000);

    return {
      frameCount: this.frameCount,
      elapsed,
      fps
    };
  }

  /**
   * 重置沙箱
   */
  reset(): void {
    if (this.instance && this.instance.dispose) {
      try {
        this.instance.dispose();
      } catch (error) {
        // Ignore user-defined dispose failures during cleanup.
      }
    }

    this.instance = null;
    this.startTime = 0;
    this.frameCount = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Retained for compatibility with older callers.
   */
  setExportMode(isExporting: boolean): void {
    void isExporting;
  }

  /**
   * 清理资源
   */
  dispose(): void {

    this.reset();

    // 清理canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  }
}
