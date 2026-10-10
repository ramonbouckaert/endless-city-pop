// The modes a song can be in. Chord-scales follow from the key: a
// diatonic chord takes its mode in the key (so iv in a minor key plays
// dorian, bVI lydian), a chromatic one its family's usual scale.

import type { Mode } from '../../theory';
import { DORIAN } from './dorian';
import { MAJOR } from './major';
import { MINOR } from './minor';
import { MIXOLYDIAN } from './mixolydian';
import { Tonality } from './tonality';

export const TONALITIES: Readonly<Record<Mode, Tonality>> = {
  major: new Tonality('major', MAJOR),
  minor: new Tonality('minor', MINOR),
  dorian: new Tonality('dorian', DORIAN),
  mixolydian: new Tonality('mixolydian', MIXOLYDIAN),
};

/** A mode's tonality. */
export const tonalityOf = (mode: Mode): Tonality => TONALITIES[mode];

export { LIFT_TURNAROUNDS } from './major';
export { Tonality } from './tonality';
export type * from './types';
