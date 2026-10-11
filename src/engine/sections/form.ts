// A song's form: its sections in order, and what the sections, the
// arranger and the page ask of it (where each section starts, what comes
// next, how often a part has played). The planner writes a form of
// plans; the sections are built from it, into a form of sections.

import type { TempoChange } from '../../lib/timeline';
import type { AnySection } from './index';
import type { Plan, PlanOf, Section, SectionKind } from './section';

/** Where the playhead is: the section, and how far through it (0..1). */
export interface Playhead {
  index: number;
  through: number;
}

/** What a form holds: a plan's sections, or a song's. */
type Placed = Plan | AnySection;

/** What a form holds of a kind: its plans, or its sections. */
type OfKind<S extends Placed, K extends SectionKind> = S extends Section ? InstanceType<K> : PlanOf<K>;

export class Form<S extends Placed = AnySection> implements Iterable<S> {
  /** The bar each section starts on. */
  readonly starts: readonly number[];
  /** The song's length in bars. */
  readonly bars: number;

  constructor(readonly sections: readonly S[]) {
    // The bar each section ends on, and so the next starts on.
    const ends = sections.reduce<number[]>((ends, s) => [...ends, (ends.at(-1) ?? 0) + s.bars], []);
    this.starts = [0, ...ends].slice(0, sections.length);
    this.bars = ends.at(-1) ?? 0;
  }

  [Symbol.iterator](): Iterator<S> {
    return this.sections[Symbol.iterator]();
  }

  get length(): number {
    return this.sections.length;
  }

  /** The section at an index. */
  at(index: number): S | undefined {
    return this.sections[index];
  }

  /** Every section of a kind, in order. */
  ofType<K extends SectionKind>(kind: K): OfKind<S, K>[] {
    return this.sections.filter((s) => s.kind === kind) as OfKind<S, K>[];
  }

  /** The first section of a kind, if the form has one. */
  first<K extends SectionKind>(kind: K): OfKind<S, K> | undefined {
    return this.sections.find((s) => s.kind === kind) as OfKind<S, K> | undefined;
  }

  /** The section after `sec`. */
  next(sec: S): S | undefined {
    return this.sections[this.sections.indexOf(sec) + 1];
  }

  /** The last section of `sec`'s kind before it. */
  previous<P extends S>(sec: P): P | undefined {
    return this.sections.slice(0, this.sections.indexOf(sec)).findLast((s): s is P => s.kind === sec.kind);
  }

  /** How many sections before the one at `index` play its part. */
  repeatOf(index: number): number {
    const { part } = this.sections[index];
    return this.sections.slice(0, index).filter((s) => s.part === part).length;
  }

  /**
   * The section at `pos` bars in, and how far through it: before the
   * start, the start; past the end, the end of the last section.
   */
  playhead(pos: number): Playhead {
    if (pos <= 0) return { index: 0, through: 0 };
    const index = this.sections.findIndex((s, i) => pos < this.starts[i] + s.bars);
    if (index < 0) return { index: this.length - 1, through: 1 };
    return { index, through: (pos - this.starts[index]) / this.sections[index].bars };
  }

  /** The bar a playhead stands at: the inverse of playhead(), within the song. */
  barAt({ index, through }: Playhead): number {
    const i = Math.min(Math.max(index, 0), this.length - 1);
    return this.starts[i] + Math.min(Math.max(through, 0), 1) * this.sections[i].bars;
  }

  /** The bar the song starts fading out on, if it fades out: its first faded section's start. */
  get fadeFrom(): number | undefined {
    const index = this.sections.findIndex((s) => s.fade);
    return index < 0 ? undefined : this.starts[index];
  }

  /** The song's tempo through the form: `bpm`, changed where a section slows or speeds up. */
  tempos(this: Form<AnySection>, bpm: number): TempoChange[] {
    const marks = this.sections.flatMap((sec, i) =>
      sec.tempo.map(({ at, scale }) => ({ at: this.starts[i] + at, bpm: bpm * scale })),
    );
    return [{ at: 0, bpm }, ...marks.filter((m) => m.at > 0)];
  }

  /** Each section in a line: "chorus (+2) 8", "lift (to +2, ii-V) 2". */
  describe(this: Form<AnySection>): string[] {
    return this.sections.map((sec) => sec.describe());
  }
}
