// What a part plays. Every section type has its own shape (MaterialOf),
// so the arranger can rely on what's there: a section the band plays
// through has its chords, drums and bass; the rest is per type. A type
// with variants (style/variants.ts) has the one it plays as `variant`.

import type {
  FinaleStyle,
  IntroHarmony,
  IntroTexture,
  LiftStyle,
  PreFlavour,
  SectionType,
  SoloComp,
  VampEntry,
} from '../style';
import type { Bar, Chord, Key } from '../theory';
import type { BassLine } from './bass';
import type { Drums } from './drums';
import type { Melody, Solo } from './melody';
import type { Section, SectionOf } from './section';

interface MaterialBase<T extends SectionType> {
  type: T;
  key: Key;
}
// A section the band plays through: its chords, groove and bass line.
type Played<T extends SectionType> = MaterialBase<T> & { bars: Bar[]; drums: Drums; bass: BassLine };

// What each band section has besides.
interface PlayedFields {
  intro: { harmony: IntroHarmony; variant: IntroTexture; melody?: Melody };
  vamp: { variant: VampEntry };
  verse: { melody: Melody };
  pre: { variant: PreFlavour; melody: Melody };
  chorus: { melody: Melody; answer: Melody };
  riff: { melody: Melody };
  bridge: { melody: Melody };
  breakdown: { melody: Melody };
  solo: { variant: SoloComp; solo: Solo };
  // A reprise plays the intro's chords (and its teaser, if it had one); a
  // trade, two soloists (indexes into the song's) over a vamp.
  outro:
    | { variant: 'reprise'; melody?: Melody }
    | { variant: 'trade'; solo: Solo; soloists: readonly [number, number] };
  // A turnaround into the key of the chorus after it.
  lift: { turnaround: string; variant: LiftStyle };
}

/** The section types the band plays through. */
export type PlayedType = keyof PlayedFields;
export const isPlayed = (sec: Section): sec is SectionOf<PlayedType> =>
  sec.type !== 'drumBreak' && sec.type !== 'finale';

// Drums alone, then a bass pickup into `into`, the next section's first
// chord (in `key`, that section's key, shifted up `shift`).
export type DrumBreakMaterial = MaterialBase<'drumBreak'> & {
  drums: Drums;
  pickup: { into: Chord; key: Key; shift: number };
};
// The last chord, rung out.
export type FinaleMaterial = MaterialBase<'finale'> & { chord: Chord; variant: FinaleStyle };

export type MaterialOf<T extends SectionType> = T extends PlayedType
  ? Played<T> & PlayedFields[T]
  : T extends 'drumBreak'
    ? DrumBreakMaterial
    : FinaleMaterial;
export type Material = MaterialOf<SectionType>;
export type PlayedMaterial = MaterialOf<PlayedType>;

/** Narrows a material to a type, or throws. */
export function materialOf<T extends SectionType>(type: T, mat: Material | undefined): MaterialOf<T> {
  if (mat?.type !== type) throw new Error(`Expected ${type} material, got ${mat?.type ?? 'none'}`);
  return mat as MaterialOf<T>;
}
