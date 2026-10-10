// A bar of 16 sixteenth-note steps, each a gain (0 = silent): how drum
// parts are written.

export type StepGains = readonly number[];

export const empty = (): StepGains => Array.from({ length: 16 }, () => 0);

/** A bar with hits at some steps: { step: gain }. */
export const at = (hits: Readonly<Record<number, number>>): StepGains => empty().map((_, i) => hits[i] ?? 0);

/** A bar with hits at `list`, at one gain or a gain per step. */
export const steps = (list: readonly number[], gain: number | ((i: number) => number)): StepGains =>
  at(Object.fromEntries(list.map((i) => [i, typeof gain === 'number' ? gain : gain(i)])));
