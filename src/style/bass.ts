// Bass feels: how busy, syncopated, octave-popping and legato each is,
// rolled within these ranges per section; and the notes a line is made of.

import type { Range } from '../lib/random';

export type BassFeel = 'pedal' | 'funk' | 'drive' | 'disco' | 'halfTime' | 'bossa';
// Chord tones by name (Root, Third, Fifth, Seventh, Octave) and the scale steps between.
export type BassToken = 'R' | 'T' | 'F' | 'S' | 'O' | 'two' | 'four' | 'six' | 'below';
export interface BassFeelDef {
  grid: 8 | 16; // eighth- or sixteenth-note lines
  density: Range;
  sync: Range;
  octave: Range;
  legato: Range;
  approach: number;
  anchors?: Readonly<Record<number, BassToken>>; // steps that always sound
}

export const BASS = {
  variety: [0.05, 0.3] as Range,
  densityBoost: 1.3,
  fill: { density: 0.35, sync: 0.3 },
  approachSame: [7, 10, -2],
  approachChromatic: [-1, 1, -1],
  approachDiatonic: [-2, 2, 7, -5],
  // How often an approach note is chromatic rather than diatonic.
  chromatic: 0.75,
};

export const BASS_FEELS: Readonly<Record<BassFeel, BassFeelDef>> = {
  pedal: { grid: 8, density: [0.05, 0.25], sync: [0, 0.3], octave: [0, 0.3], legato: [0.7, 1], approach: 0.6 },
  funk: { grid: 16, density: [0.35, 0.65], sync: [0.4, 0.9], octave: [0.3, 0.8], legato: [0.1, 0.5], approach: 0.9 },
  drive: { grid: 8, density: [0.75, 1], sync: [0, 0.2], octave: [0.1, 0.4], legato: [0.5, 0.9], approach: 0.8 },
  disco: { grid: 8, density: [0.6, 1], sync: [0.1, 0.4], octave: [0.6, 1], legato: [0.2, 0.6], approach: 0.8 },
  halfTime: { grid: 16, density: [0.1, 0.3], sync: [0.3, 0.7], octave: [0.1, 0.4], legato: [0.6, 1], approach: 0.7 },
  bossa: {
    grid: 8,
    density: [0.1, 0.3],
    sync: [0.1, 0.3],
    octave: [0, 0.2],
    legato: [0.6, 0.9],
    approach: 0.7,
    anchors: { 6: 'F', 8: 'F' },
  },
};

// Each token as a chord-scale degree: root, third, fifth, seventh, octave, the steps between, and the step below.
export const BASS_DEGREES: Readonly<Record<BassToken, number>> = {
  R: 0,
  T: 2,
  F: 4,
  S: 6,
  O: 7,
  two: 1,
  four: 3,
  six: 5,
  below: -1,
};

export type NoteWeights = readonly (readonly [BassToken, number, number])[];
export const BASS_NOTES: { onBeat: NoteWeights; offBeat: NoteWeights } = {
  onBeat: [
    ['R', 3, 0],
    ['F', 2, 0],
    ['O', 1, 3],
    ['T', 1, 0],
    ['S', 0.5, 0],
  ],
  offBeat: [
    ['O', 0.5, 4],
    ['R', 1.5, 0],
    ['F', 1, 0],
    ['S', 1, 0],
    ['T', 0.7, 0],
    ['two', 0.4, 0],
    ['four', 0.4, 0],
    ['six', 0.3, 0],
    ['below', 0.3, 0],
  ],
};
