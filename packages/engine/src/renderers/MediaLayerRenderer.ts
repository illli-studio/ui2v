import { BaseRenderer } from './base/BaseRenderer';
import { RendererType, type IRenderer, type RendererConfig, type RendererCapabilities } from './base/IRenderer';
import type { TemplateLayer, RenderContext } from '../types';

type MediaLayerKind = 'image-layer' | 'video-layer' | 'audio-layer';

interface MediaLayerProperties {
  src?: string;
  fitMode?: 'contain' | 'cover' | 'stretch';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  muted?: boolean;
  volume?: number;
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

  async initialize(config: RendererConfig): Promise<void> {
    await super.initialize(config);
  }

  private toMediaUrl(src: string): string {
    if (src.startsWith('file://') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    // Normalize Windows absolute path for file URL.
    if (/^[a-zA-Z]:[\\/]/.test(src)) {
      return `file:///${src.replace(/\\/g, '/')}`;
    }
    return `file://${src}`;
  }

  async render(layer: TemplateLayer, context: RenderContext): Promise<void> {
    const props = (layer.properties || {}) as MediaLayerProperties;
    const kind = layer.type as MediaLayerKind;
    const ctx = context.mainContext as CanvasRenderingContext2D;
    const width = context.width;
    const height = context.height;

    if (kind === 'audio-layer') {
      this.renderAudioPlaceholder(ctx, layer, props, width, height);
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

    if (kind === 'image-layer') {
      const img = await this.getImage(src);
      if (img) {
        this.drawWithFit(ctx, img, x, y, drawWidth, drawHeight, props.fitMode ?? 'contain');
      }
    } else if (kind === 'video-layer') {
      const video = await this.getVideo(src);
      if (video && video.readyState >= 2) {
        const layerStart = layer.startTime ?? 0;
        const localTime = Math.max(0, context.time - layerStart);
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const targetTime = Math.min(localTime, video.duration - 0.05);
          if (Math.abs(video.currentTime - targetTime) > 0.08) {
            try {
              video.currentTime = targetTime;
            } catch {
              // ignore seek jitter
            }
          }
        }
        this.drawWithFit(ctx, video, x, y, drawWidth, drawHeight, props.fitMode ?? 'contain');
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

  private renderAudioPlaceholder(
    ctx: CanvasRenderingContext2D,
    layer: TemplateLayer,
    props: MediaLayerProperties,
    width: number,
    height: number,
  ) {
    const x = props.x ?? 20;
    const y = props.y ?? (height - 120);
    const w = props.width ?? Math.max(280, width - 40);
    const h = props.height ?? 80;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.55)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(80, 180, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const bars = 56;
    for (let i = 0; i < bars; i++) {
      const px = x + (i / (bars - 1)) * w;
      const amplitude = 0.2 + 0.8 * Math.abs(Math.sin(i * 0.63));
      const ph = amplitude * h * 0.75;
      const top = y + (h - ph) / 2;
      ctx.moveTo(px, top);
      ctx.lineTo(px, top + ph);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '12px sans-serif';
    ctx.fillText(layer.name || 'Audio', x + 10, y + 16);
    ctx.restore();
  }

  private async getImage(src: string): Promise<HTMLImageElement | null> {
    if (this.imageCache.has(src)) return this.imageCache.get(src)!;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = this.toMediaUrl(src);
    });
    if (loaded) this.imageCache.set(src, loaded);
    return loaded;
  }

  private async getVideo(src: string): Promise<HTMLVideoElement | null> {
    if (this.videoCache.has(src)) return this.videoCache.get(src)!;

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = this.toMediaUrl(src);

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

    if (loaded) this.videoCache.set(src, loaded);
    return loaded;
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
