// A form's plan: what the planner decides for each section (its type,
// length, part and shift, and its type's own fields) before the sections
// are built from it, each writing its part's material.

import type { OutroStyle, SectionType } from '../style';

/**
 * What the form decides for each type of section, besides its length.
 * Each type's class implements its fields (and so takes these docs).
 */
export interface SectionFields {
  intro: {};
  vamp: {
    /** The opening vamp back: the band already going. */
    returning: boolean;
  };
  verse: {
    /** A later round adds a layer. */
    later: boolean;
  };
  pre: {
    /** A later round adds a layer. */
    later: boolean;
  };
  chorus: {
    /** Later choruses answer the hook. */
    answer: boolean;
    /** The last chorus has everything. */
    big: boolean;
  };
  riff: {};
  bridge: {};
  solo: {
    /** Its soloist, as an index into the song's soloists. */
    soloist: number;
  };
  breakdown: {};
  drumBreak: {};
  lift: {
    /** The turnaround it takes into its key (a name in the tonality's). */
    turnaround: string;
  };
  outro: {
    /** How it ends the song. */
    variant: OutroStyle;
  };
  finale: {};
}

// Sections with the same `part` play the same material (every chorus the
// same chords and hook); a section longer than its material loops it.
// `shift`: semitones up, after a key change (a lift's: the key it lifts to).
interface PlanBase<T extends SectionType> {
  type: T;
  bars: number;
  part: string;
  shift: number;
}
type SectionPlans = { [T in SectionType]: Readonly<PlanBase<T> & SectionFields[T]> };

/** One section of a form's plan (of a type, if given). */
export type SectionPlan<T extends SectionType = SectionType> = SectionPlans[T];

type Fields<T extends SectionType> = SectionFields[T] & { part?: string; shift?: number };

/** A section of a type in a plan: its own part (unless given) and unshifted (unless given). */
export function planned<T extends SectionType>(
  type: T,
  bars: number,
  ...[fields]: {} extends SectionFields[T] ? [Fields<T>?] : [Fields<T>]
): SectionPlan<T> {
  return { type, bars, part: type, shift: 0, ...fields } as SectionPlan<T>;
}
