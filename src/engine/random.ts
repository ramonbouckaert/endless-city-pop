// Seeded randomness, so a seed always regenerates the same song.

import type { Range, Weighted } from './types';

// Hash any string into a 32-bit seed (xmur3).
function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32: small, fast and good enough for music.
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  readonly next: () => number;

  constructor(private readonly seed: string) {
    this.next = mulberry32(hashSeed(seed));
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** A number in [lo, hi). */
  range([lo, hi]: Range): number {
    return lo + this.next() * (hi - lo);
  }

  // Certain outcomes (p of 0 or 1, a single choice) don't draw from the
  // stream, so they can't shift the rolls after them.
  chance(p: number): boolean {
    return p <= 0 ? false : p >= 1 ? true : this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items.length === 1 ? items[0] : items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(entries: Weighted<T>): T {
    if (entries.length === 1) return entries[0][0];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = this.next() * total;
    for (const [item, w] of entries) if ((r -= w) < 0) return item;
    return entries[entries.length - 1][0];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * An independent stream, so adding a random call in one part of the
   * generator doesn't reshuffle every part after it.
   */
  fork(label: string): Rng {
    return new Rng(`${this.seed}/${label}`);
  }
}

export const randomSeed = (): string => Math.random().toString(36).slice(2, 8);
