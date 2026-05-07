export function resolveMediaUrl(src: string, assetBaseUrl?: string, assetBaseDir?: string): string {
  if (!src || typeof src !== 'string') {
    return src;
  }

  if (/^(?:https?:|data:|blob:|file:)/i.test(src)) {
    return src;
  }

  const normalized = src.replace(/\\/g, '/').replace(/^\.?\//, '');

  if (assetBaseUrl) {
    const base = assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`;
    return new URL(normalized, base).toString();
  }

  if (/^[a-zA-Z]:[\\/]/.test(src)) {
    return `file:///${src.replace(/\\/g, '/')}`;
  }

  if (src.startsWith('/')) {
    return `file://${src}`;
  }

  if (assetBaseDir) {
    const joined = `${assetBaseDir.replace(/\\/g, '/').replace(/\/$/, '')}/${normalized}`;
    if (/^[a-zA-Z]:\//.test(joined)) {
      return `file:///${joined}`;
    }
    return `file://${joined}`;
  }

  return normalized;
}
