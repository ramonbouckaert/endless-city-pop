// A form's plan: what the planner decides for each section (its kind,
// length, part and shift, and its kind's own fields) before the sections
// are built from it, each writing its part's material.

import type { SectionKind } from './sections/section';

// Sections with the same `part` play the same material (every chorus the
// same chords and hook); a section longer than its material loops it.
// `shift`: semitones up, after a key change (a lift's: the key it lifts to).
export interface PlanBase {
  /** Its section's class. */
  readonly kind: SectionKind;
  readonly bars: number;
  readonly part: string;
  readonly shift: number;
}

/** One section of a form's plan, with its kind's own fields (`F`, each class's own, documented there). */
export type Plan<F extends object = object> = PlanBase & Readonly<F>;

/** A plan of a kind of section: what its class is built from. */
export type PlanOf<K extends SectionKind> = ConstructorParameters<K>[0];

/** A kind's own fields in its plan. */
type FieldsOf<K extends SectionKind> = Omit<PlanOf<K>, keyof PlanBase>;
type Fields<K extends SectionKind> = FieldsOf<K> & { part?: string; shift?: number };

/** A section of a kind in a plan: its kind's own part (unless given) and unshifted (unless given). */
export function planned<K extends SectionKind>(
  kind: K,
  bars: number,
  ...[fields]: {} extends FieldsOf<K> ? [Fields<K>?] : [Fields<K>]
): PlanOf<K> {
  return { kind, bars, part: kind.id, shift: 0, ...fields } as PlanOf<K>;
}
