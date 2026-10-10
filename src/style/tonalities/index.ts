// The modes a song can be in. Chord-scales follow from the key: a
// diatonic chord takes its mode in the key (so iv in a minor key plays
// dorian, bVI lydian), a chromatic one its family's usual scale.

import type { Mode } from '../../theory';
import { DORIAN } from './dorian';
import { MAJOR } from './major';
import { MINOR } from './minor';
import { MIXOLYDIAN } from './mixolydian';
import type { Tonality } from './types';

export const TONALITIES: Readonly<Record<Mode, Tonality>> = {
  major: MAJOR,
  minor: MINOR,
  dorian: DORIAN,
  mixolydian: MIXOLYDIAN,
};

export { LIFT_TURNAROUNDS } from './major';
export type * from './types';
