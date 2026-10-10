import type { OutroStyle, SectionType } from '../style';

// What the form decides for each type of section, besides its length.
export interface SectionFields {
  intro: {};
  // The opening vamp back: the band already going.
  vamp: { returning: boolean };
  // A later round adds a layer.
  verse: { later: boolean };
  pre: { later: boolean };
  // Later choruses answer the hook; the last one has everything.
  chorus: { answer: boolean; big: boolean };
  riff: {};
  bridge: {};
  // Its soloist, as an index into the song's soloists.
  solo: { soloist: number };
  breakdown: {};
  drumBreak: {};
  // The shift up the lift leads into, by way of `turnaround` (a name in
  // the tonality's).
  lift: { liftTo: number; turnaround: string };
  outro: { variant: OutroStyle };
  finale: {};
}

// Sections with the same `part` play the same material (every chorus the
// same chords and hook); a section longer than its material loops it.
// `shift`: semitones up, after a last-chorus key change.
interface SectionBase<T extends SectionType> {
  type: T;
  bars: number;
  part: string;
  shift: number;
}
type Sections = { [T in SectionType]: Readonly<SectionBase<T> & SectionFields[T]> };

/** One section of a song's form, of a type. */
export type SectionOf<T extends SectionType> = Sections[T];
/** One section of a song's form. */
export type Section = Sections[SectionType];

type Fields<T extends SectionType> = SectionFields[T] & { part?: string; shift?: number };

/** A section of a type: its own part (unless given) and unshifted (unless given). */
export function section<T extends SectionType>(
  type: T,
  bars: number,
  ...[fields]: {} extends SectionFields[T] ? [Fields<T>?] : [Fields<T>]
): SectionOf<T> {
  return { type, bars, part: type, shift: 0, ...fields } as SectionOf<T>;
}

/** Narrows a section to a type. */
export const isSection =
  <T extends SectionType>(type: T) =>
  (sec: Section): sec is SectionOf<T> =>
    sec.type === type;
