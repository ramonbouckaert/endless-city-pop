// Chord voicings: which notes a keyboard, pad or horn section plays for
// a chord. The bass has the root, so a chord of four notes or more leaves
// it out, and one of five or more its perfect fifth too; the rest sit in
// close position, the top note as near as it can be at or below an anchor.

import type { Chord } from './chord';
import { mod12 } from './pitch';

/** C5, the anchor a voicing's top note sits at or below unless given another. */
export const DEFAULT_ANCHOR = 72;

/** A chord's notes (MIDI, lowest first), the top one at or below `anchor`. */
export function voice(chord: Chord, anchor = DEFAULT_ANCHOR): number[] {
  const pcs = voicedPcs(chord);
  // The top note: the chord tone nearest at or below the anchor.
  const below = (pc: number) => mod12(anchor - pc);
  const top = pcs.reduce((best, pc) => (below(pc) < below(best) ? pc : best), pcs[0]);
  // Then each other tone, nearest below the one above it.
  const notes = [anchor - below(top)];
  let others = pcs.filter((pc) => pc !== top);
  while (others.length) {
    const above = notes[0];
    const next = others.reduce((best, pc) => (mod12(above - pc) < mod12(above - best) ? pc : best), others[0]);
    notes.unshift(above - (mod12(above - next) || 12));
    others = others.filter((pc) => pc !== next);
  }
  return notes;
}

/** Note `n` of a chord's voicing, counting up from its lowest; past the top, the voicing an octave up. */
export function voicingNote(chord: Chord, n: number, anchor = DEFAULT_ANCHOR): number {
  const notes = voice(chord, anchor);
  const octave = Math.floor(n / notes.length);
  return notes[n - octave * notes.length] + 12 * octave;
}

// The pitch classes a voicing plays: without the root (the bass's) in a
// chord of four notes or more, and without a perfect fifth when five or
// more are left.
function voicedPcs(chord: Chord): number[] {
  let tones = chord.tones.map(mod12).filter((t, i, all) => all.indexOf(t) === i);
  if (tones.length >= 4) tones = tones.filter((t) => t !== 0);
  if (tones.length >= 5) tones = tones.filter((t) => t !== 7);
  return tones.map((t) => mod12(chord.root + t));
}
