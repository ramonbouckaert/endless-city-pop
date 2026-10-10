// A bar of 16 sixteenth-note steps, each a gain (0 = silent): how drum
// parts are written.

export type StepGains = readonly number[];

export const empty = (): StepGains => Array.from({ length: 16 }, () => 0);

/** A bar with hits at some steps: { step: gain }. */
export const at = (hits: Readonly<Record<number, number>>): StepGains => empty().map((_, i) => hits[i] ?? 0);

/** A bar with hits at `list`, at one gain or a gain per step. */
export const steps = (list: readonly number[], gain: number | ((i: number) => number)): StepGains =>
  at(Object.fromEntries(list.map((i) => [i, typeof gain === 'number' ? gain : gain(i)])));

/**
 * `count` bars of items, looping `bars`, each item placed by `place`
 * (given the bar it falls in, and its index in that bar).
 */
export function loopBars<H, T>(
  bars: readonly (readonly H[])[],
  count: number,
  place: (item: H, bar: number, i: number) => T,
): T[] {
  return Array.from({ length: count }, (_, b) =>
    (bars[b % bars.length] ?? []).map((item, i) => place(item, b, i)),
  ).flat();
}
