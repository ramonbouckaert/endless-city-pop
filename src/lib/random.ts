// Seeded randomness, so a seed always regenerates the same song.

/** Choices with weights: [item, weight] pairs. */
export type Weighted<T> = readonly (readonly [T, number])[];
/** Choices named by strings, with weights: { name: weight }. */
export type Odds<K extends string> = Readonly<Partial<Record<K, number>>>;
/** A [lo, hi) range to roll a number in. */
export type Range = readonly [number, number];

// Hash any string into a 32-bit seed (xmur3).
function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ (text.codePointAt(i) ?? 0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32: small, fast and good enough for music. A state gives a
// number in [0, 1) and the state after it.
function mulberry32(state: number): [value: number, next: number] {
  const a = Math.trunc(Math.trunc(state) + 0x6d2b79f5);
  const t = Math.imul(a ^ (a >>> 15), 1 | a);
  const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((u ^ (u >>> 14)) >>> 0) / 4294967296, a];
}

/** A stream of random numbers. Each draw moves it on: its one piece of state. */
export class Rng {
  private state: number;

  constructor(private readonly seed: string) {
    this.state = hashSeed(seed);
  }

  /** A number in [0, 1). */
  next(): number {
    const [value, state] = mulberry32(this.state);
    this.state = state;
    return value;
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
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items.length === 1 ? items[0] : items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(entries: Weighted<T>): T {
    if (entries.length === 1) return entries[0][0];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = this.next() * total;
    for (const [item, w] of entries) if ((r -= w) < 0) return item;
    const last = entries.at(-1);
    if (!last) throw new Error('Nothing to choose from');
    return last[0];
  }

  /** A key of a record, weighted by its entry (Odds) or its entry's `weight`, other than `except`. */
  weightedKey<K extends string>(
    entries: Readonly<Partial<Record<K, number | { readonly weight: number }>>>,
    except?: K,
  ): K {
    return this.weighted(
      Object.entries<number | { readonly weight: number } | undefined>(entries).flatMap(([k, v]) =>
        k === except || v === undefined ? [] : [[k as K, typeof v === 'number' ? v : v.weight] as const],
      ),
    );
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
