export type EasingFunction = (t: number) => number;

const easingMap: Record<string, EasingFunction> = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => 1 - (1 - t) * (1 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export function applyEasing(progress: number, easing = 'linear'): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return (easingMap[easing] ?? easingMap.linear)(clamped);
}

export function interpolateValue(from: unknown, to: unknown, progress: number): unknown {
  if (typeof from === 'number' && typeof to === 'number') {
    return from + (to - from) * progress;
  }

  return progress < 0.5 ? from : to;
}

