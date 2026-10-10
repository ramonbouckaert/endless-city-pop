// Pitch classes are integers 0-11 (C = 0).

import { FLAT_NAMES, SHARP_NAMES } from './tables';

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
export const pcName = (pc: number, flats = true): string => (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];

/** Items from a flat list, regrouped bar by bar like `like` (extra items are left over). */
export function reshape<T>(flat: readonly T[], like: readonly (readonly unknown[])[]): T[][] {
  const starts = like.map((_, b) => like.slice(0, b).reduce((n, bar) => n + bar.length, 0));
  return like.map((bar, b) => flat.slice(starts[b], starts[b] + bar.length));
}
