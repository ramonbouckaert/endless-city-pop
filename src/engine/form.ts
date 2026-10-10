// A song's form: its sections in order, and what the sections, the
// arranger and the page ask of it (where each section starts, what comes
// next, how often a part has played). The planner writes a form of
// plans (SectionPlan); the sections are built from it, into a form of
// sections.

import type { SectionType } from '../style';
import type { SectionPlan } from './plan';
import type { AnySection } from './sections';

/** Where the playhead is: the section, and how far through it (0..1). */
export interface Playhead {
  index: number;
  through: number;
}

/** What a form holds: a plan's sections, or a song's. */
type Placed = SectionPlan | AnySection;

/** The sections of a type, among some. */
type OfType<S extends Placed, T extends SectionType> = Extract<S, { type: T }>;

export class Form<S extends Placed = AnySection> implements Iterable<S> {
  /** The bar each section starts on. */
  readonly starts: readonly number[];
  /** The song's length in bars. */
  readonly bars: number;

  constructor(readonly sections: readonly S[]) {
    let bar = 0;
    this.starts = sections.map((s) => {
      const start = bar;
      bar += s.bars;
      return start;
    });
    this.bars = bar;
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

  /** Every section of a type, in order. */
  ofType<T extends SectionType>(type: T): OfType<S, T>[] {
    return this.sections.filter((s): s is OfType<S, T> => s.type === type);
  }

  /** The first section of a type, if the form has one. */
  first<T extends SectionType>(type: T): OfType<S, T> | undefined {
    return this.sections.find((s): s is OfType<S, T> => s.type === type);
  }

  /** The section after `sec`. */
  next(sec: S): S | undefined {
    return this.sections[this.sections.indexOf(sec) + 1];
  }

  /** The section after `sec`, not counting a drum break. */
  after(sec: S): S | undefined {
    return this.sections.slice(this.sections.indexOf(sec) + 1).find((s) => s.type !== 'drumBreak');
  }

  /** The last section of `sec`'s type before it. */
  previous<P extends S>(sec: P): P | undefined {
    return this.sections.slice(0, this.sections.indexOf(sec)).findLast((s): s is P => s.type === sec.type);
  }

  /** How many sections before the one at `index` play its part. */
  repeatOf(index: number): number {
    const { part } = this.sections[index];
    return this.sections.slice(0, index).filter((s) => s.part === part).length;
  }

  /** The soloists the form's solos go to, in order, as indexes into the song's soloists. */
  get soloists(): number[] {
    return this.ofType('solo').map((s) => s.soloist);
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

  /** Each section in a line: "chorus (+2) 8", "lift (to +2, ii-V) 2". */
  describe(this: Form<AnySection>): string[] {
    return this.sections.map((sec) => sec.describe());
  }
}
