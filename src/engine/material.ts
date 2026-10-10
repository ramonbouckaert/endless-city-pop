// What a part plays. Every section type has its own shape (MaterialOf),
// so writers and recipes can rely on what's there: a section the band
// plays through has its chords, drums and bass; the rest is per type. A
// type with variants (style/variants.ts) has the one it plays as
// `variant`. Material is in the song's key: a section after a key change
// plays it shifted up (Section.shift).

import type {
  FinaleStyle,
  IntroHarmony,
  IntroTexture,
  LiftStyle,
  PlayedType,
  PreFlavour,
  SectionType,
  SoloComp,
  VampEntry,
} from '../style';
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

/** What a part of each type plays. */
interface Materials {
  intro: Played<'intro'> & { harmony: IntroHarmony; variant: IntroTexture; melody?: Melody };
  vamp: Played<'vamp'> & { variant: VampEntry };
  verse: Played<'verse'> & { melody: Melody };
  pre: Played<'pre'> & { variant: PreFlavour; melody: Melody };
  chorus: Played<'chorus'> & { melody: Melody; answer: Melody };
  riff: Played<'riff'> & { melody: Melody };
  bridge: Played<'bridge'> & { melody: Melody };
  breakdown: Played<'breakdown'> & { melody: Melody };
  solo: Played<'solo'> & { variant: SoloComp; solo: Solo };
  // A reprise plays the intro's chords (and its teaser, if it had one); a
  // trade, two soloists (indexes into the song's) over a vamp.
  outro: Played<'outro'> &
    ({ variant: 'reprise'; melody?: Melody } | { variant: 'trade'; solo: Solo; soloists: readonly [number, number] });
  // A turnaround into the chorus after it, whose first chord (`into`) a
  // bass pickup may lead to.
  lift: Played<'lift'> & { turnaround: string; variant: LiftStyle; into: Chord };
  // Drums alone, then a bass pickup into `into`, the next section's first
  // chord, played `shift` semitones up (that section's shift).
  drumBreak: MaterialBase<'drumBreak'> & { drums: Drums; pickup: { into: Chord; shift: number } };
  // The last chord, rung out.
  finale: MaterialBase<'finale'> & { chord: Chord; variant: FinaleStyle };
}

/** What a part of a type plays. */
export type MaterialOf<T extends SectionType> = Materials[T];
export type Material = MaterialOf<SectionType>;
export type PlayedMaterial = MaterialOf<PlayedType>;
export type DrumBreakMaterial = MaterialOf<'drumBreak'>;
export type FinaleMaterial = MaterialOf<'finale'>;

/** Narrows a material to a type, or throws. */
export function materialOf<T extends SectionType>(type: T, mat: Material | undefined): MaterialOf<T> {
  if (mat?.type !== type) throw new Error(`Expected ${type} material, got ${mat?.type ?? 'none'}`);
  return mat as MaterialOf<T>;
}
