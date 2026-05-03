/**
 * Template 渲染器
 * 基于JSON配置渲染预设模板动画
 */

import type { TemplateConfig, TemplateLayer, LayerProperties, RenderContext } from '../types';
import { RendererFactory } from '../renderers/RendererFactory';
import { getLibraryManager, type LibraryManager } from '../sandbox/LibraryManager';

export class TemplateRenderer {
  private mainCanvas: HTMLCanvasElement | OffscreenCanvas;
  private offscreenCanvas: HTMLCanvasElement | OffscreenCanvas;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private config: TemplateConfig | null = null;
  private container?: HTMLElement;

  private rendererFactory: RendererFactory;
  private isExporting = false;
  private renderScale = 1;

  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private libraryManager: LibraryManager;

  // 图层缓存系统
  private layerCache: Map<string, {
    canvas: OffscreenCanvas;
    lastRenderTime: number;
    isDynamic: boolean;
  }> = new Map();

  // 缓存命中统计
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, container?: HTMLElement) {
    this.mainCanvas = canvas;
    this.container = container;

    // [FIX] 使用 HTMLCanvasElement 而不是 OffscreenCanvas
    // 因为 roughjs 等库不支持 OffscreenCanvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width || 1920;
    this.offscreenCanvas.height = canvas.height || 1080;

    this.canvas = this.offscreenCanvas;
    this.ctx = this.offscreenCanvas.getContext('2d')!;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context for TemplateRenderer');
    }


    this.rendererFactory = new RendererFactory();
    this.libraryManager = getLibraryManager();  // v2.1: 获取库管理器单例
  }

  setExportMode(isExporting: boolean): void {
    this.isExporting = isExporting;
  }

  setRenderScale(scale: number): void {
    const clamped = Math.max(0.25, Math.min(4, scale));
    this.renderScale = clamped;
  }

  async preloadDependencies(dependencies: string[]): Promise<void> {
    await this.libraryManager.preloadDependencies(dependencies);
    await this.rendererFactory.initialize({
      canvas: this.offscreenCanvas,
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
      libraries: this.libraryManager.getAllLibraries()
    });
  }

  /**
   * 更新 canvas 尺寸
   */
  async updateCanvasSize(width: number, height: number): Promise<void> {
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;

      // 重新初始化高级渲染器（即使config为null也要初始化，因为可能在load之前调用）
      try {
        await this.rendererFactory.initialize({
          canvas: this.offscreenCanvas,
          width: this.offscreenCanvas.width,
          height: this.offscreenCanvas.height,
          libraries: this.libraryManager.getAllLibraries()
        });
      } catch (err) {
        console.error('Failed to reinitialize renderers:', err);
      }
    }
  }

  /**
   * 加载模板配置
   * Preload animation libraries used by the template.
   */
  async load(config: TemplateConfig): Promise<void> {
    if (!config.layers || config.layers.length === 0) {
      console.error('[TemplateRenderer] Config has no layers.');
      throw new Error('Template config must have at least one layer');
    }

    this.config = config;

    // 同步 canvas 尺寸
    if (this.mainCanvas.width > 0 && this.mainCanvas.height > 0) {
      await this.updateCanvasSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    await this.libraryManager.preloadDependencies(this.collectLayerDependencies(config.layers));

    // 传递库实例给渲染器
    await this.rendererFactory.initialize({
      canvas: this.offscreenCanvas,
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
      libraries: this.libraryManager.getAllLibraries()
    });

    // 预加载模板中涉及的所有层类型的渲染器
    const layerTypes = new Set(config.layers.map(l => l.type));
    const loadPromises = Array.from(layerTypes).map(type =>
      this.rendererFactory.getRendererForLayerType(type)
    );
    await Promise.all(loadPromises);

    await this.preloadResources(config.layers);
  }

  /**
   * 更新模板配置（用于热更新，不重新初始化渲染器）
   */
  async updateConfig(config: TemplateConfig): Promise<void> {
    this.config = config;
  }

  /**
   * 检测图层是否是动态的（需要每帧重绘）
   * 使用词边界正则，避免 "animations" 被误匹配为 "anime"
   */
  private isLayerDynamic(layer: TemplateLayer): boolean {
    if (layer.type === 'poster-static') {
      return false;
    }

    // 有 JSON 动画定义 → 动态
    if (layer.animations && layer.animations.length > 0) {
      return true;
    }

    if (layer.type === 'custom-code') {
      // 🎯 兼容性修复：支持 properties.code 或直接在 layer.code
      const code = (layer.properties as any)?.code || (layer as any).code || '';

      // 使用动画库（词边界匹配，防止 'animations' 误触发 'anime'）
      if (/\banime\b/.test(code) || /\bgsap\b/.test(code) || /\bTWEEN\b/.test(code)) {
        return true;
      }

      // 有 init 函数 → 通常有内部状态，认为是动态的
      if (/\binit\s*\(/.test(code)) {
        return true;
      }

      // 去除注释后检查是否使用了时间变量
      const codeWithoutComments = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      // 词边界检测：t / time / timestamp / frame 等时间驱动变量
      const timePattern = /\b(timestamp|frame|Date\.now|performance\.now|Math\.sin|Math\.cos)\b|\btime\b|\bt\s*[*+\-/%]|[*+\-/%]\s*t\b/;
      return timePattern.test(codeWithoutComments);
    }

    return false;
  }

  /**
   * 获取或创建图层缓存
   */
  private getLayerCache(layerId: string, width: number, height: number): OffscreenCanvas {
    let cache = this.layerCache.get(layerId);

    if (!cache || cache.canvas.width !== width || cache.canvas.height !== height) {
      const canvas = new OffscreenCanvas(width, height);
      cache = {
        canvas,
        lastRenderTime: -1,
        isDynamic: false
      };
      this.layerCache.set(layerId, cache);
    }

    return cache.canvas;
  }

  /**
   * 渲染单帧
   * @param time 当前时间（秒）
   */
  async render(time: number): Promise<void> {
    if (!this.config) {
      console.error('[TemplateRenderer] No config loaded!');
      throw new Error('Template配置未加载，请先调用 load()');
    }

    // 检查尺寸是否有效
    if (this.offscreenCanvas.width === 0 || this.offscreenCanvas.height === 0) {
      console.error('[TemplateRenderer] Offscreen canvas has invalid dimensions (0x0).');
      // 尝试从主 canvas 同步尺寸（异步调用，不阻塞渲染）
      if (this.mainCanvas.width > 0 && this.mainCanvas.height > 0) {
        this.updateCanvasSize(this.mainCanvas.width, this.mainCanvas.height).catch(err => {
          console.error('Failed to update canvas size:', err);
        });
      }
      // 这一帧跳过渲染
      return;
    }

    // 🎯 修复黑屏：使用黑色背景填充而不是清空，避免出现透明/黑屏闪烁
    // Clear offscreen canvas with black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sortedLayers = this.sortLayersByZIndex(this.config.layers);

    // 过滤可见图层
    const visibleLayers = sortedLayers.filter(layer => this.isLayerVisible(layer, time));

    // 渲染所有可见图层（按 zIndex 排序）
    for (const layer of visibleLayers) {
      await this.renderLayerWithCache(layer, time);
    }
  }

  /**
   * 使用缓存渲染图层
   */
  private async renderLayerWithCache(layer: TemplateLayer, time: number): Promise<void> {
    const cache = this.layerCache.get(layer.id);
    const isDynamic = this.isLayerDynamic(layer);

    // 🎯 修复黑屏问题：
    // 1. 对于动态图层，只在时间变化时重新渲染
    // 2. 对于静态图层，只在首次渲染时渲染
    // 3. 变换属性（x, y, rotation, scale）的变化不应该触发重新渲染，
    //    因为这些变换在 CustomCodeRenderer 中已经处理了
    const needsRerender = !cache ||
      cache.lastRenderTime === -1 ||
      (isDynamic && cache.lastRenderTime !== time);

    if (needsRerender) {
      this.cacheMisses++;

      // 获取缓存 canvas
      const cacheCanvas = this.getLayerCache(
        layer.id,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height
      );
      const cacheCtx = cacheCanvas.getContext('2d')!;

      // 清空缓存 canvas
      cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
      cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
      if (this.renderScale !== 1) {
        cacheCtx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
      }

      // 计算相对时间（秒）
      const runtimeLocalTime = (layer.properties as any)?.__runtimeLocalTime;
      const relativeTime = typeof runtimeLocalTime === 'number'
        ? runtimeLocalTime
        : Math.max(0, time - (layer.startTime || 0));

      // 创建临时渲染上下文，指向缓存 canvas
      const logicalWidth = cacheCanvas.width / this.renderScale;
      const logicalHeight = cacheCanvas.height / this.renderScale;
      const cacheRenderContext: RenderContext = {
        mainCanvas: cacheCanvas,
        mainContext: cacheCtx,
        width: logicalWidth,
        height: logicalHeight,
        pixelRatio: ((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) * this.renderScale,
        time: relativeTime,
        isExporting: this.isExporting,
        container: this.container
      };

      // 渲染到缓存
      await this.renderLayer(layer, time, cacheRenderContext);

      // 更新缓存信息
      const cacheEntry = this.layerCache.get(layer.id)!;
      cacheEntry.lastRenderTime = time;
      cacheEntry.isDynamic = isDynamic;
    } else {
      this.cacheHits++;
    }

    // 从缓存 blit 到主 canvas
    // 🎯 对于 custom-code 图层，变换已经在 CustomCodeRenderer 中应用了
    // 所以这里只需要简单 blit，不要再应用变换
    const cacheCanvas = this.layerCache.get(layer.id)!.canvas;
    const props = layer.properties as any;

    // 只应用透明度，不应用位置/旋转/缩放（custom-code 已经处理了）
    const opacity = props?.opacity ?? layer.opacity ?? 1;
    const hasOpacity = opacity !== 1;

    if (hasOpacity) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      this.ctx.drawImage(cacheCanvas as any, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(cacheCanvas as any, 0, 0);
    }
  }

  /**
   * 渲染单个图层
   */
  private async renderLayer(layer: TemplateLayer, time: number, context?: RenderContext): Promise<void> {
    let renderer = this.rendererFactory.getRendererForLayerTypeSync(layer.type);

    // 🎯 如果渲染器还没加载，尝试异步加载（这不应该发生，但作为后备）
    if (!renderer) {
      console.warn(`Renderer not loaded for layer type: ${layer.type}, attempting async load...`);
      // 异步加载渲染器，但这一帧跳过渲染
      this.rendererFactory.getRendererForLayerType(layer.type).then(r => {
        void r;
      });
      return;
    }

    try {
      // 如果传入了 context（来自缓存系统），直接使用它
      // 否则创建新的 context
      const renderContext: RenderContext = context || (() => {
        const runtimeLocalTime = (layer.properties as any)?.__runtimeLocalTime;
        const relativeTime = typeof runtimeLocalTime === 'number'
          ? runtimeLocalTime
          : Math.max(0, time - (layer.startTime || 0));
        return {
          mainCanvas: this.offscreenCanvas,
          mainContext: this.ctx,
          width: this.offscreenCanvas.width,
          height: this.offscreenCanvas.height,
          pixelRatio: (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
          time: relativeTime,
          isExporting: this.isExporting,
          container: this.container
        };
      })();

      // 使用正确的 context（可能是缓存 canvas 的 context）
      const targetCtx = renderContext.mainContext;

      targetCtx.save();
      try {
        await renderer.render(layer, renderContext, time);
      } finally {
        targetCtx.restore();
      }
    } catch (error) {
      console.error(`Renderer failed for layer "${layer.name}" (${layer.type}):`, error);
    }
  }

  /**
   * 应用变换
   */
  private applyTransform(props: LayerProperties): void {
    // 正确的变换顺序：
    // 1. translate到位置
    // 2. rotate（绕当前点旋转）
    // 3. scale
    // 然后在(0,0)渲染内容

    this.ctx.translate(props.x || 0, props.y || 0);

    if (props.rotation) {
      this.ctx.rotate((props.rotation * Math.PI) / 180);
    }

    if (props.scaleX !== undefined || props.scaleY !== undefined) {
      this.ctx.scale(props.scaleX || 1, props.scaleY || 1);
    }

    // 注意：不要translate回去！现在渲染应该在(0,0)相对于变换后的坐标系
  }

  /**
   * 获取指定时间点的图层属性（包含动画插值）
   */
  private getPropertiesAtTime(layer: TemplateLayer, time: number): LayerProperties {
    const props = { ...layer.properties };

    // 应用动画
    if (layer.animations && layer.animations.length > 0) {
      for (const animation of layer.animations) {
        // animation.duration 和 delay 都是秒
        const duration = animation.duration;
        const delay = animation.delay || 0;
        // 支持两种方式：startTime（绝对时间）或 delay（相对延迟）
        const animationStartTime = animation.startTime ?? (delay + (layer.startTime || 0));

        const localTime = time - animationStartTime;

        // ✨ 修复：如果在动画开始前，使用动画的起始值（from）
        if (localTime < 0) {
          if (animation.property && animation.from !== undefined) {
            props[animation.property] = animation.from;
          }
          continue;
        }

        // ✨ 修复：如果在动画结束后，使用动画的结束值（to）
        if (localTime > duration) {
          if (animation.property && animation.to !== undefined) {
            props[animation.property] = animation.to;
          }
          continue;
        }

        const progress = localTime / duration;
        const easedProgress = this.applyEasing(progress, animation.easing || 'linear');

        // 插值属性
        if (animation.property && animation.from !== undefined && animation.to !== undefined) {
          props[animation.property] = this.interpolate(
            animation.from,
            animation.to,
            easedProgress
          );
        }

        // 应用关键帧
        if (animation.keyframes && animation.property) {
          this.applyKeyframes(props, animation.keyframes, easedProgress, animation.property);
        }
      }
    }

    return props;
  }

  /**
   * 线性插值
   */
  private interpolate(from: number | string, to: number | string, progress: number): number | string {
    // 如果是数字，进行数值插值
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * progress;
    }
    // 如果是字符串（如颜色），在进度<0.5时返回from，否则返回to
    return progress < 0.5 ? from : to;
  }

  /**
   * 应用缓动函数
   */
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  /**
   * 应用关键帧
   * @param props 要修改的属性对象
   * @param keyframes 关键帧数组
   * @param progress 当前进度 (0-1)
   * @param targetProperty 目标属性名（如 'x', 'rotation' 等）
   */
  private applyKeyframes(props: LayerProperties, keyframes: any[], progress: number, targetProperty: string): void {
    // 找到当前进度所在的关键帧区间
    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];

      if (progress >= current.at && progress <= next.at) {
        const localProgress = (progress - current.at) / (next.at - current.at);

        // 关键帧使用 'value' 字段，需要映射到目标属性
        if (typeof current.value === 'number' && typeof next.value === 'number') {
          const interpolatedValue = this.interpolate(current.value, next.value, localProgress);
          (props as any)[targetProperty] = interpolatedValue;
        }

        break;
      }
    }
  }

  /**
   * 检查图层是否可见
   */
  private isLayerVisible(layer: TemplateLayer, time: number): boolean {
    if (layer.visible === false) return false;

    // 所有时间都是秒
    const startTime = layer.startTime || 0;
    const endTime = layer.endTime !== undefined ? layer.endTime : Infinity;

    return time >= startTime && time <= endTime;
  }

  /**
   * 按z-index排序图层
   */
  private sortLayersByZIndex(layers: TemplateLayer[]): TemplateLayer[] {
    return [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }

  /**
   * 预加载资源
   * (Simplified: Custom-code renderer handles its own loading)
   */
  private async preloadResources(layers: TemplateLayer[]): Promise<void> {
    // Legacy image preloading removed. 
    // CustomCodeRenderer handles its own dependencies via LibraryManager.
    return Promise.resolve();
  }

  /**
   * 加载单个图片
   * 支持网络URL和本地文件路径
   */
  private async loadImage(url: string): Promise<void> {
    if (this.loadedImages.has(url)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages.set(url, img);
        resolve();
      };

      img.onerror = () => {
        // console.error(`图片加载失败: ${url}`);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // 处理不同类型的路径
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // 网络图片
        img.src = url;
      } else if (url.startsWith("file://")) {
        // 已经是 file:// 协议
        img.src = url;
      } else if (url.startsWith("/") || /^[a-zA-Z]:\\/.test(url)) {
        // 本地绝对路径
        // Unix: /path/to/file
        // Windows: C:\path\to\file
        img.src = `file://${url}`;
      } else if (url.startsWith("data:")) {
        // Data URL (base64)
        img.src = url;
      } else {
        // 相对路径或其他
        img.src = url;
      }
    });
  }

  private collectLayerDependencies(layers: TemplateLayer[]): string[] {
    const dependencies = new Set<string>();

    for (const layer of layers) {
      const layerDependencies = [
        ...this.readDependencyList((layer as any).dependencies),
        ...this.readDependencyList(layer.properties?.dependencies),
      ];

      for (const dependency of layerDependencies) {
        dependencies.add(dependency);
      }
    }

    return Array.from(dependencies);
  }

  private readDependencyList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  getCanvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.offscreenCanvas;
  }

  /**
   * 获取渲染上下文
   */
  getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 解析CSS linear-gradient并创建Canvas渐变
   * 支持格式：linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
   */
  private parseLinearGradient(gradientStr: string, props: LayerProperties): CanvasGradient | null {
    try {
      // 简化解析：提取颜色stops
      const colorStopsMatch = gradientStr.match(/linear-gradient\([^,]+,\s*(.+)\)/);
      if (!colorStopsMatch) return null;

      const colorStopsStr = colorStopsMatch[1];
      const stops = colorStopsStr.split(',').map(s => s.trim());

      // 获取渐变角度
      const angleMatch = gradientStr.match(/(\d+)deg/);
      const angle = angleMatch ? parseInt(angleMatch[1]) : 180;

      // 计算渐变起点和终点
      const width = props.width || 100;
      const height = props.height || 100;

      let x0 = 0, y0 = 0, x1 = 0, y1 = height;

      if (angle === 0) {
        y0 = height; y1 = 0;
      } else if (angle === 90) {
        x0 = 0; x1 = width; y0 = 0; y1 = 0;
      } else if (angle === 135) {
        x0 = 0; y0 = 0; x1 = width; y1 = height;
      } else if (angle === 180) {
        y0 = 0; y1 = height;
      }

      const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);

      // 添加color stops
      stops.forEach(stop => {
        const parts = stop.trim().match(/([#\w(),]+)\s+(\d+)%/);
        if (parts) {
          const color = parts[1];
          const position = parseInt(parts[2]) / 100;
          gradient.addColorStop(position, color);
        }
      });

      return gradient;
    } catch (error) {
      // console.error('Failed to parse gradient:', error);
      return null;
    }
  }

  /**
   * 获取缓存命中统计
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  /**
   * 重置渲染器状态
   * 用于重新播放动画时清除缓存状态
   */
  reset(): void {
    this.rendererFactory.resetAll();
    this.layerCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.rendererFactory.dispose();
    this.loadedImages.clear();
    this.layerCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.config = null;
    this.ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }
}

