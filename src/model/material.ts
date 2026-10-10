// What a part plays. Every section type has its own shape (MaterialOf),
// so the arranger can rely on what's there: a section the band plays
// through has its chords, drums and bass; the rest is per type.

import type { DrumEntry, FinaleStyle, IntroHarmony, IntroTexture, LiftStyle, PreFlavour, SectionType } from '../style';
import type { Bar, Chord, Key } from '../theory';
import type { BassLine } from './bass';
import type { Drums } from './drums';
import type { Melody, Solo } from './melody';

interface MaterialBase<T extends SectionType> {
  type: T;
  key: Key;
}
// A section the band plays through: its chords, groove and bass line.
type Played<T extends SectionType> = MaterialBase<T> & { bars: Bar[]; drums: Drums; bass: BassLine };

// What each band section has besides.
interface PlayedFields {
  intro: { harmony: IntroHarmony; texture: IntroTexture; melody?: Melody };
  vamp: { entry: DrumEntry }; // how the drums start the opening vamp
  verse: { melody: Melody };
  pre: { flavour: PreFlavour; melody: Melody };
  chorus: { melody: Melody; answer: Melody };
  riff: { melody: Melody };
  bridge: { melody: Melody };
  breakdown: { melody: Melody };
  // The first solo is over the band; the second over a bossa comp.
  solo: { solo: Solo; comp: 'band' | 'bossa' };
  // A reprise plays the intro's chords (and its teaser, if it had one); a
  // trade, two soloists (indexes into the song's) over a vamp.
  outro: { outro: 'reprise'; melody?: Melody } | { outro: 'trade'; solo: Solo; soloists: readonly [number, number] };
  // A turnaround into the key of the chorus after it.
  lift: { turnaround: string; style: LiftStyle };
}

// Drums alone, then a bass pickup into `into`, the next section's first
// chord (in `key`, that section's key, shifted up `shift`).
export type DrumBreakMaterial = MaterialBase<'drumBreak'> & {
  drums: Drums;
  pickup: { into: Chord; key: Key; shift: number };
};
// The last chord, rung out.
export type FinaleMaterial = MaterialBase<'finale'> & { chord: Chord; ending: FinaleStyle };

export type MaterialOf<T extends SectionType> = T extends keyof PlayedFields
  ? Played<T> & PlayedFields[T]
  : T extends 'drumBreak'
    ? DrumBreakMaterial
    : FinaleMaterial;
export type Material = MaterialOf<SectionType>;

/** Narrows a material to a type, or throws. */
export function materialOf<T extends SectionType>(type: T, mat: Material | undefined): MaterialOf<T> {
  if (mat?.type !== type) throw new Error(`Expected ${type} material, got ${mat?.type ?? 'none'}`);
  return mat as MaterialOf<T>;
}
