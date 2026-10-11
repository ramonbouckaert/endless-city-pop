// Chord voicings: which notes a keyboard, pad or horn section plays for
// a chord. The bass has the root, so a chord of four notes or more leaves
// it out, and one of five or more its perfect fifth too; the rest sit in
// close position, the top note as near as it can be at or below an anchor.
// Fusion voices them two other ways: stacked in fourths from a colour
// tone (quartal), or spread wide, root and fifth low under the rest.

import type { Chord } from './chord';
import { PitchClass } from './pitch';

/** How a chord is voiced: in close position, in fourths, or spread wide. */
export type VoicingStyle = 'close' | 'quartal' | 'spread';

/** A chord voiced under an anchor. */
export class Voicing {
  /** C5, the anchor a voicing's top note sits at or below unless given another. */
  static readonly DEFAULT_ANCHOR = 72;
  /** Notes in a quartal voicing. */
  static readonly QUARTAL_NOTES = 4;
  /** How far under the anchor a spread voicing's root sits, at least. */
  static readonly SPREAD_DEPTH = 26;

  /** `notes`: its notes (MIDI, lowest first), the top one at or below the anchor. */
  private constructor(readonly notes: readonly number[]) {}

  /** A chord voiced in a style (close position unless given another) under an anchor. */
  static of(chord: Chord, anchor = Voicing.DEFAULT_ANCHOR, style: VoicingStyle = 'close'): Voicing {
    switch (style) {
      case 'close':
        return new Voicing(Voicing.close(Voicing.pcs(chord), anchor));
      case 'quartal':
        return new Voicing(Voicing.quartal(chord, anchor));
      case 'spread':
        return new Voicing(Voicing.spread(chord, anchor));
    }
  }

  /** Note `n`, counting up from the lowest; past the top, the voicing an octave up. */
  note(n: number): number {
    const octave = Math.floor(n / this.notes.length);
    return this.notes[n - octave * this.notes.length] + 12 * octave;
  }

  // Pitch classes in close position: the top note the one nearest at or
  // below the anchor, then each other nearest below the one above it.
  private static close(pcs: readonly number[], anchor: number): number[] {
    const below = (pc: number) => PitchClass.of(anchor - pc);
    const top = pcs.reduce((best, pc) => (below(pc) < below(best) ? pc : best), pcs[0]);
    const notes = [anchor - below(top)];
    let others = pcs.filter((pc) => pc !== top);
    while (others.length) {
      const above = notes[0];
      const gap = (pc: number) => PitchClass.of(above - pc);
      const next = others.reduce((best, pc) => (gap(pc) < gap(best) ? pc : best), others[0]);
      notes.unshift(above - (gap(next) || 12));
      others = others.filter((pc) => pc !== next);
    }
    return notes;
  }

  // Fourths down the chord-scale from its colour tone nearest at or below
  // the anchor; a third where a fourth would be a tritone (as in the So
  // What chord) or an avoid note, a semitone above a chord tone. A
  // dominant keeps its guide tones (guided).
  private static quartal(chord: Chord, anchor: number): number[] {
    if (chord.cls === 'dom' || chord.cls === 'aug') return Voicing.guided(chord, anchor);
    const { pitch, avoid } = Voicing.stacking(chord);
    const colours = Voicing.pcs(chord).filter((pc) => pc !== chord.root);
    const below = (pc: number) => PitchClass.of(anchor - pc);
    const top = anchor - below(colours.reduce((best, pc) => (below(pc) < below(best) ? pc : best), colours[0]));
    let degree = chord.chordScale.degree(top - chord.root).step;
    const notes = [top];
    while (notes.length < Voicing.QUARTAL_NOTES) {
      const fourth = pitch(degree - 3);
      const next = notes[0] - fourth === 6 || avoid(fourth) ? degree - 2 : degree - 3;
      notes.unshift(pitch(next));
      degree = next;
    }
    return notes;
  }

  // A dominant in fourths over its guide tones: its 7th under its 3rd (a
  // tritone), then fourths up the chord-scale from the 3rd (a third where
  // a fourth would be a tritone or an avoid note), as in 7-3-13-9 or, on
  // an altered chord, 7-3-b13-b9; the top at or below the anchor.
  private static guided(chord: Chord, anchor: number): number[] {
    const { pitch, avoid } = Voicing.stacking(chord);
    let degree = chord.chordScale.degree(4).step;
    let top = pitch(degree);
    const notes = [chord.root - 2, top];
    while (notes.length < Voicing.QUARTAL_NOTES) {
      const fourth = pitch(degree + 3);
      degree += fourth - top === 6 || avoid(fourth) ? 2 : 3;
      top = pitch(degree);
      notes.push(top);
    }
    const up = 12 * Math.floor((anchor - top) / 12);
    return notes.map((n) => n + up);
  }

  // What stacking a chord-scale needs: a degree's pitch (counted from the
  // root's pitch class as a MIDI note), and whether a note is an avoid
  // note, a semitone above a chord tone.
  private static stacking(chord: Chord) {
    const scale = chord.chordScale;
    const tones = chord.pcs;
    return {
      pitch: (d: number) => chord.root + scale.semis(d),
      avoid: (note: number) => !tones.includes(PitchClass.of(note)) && tones.includes(PitchClass.of(note - 1)),
    };
  }

  // The root and its fifth (perfect, flat or sharp) low, two octaves or
  // so under the anchor, below the close voicing of the rest (adding a
  // major 9th where the chord-scale has one and the chord has few
  // colours and no ninth of its own). A note a semitone over the one
  // below it drops an octave, where that keeps it over the fifth (else
  // the lower one rises over it, where that keeps it under the anchor),
  // so the top never clusters, and the pair sounds as a major seventh,
  // not a minor ninth (D A F C E, not D A E F C with E under the F).
  private static spread(chord: Chord, anchor: number): number[] {
    const scale = chord.chordScale;
    const five = chord.tones.find((t) => t >= 6 && t <= 8) ?? 7;
    const fifth = PitchClass.of(chord.root + five);
    const pcs = Voicing.pcs(chord).filter((pc) => pc !== chord.root && pc !== fifth);
    const ninth = PitchClass.of(chord.root + 2);
    const hasNinth = chord.tones.some((t) => t >= 13 && t <= 15); // flat, natural or sharp
    const colours = pcs.length < 4 && scale.has(2) && !hasNinth ? [...pcs, ninth] : pcs;
    const root = anchor - Voicing.SPREAD_DEPTH - PitchClass.of(anchor - Voicing.SPREAD_DEPTH - chord.root);
    const low = root + five;
    const upper = Voicing.close(colours, anchor);
    for (let i = upper.length - 2; i >= 0; i--) {
      if (upper[i + 1] - upper[i] !== 1) continue;
      if (upper[i + 1] - 12 > low) upper[i + 1] -= 12;
      else if (upper[i] + 12 <= anchor) upper[i] += 12;
    }
    return [root, low, ...upper.sort((a, b) => a - b)];
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
