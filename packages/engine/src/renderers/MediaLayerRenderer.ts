import { BaseRenderer } from './base/BaseRenderer';
import { RendererType, type IRenderer, type RendererConfig, type RendererCapabilities } from './base/IRenderer';
import type { TemplateLayer, RenderContext } from '../types';
import { resolveMediaUrl } from '../utils/mediaUrl';

type MediaLayerKind = 'image-layer' | 'video-layer' | 'audio-layer';

interface MediaLayerProperties {
  src?: string;
  fitMode?: 'contain' | 'cover' | 'stretch';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  radius?: number;
  shadow?: boolean;
  accentColor?: string;
  muted?: boolean;
  volume?: number;
  trimStart?: number;
  trimEnd?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * Unified media renderer for image/video/audio layers.
 * Audio is represented on canvas as a timeline visualization placeholder.
 */
export class MediaLayerRenderer extends BaseRenderer implements IRenderer {
  readonly type = RendererType.Video;
  readonly capabilities: RendererCapabilities = {
    supportedLayerTypes: ['image-layer', 'video-layer', 'audio-layer'],
    supportsWebGL: false,
    supportsOffscreenCanvas: true,
    maxTextureSize: 8192,
    supportsShaders: false,
    supportsBatchRendering: false,
  };

  private imageCache = new Map<string, HTMLImageElement>();
  private videoCache = new Map<string, HTMLVideoElement>();
  private assetBaseUrl?: string;
  private assetBaseDir?: string;

  async initialize(config: RendererConfig): Promise<void> {
    await super.initialize(config);
    this.assetBaseUrl = config.assetBaseUrl;
    this.assetBaseDir = config.assetBaseDir;
  }

  private toMediaUrl(src: string, context?: RenderContext): string {
    return resolveMediaUrl(src, context?.assetBaseUrl ?? this.assetBaseUrl, context?.assetBaseDir ?? this.assetBaseDir);
  }

  async preload(layer: TemplateLayer): Promise<void> {
    const props = (layer.properties || {}) as MediaLayerProperties;
    if (!props.src) {
      return;
    }

    const kind = layer.type as MediaLayerKind;
    if (kind === 'image-layer') {
      const image = await this.getImage(props.src);
      if (!image) {
        throw new Error(`Failed to preload image-layer "${layer.name || layer.id}": ${props.src}`);
      }
      return;
    }

    if (kind === 'video-layer') {
      const video = await this.getVideo(props.src);
      if (!video) {
        throw new Error(`Failed to preload video-layer "${layer.name || layer.id}": ${props.src}`);
      }
      return;
    }

    if (kind === 'audio-layer') {
      const url = this.toMediaUrl(props.src);
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await response.arrayBuffer();
      } catch (error) {
        throw new Error(`Failed to preload audio-layer "${layer.name || layer.id}": ${props.src} (${(error as Error).message})`);
      }
    }
  }

  async render(layer: TemplateLayer, context: RenderContext): Promise<void> {
    const props = (layer.properties || {}) as MediaLayerProperties;
    const kind = layer.type as MediaLayerKind;
    const ctx = context.mainContext as CanvasRenderingContext2D;
    const width = context.width;
    const height = context.height;

    if (kind === 'audio-layer') {
      this.renderAudioPlaceholder(ctx, layer, props, width, height, context.time);
      return;
    }

    const src = props.src;
    if (!src) return;

    const x = props.x ?? 0;
    const y = props.y ?? 0;
    const drawWidth = props.width ?? width;
    const drawHeight = props.height ?? height;
    const opacity = props.opacity ?? layer.opacity ?? 1;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    this.applyMediaTransform(ctx, x, y, drawWidth, drawHeight, props);

    if (kind === 'image-layer') {
      const img = await this.getImage(src, context);
      if (img) {
        this.drawMediaFrame(ctx, img, 0, 0, drawWidth, drawHeight, props);
      }
    } else if (kind === 'video-layer') {
      const video = await this.getVideo(src, context);
      if (video && video.readyState >= 2) {
        const localTime = Math.max(0, context.time);
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const targetTime = Math.min(localTime, video.duration - 0.05);
          if (Math.abs(video.currentTime - targetTime) > 0.08) {
            try {
              await this.seekVideo(video, targetTime);
            } catch {
              // ignore seek jitter
            }
          }
        }
        this.drawMediaFrame(ctx, video, 0, 0, drawWidth, drawHeight, props);
      }
    }

