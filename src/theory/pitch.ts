// Pitch classes are integers 0-11 (C = 0).

import { FLAT_NAMES, SHARP_NAMES } from './tables';

/** Pitch classes: integers 0-11, C = 0. */
export class PitchClass {
  /** The pitch class of a pitch, or of an interval in semitones (negative too). */
  static of(semis: number): number {
    return ((semis % 12) + 12) % 12;
  }

  /** A pitch class's name, with flats or sharps. */
  static spell(pc: number, flats = true): string {
    return (flats ? FLAT_NAMES : SHARP_NAMES)[PitchClass.of(pc)];
  }
}
