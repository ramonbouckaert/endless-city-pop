// What a part plays. Every kind of section has its own shape, declared
// with its class (VerseMaterial, ...), so writers and recipes can rely on
// what's there: a section the band plays through has at least these. A
// kind with variants (style/variants.ts) has the one it plays as
// `variant` (an outro's is its section's, as it sets its length).
// Material is in the song's key (a bridge's in its own): a section after
// a key change plays it shifted up (Section.shift).

import type { Bar, Key } from '../theory';
import type { BassLine } from './bass';
import type { Drums } from './drums';

/** What a section the band plays through has: its chords in a key, groove and bass line. */
export interface PlayedMaterial {
  key: Key;
  bars: Bar[];
  drums: Drums;
  bass: BassLine;
}
