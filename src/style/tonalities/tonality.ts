// A mode's tonality as the writers ask of it: its data (TonalityDef),
// and the lookups on it that can fail or need fitting.

import { Template, type Chord, type Key, type Mode } from '../../theory';
import type { PreFlavour } from '../variants';
import type { TonalityDef, Turnaround } from './types';

// A tonality has its data's fields (merged in from this interface), and
// the lookups below on them.
export interface Tonality extends Readonly<TonalityDef> {}

export class Tonality {
  constructor(
    readonly mode: Mode,
    def: TonalityDef,
  ) {
    Object.assign(this, def);
  }

  /** Its bridges' templates, where the mode has them. */
  get bridges(): readonly string[] {
    const { bridge } = this.templates;
    if (!bridge?.length) throw new Error(`No bridge templates in ${this.mode}`);
    return bridge;
  }

  /** Its verses' loops (chords held two bars, never coming home): none, in a mode without them. */
  get verseLoops(): readonly string[] {
    return this.templates.verseLoop ?? [];
  }

  /**
   * Its bridges' templates for a body of `bars` (before the cadence home):
   * those that fill it once or twice over if any do (a ten-bar one in a
   * twelve-bar bridge), else all of them.
   */
  bridgeTemplates(bars: number): readonly string[] {
    return fitting(this.bridges, bars, [2]);
  }

  /**
   * A pre-chorus flavour's templates: those that fill `bars` in whole
   * repeats, once or twice over (a four-bar one twice in eight) if any
   * do, else up to four times (a four-bar one in sixteen); else all of
   * them.
   */
  preTemplates(flavour: PreFlavour, bars: number): readonly string[] {
    return fitting(this.pre[flavour], bars, [2, 4]);
  }

  /** A named turnaround into the key's tonic. */
  turnaround(name: string): Turnaround {
    const turnaround = this.turnarounds[name];
    if (!turnaround) throw new Error(`No ${name} turnaround in ${this.mode}`);
    return turnaround;
  }

  /** The symbol of the final chord, the one other chords resolve to. */
  get finaleSymbol(): string {
    return this.finale[0][0];
  }

  /** Is a chord the key's own tonic chord (a mixolydian I7, not a secondary dominant)? */
  isTonic(chord: Chord, key: Key): boolean {
    return chord.root === key.tonic && chord.cls === this.tonic;
  }
}

// The templates that fill `bars` in whole repeats, at most each of
// `maxRepeats` times over (the first that any fill); else all of them.
function fitting(options: readonly string[], bars: number, maxRepeats: readonly number[]): readonly string[] {
  const fills = (t: string, most: number) => {
    const { length } = new Template(t);
    return bars % length === 0 && bars / length <= most;
  };
  for (const most of maxRepeats) {
    const fit = options.filter((t) => fills(t, most));
    if (fit.length) return fit;
  }
  return options;
}
