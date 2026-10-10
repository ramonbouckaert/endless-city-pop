// Chord voicings: which notes a keyboard, pad or horn section plays for
// a chord. The bass has the root, so a chord of four notes or more leaves
// it out, and one of five or more its perfect fifth too; the rest sit in
// close position, the top note as near as it can be at or below an anchor.

import type { Chord } from './chord';
import { PitchClass } from './pitch';

/** A chord voiced in close position under an anchor. */
export class Voicing {
  /** C5, the anchor a voicing's top note sits at or below unless given another. */
  static readonly DEFAULT_ANCHOR = 72;

  /** Its notes (MIDI, lowest first), the top one at or below the anchor. */
  readonly notes: readonly number[];

  constructor(chord: Chord, anchor = Voicing.DEFAULT_ANCHOR) {
    const pcs = Voicing.pcs(chord);
    // The top note: the chord tone nearest at or below the anchor.
    const below = (pc: number) => PitchClass.of(anchor - pc);
    const top = pcs.reduce((best, pc) => (below(pc) < below(best) ? pc : best), pcs[0]);
    // Then each other tone, nearest below the one above it.
    const notes = [anchor - below(top)];
    let others = pcs.filter((pc) => pc !== top);
    while (others.length) {
      const above = notes[0];
      const gap = (pc: number) => PitchClass.of(above - pc);
      const next = others.reduce((best, pc) => (gap(pc) < gap(best) ? pc : best), others[0]);
      notes.unshift(above - (gap(next) || 12));
      others = others.filter((pc) => pc !== next);
    }
    this.notes = notes;
  }

  /** Note `n`, counting up from the lowest; past the top, the voicing an octave up. */
  note(n: number): number {
    const octave = Math.floor(n / this.notes.length);
    return this.notes[n - octave * this.notes.length] + 12 * octave;
  }

  // The pitch classes a voicing plays: without the root (the bass's) in a
  // chord of four notes or more, and without a perfect fifth when five or
  // more are left.
  private static pcs(chord: Chord): number[] {
    let tones = chord.tones.map(PitchClass.of).filter((t, i, all) => all.indexOf(t) === i);
    if (tones.length >= 4) tones = tones.filter((t) => t !== 0);
    if (tones.length >= 5) tones = tones.filter((t) => t !== 7);
    return tones.map((t) => PitchClass.of(chord.root + t));
  }
}
