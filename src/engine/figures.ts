// The style's rhythms and figures (style/figures.ts) placed in time, in
// bars from the section's start.

import { loopBars } from '../lib/steps';
import type { Figure, Rhythm } from '../style';
import type { Span } from './score';

/** A figure's hit placed in time, in bars from the section's start. */
export interface Timed<V> extends Span {
  readonly value: V;
}

/** A rhythm's hits over `bars` bars. */
export function spans(rhythm: Rhythm, bars: number): Span[] {
  return loopBars(rhythm, bars, ([step, len], b) => ({ time: b + step / 16, dur: len / 16 }));
}

/** A figure's hits over `bars` bars, each with its value. */
export function timed<V>(figure: Figure<V>, bars: number): Timed<V>[] {
  return loopBars(figure, bars, ([step, len, value], b) => ({ time: b + step / 16, dur: len / 16, value }));
}

/** `bars` bars of a rhythm or figure: `rest` (looping) in all but the last, which plays `last`'s first bar. */
export function lastBar<H>(
  bars: number,
  last: readonly (readonly H[])[],
  rest: readonly (readonly H[])[] = [[]],
): (readonly H[])[] {
  return [...Array.from({ length: bars - 1 }, (_, b) => rest[b % rest.length] ?? []), last[0] ?? []];
}
