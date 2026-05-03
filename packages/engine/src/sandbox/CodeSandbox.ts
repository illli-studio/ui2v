/**
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
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext('2d')!;

    if (!this.ctx) {
      throw new Error('Failed to create canvas context for sandbox');
    }
  }

  /**
   */
  async load(config: CodeConfig): Promise<void> {
    this.config = config;

    if (config.dependencies && config.dependencies.length > 0) {
      await this.loadDependencies(config.dependencies);
    }

    this.validateCode(config.source);

    try {
      const factory = this.executeCode(config.source);

      const context: AnimationContext = {
        canvas: this.canvas,
        ctx: this.ctx,
        width: this.canvas.width,
        height: this.canvas.height
      };

      this.instance = factory(context);

      if (!this.instance || typeof this.instance.animate !== 'function') {
        throw new Error('Code must return an object with an animate method');
      }

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
   */
  render(timestamp: number): void {
    if (!this.instance) {
      throw new Error('Animation instance is not initialized. Call load() first.');
    }

    this.frameCount++;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.instance.animate(timestamp);
  }

  /**
   */
  private executeCode(code: string): (ctx: AnimationContext) => AnimationInstance {
    const sandbox = this.createSandbox();

    const wrappedCode = `
      'use strict';
      ${code}
      
      if (typeof createAnimation === 'function') {
        return createAnimation;
      } else {
        throw new Error('Code must export a createAnimation function');
      }
    `;

    try {
      const func = new Function(...Object.keys(sandbox), wrappedCode);
      return func(...Object.values(sandbox));
    } catch (error) {
      throw new CodeExecutionError(error);
    }
  }

  /**
   */
  private createSandbox(): Record<string, any> {
    const libraryManager = getLibraryManager();

    const sandbox: Record<string, any> = {
      console: {
        log: (...args: any[]) => console.log('[user code]', ...args),
        warn: (...args: any[]) => console.warn('[user code]', ...args),
        error: (...args: any[]) => console.error('[user code]', ...args)
      },
      Math,
      Date
    };

    const libraries = ['anime', 'THREE', 'Matter', 'emotion', 'katex', 'math', 'd3', 'gsap', 'p5', 'fabric', 'rough', 'PIXI', 'TWEEN', 'paper', 'Chart'];
    libraries.forEach(libName => {
      const lib = libraryManager.getLibrary(libName);
      sandbox[libName] = lib;
    });

    return sandbox;
  }

  /**
   */
  private validateCode(code: string): void {

    const dangerousPatterns = [
      { pattern: /require\s*\(/g, msg: 'require is not allowed' },
      { pattern: /import\s+/g, msg: 'import is not allowed' },
      { pattern: /eval\s*\(/g, msg: 'eval is not allowed' },
      { pattern: /new\s+Function\s*\(/g, msg: 'Function constructor is not allowed' },
      { pattern: /process\./g, msg: 'process access is not allowed' },
      { pattern: /global\./g, msg: 'global access is not allowed' },
      { pattern: /window\./g, msg: 'window access is not allowed' },
      { pattern: /document\.(?!createElement|createTextNode)/g, msg: 'document access is not allowed except createElement/createTextNode' },
      { pattern: /\.exec\s*\(/g, msg: 'external command execution is not allowed' },
      { pattern: /child_process/g, msg: 'child processes are not allowed' },
      { pattern: /fs\./g, msg: 'file system access is not allowed' },
      { pattern: /fetch\s*\(/g, msg: 'network requests are not allowed' },
      { pattern: /XMLHttpRequest/g, msg: 'network requests are not allowed' },
      { pattern: /localStorage/g, msg: 'localStorage access is not allowed' },
      { pattern: /sessionStorage/g, msg: 'sessionStorage access is not allowed' },
      { pattern: /indexedDB/g, msg: 'indexedDB access is not allowed' },
    ];

    for (const { pattern, msg } of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new SecurityError(msg);
      }
    }

    if (code.length > 100000) {
      throw new SecurityError('Code is too long (>100KB)');
    }

    if (!code.includes('createAnimation')) {
      throw new SecurityError('Code must contain a createAnimation function');
    }

  }

  /**
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
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
   */
  dispose(): void {

    this.reset();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  }
}
