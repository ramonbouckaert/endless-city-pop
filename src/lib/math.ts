// Plain arithmetic on numbers and ranges, and lists looped.

import type { Range } from './random';

/** Where a number falls in a range: 0 at its low end or below, 1 at its high end or above. */
export function along(x: number, [lo, hi]: Range): number {
  return Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
}

/** `a` to `b`, `t` of the way (exactly `b` at 1). */
export function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

/** `count` items, looping `items` from its first. */
export function cycle<T>(items: readonly T[], count: number): T[] {
  if (!items.length && count > 0) throw new Error('Nothing to loop');
  return Array.from({ length: count }, (_, i) => items[i % items.length]);
}