    ctx.restore();
  }

  private drawWithFit(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number },
    x: number,
    y: number,
    targetW: number,
    targetH: number,
    fitMode: 'contain' | 'cover' | 'stretch',
  ) {
    const sourceW = (source as any).videoWidth || (source as any).naturalWidth || (source as any).width || targetW;
    const sourceH = (source as any).videoHeight || (source as any).naturalHeight || (source as any).height || targetH;
    if (!sourceW || !sourceH) return;

    if (fitMode === 'stretch') {
      ctx.drawImage(source as CanvasImageSource, x, y, targetW, targetH);
      return;
    }

    const srcAspect = sourceW / sourceH;
    const targetAspect = targetW / targetH;
    const useCover = fitMode === 'cover';
    const scale = useCover
      ? (srcAspect > targetAspect ? targetH / sourceH : targetW / sourceW)
      : (srcAspect > targetAspect ? targetW / sourceW : targetH / sourceH);

    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const drawX = x + (targetW - drawW) / 2;
    const drawY = y + (targetH - drawH) / 2;
    ctx.drawImage(source as CanvasImageSource, drawX, drawY, drawW, drawH);
  }

  private applyMediaTransform(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    props: MediaLayerProperties,
  ): void {
    const scaleX = props.scaleX ?? props.scale ?? 1;
    const scaleY = props.scaleY ?? props.scale ?? 1;
    const rotation = props.rotation ?? 0;
    ctx.translate(x + width / 2, y + height / 2);
    if (rotation) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }
    ctx.translate(-width / 2, -height / 2);
  }

  private drawMediaFrame(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number },
    x: number,
    y: number,
    width: number,
    height: number,
    props: MediaLayerProperties,
  ): void {
    const radius = Math.max(0, props.radius ?? 18);
    ctx.save();
    if (props.shadow !== false) {
      ctx.shadowColor = 'rgba(0,0,0,0.38)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      this.roundRect(ctx, x, y, width, height, radius);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.clip();
    this.drawWithFit(ctx, source, x, y, width, height, props.fitMode ?? 'contain');
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = props.accentColor ?? 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x + 0.75, y + 0.75, width - 1.5, height - 1.5, radius);
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private renderAudioPlaceholder(
    ctx: CanvasRenderingContext2D,
    layer: TemplateLayer,
    props: MediaLayerProperties,
    width: number,
    height: number,
    localTime: number,
  ) {
    const x = props.x ?? 20;
    const y = props.y ?? (height - 120);
    const w = props.width ?? Math.max(280, width - 40);
    const h = props.height ?? 80;
    localTime = Math.max(0, localTime);
    const accent = props.accentColor ?? '#6ee7ff';

    ctx.save();
    this.roundRect(ctx, x, y, w, h, 16);
    const panel = ctx.createLinearGradient(x, y, x + w, y + h);
    panel.addColorStop(0, 'rgba(255,255,255,0.16)');
    panel.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const bars = 64;
    for (let i = 0; i < bars; i++) {
      const px = x + 22 + (i / (bars - 1)) * (w - 44);
      const amplitude = 0.22 + 0.78 * Math.abs(Math.sin(i * 0.47 + localTime * 5.2) * Math.cos(i * 0.18 - localTime * 2.4));
      const ph = amplitude * h * 0.58;
      const top = y + (h - ph) / 2;
      ctx.moveTo(px, top);
      ctx.lineTo(px, top + ph);
    }
    ctx.stroke();

    const duration = Math.max(0.001, (layer.endTime ?? 0) - (layer.startTime ?? 0) || 1);
    const progress = Math.max(0, Math.min(1, localTime / duration));
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.roundRect(ctx, x + 22, y + h - 12, w - 44, 4, 2);
    ctx.fill();
    ctx.fillStyle = accent;
    this.roundRect(ctx, x + 22, y + h - 12, (w - 44) * progress, 4, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '600 13px sans-serif';
    ctx.fillText(layer.name || 'Audio', x + 22, y + 22);
    ctx.restore();
  }

  private async getImage(src: string, context?: RenderContext): Promise<HTMLImageElement | null> {
    const url = this.toMediaUrl(src, context);
    if (this.imageCache.has(url)) return this.imageCache.get(url)!;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    if (loaded) this.imageCache.set(url, loaded);
    return loaded;
  }

  private async getVideo(src: string, context?: RenderContext): Promise<HTMLVideoElement | null> {
    const url = this.toMediaUrl(src, context);
    if (this.videoCache.has(url)) return this.videoCache.get(url)!;

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = url;

    const loaded = await new Promise<HTMLVideoElement | null>((resolve) => {
      const done = () => {
        video.pause();
        resolve(video);
      };
      const fail = () => resolve(null);
      video.addEventListener('loadeddata', done, { once: true });
      video.addEventListener('error', fail, { once: true });
      video.load();
    });

    if (loaded) this.videoCache.set(url, loaded);
    return loaded;
  }

  private async seekVideo(video: HTMLVideoElement, targetTime: number): Promise<void> {
    if (Math.abs(video.currentTime - targetTime) <= 0.03) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      let timeout = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        video.removeEventListener('seeked', finish);
        video.removeEventListener('error', finish);
        resolve();
      };
      timeout = window.setTimeout(finish, 250);
      video.addEventListener('seeked', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
      video.currentTime = targetTime;
    });
  }

  dispose(): void {
    this.imageCache.clear();
    this.videoCache.forEach((video) => {
      try {
        video.pause();
        video.src = '';
      } catch {
        // ignore
      }
    });
    this.videoCache.clear();
  }
}
