// A song's form: its sections in order, and what the writers, the
// arranger and the page ask of it (where each section starts, what comes
// next, how often a part has played).

import type { SectionType } from '../style';
import { isSection, type Section, type SectionOf } from './sections';

/** Where the playhead is: the section, and how far through it (0..1). */
export interface Playhead {
  index: number;
  through: number;
}

export class Form implements Iterable<Section> {
  /** The bar each section starts on. */
  readonly starts: readonly number[];
  /** The song's length in bars. */
  readonly bars: number;

  constructor(readonly sections: readonly Section[]) {
    let bar = 0;
    this.starts = sections.map((s) => {
      const start = bar;
      bar += s.bars;
      return start;
    });
    this.bars = bar;
  }

  [Symbol.iterator](): Iterator<Section> {
    return this.sections[Symbol.iterator]();
  }

  get length(): number {
    return this.sections.length;
  }

  /** The section at an index. */
  at(index: number): Section | undefined {
    return this.sections[index];
  }

  /** Every section of a type, in order. */
  ofType<T extends SectionType>(type: T): SectionOf<T>[] {
    return this.sections.filter(isSection(type));
  }

  /** The first section of a type, if the form has one. */
  first<T extends SectionType>(type: T): SectionOf<T> | undefined {
    return this.sections.find(isSection(type));
  }

  /** The section after `sec`. */
  next(sec: Section): Section | undefined {
    return this.sections[this.sections.indexOf(sec) + 1];
  }

  /** The section after `sec`, not counting a drum break. */
  after(sec: Section): Section | undefined {
    return this.sections.slice(this.sections.indexOf(sec) + 1).find((s) => s.type !== 'drumBreak');
  }

  /** The last section of `sec`'s type before it. */
  previous<S extends Section>(sec: S): S | undefined {
    return this.sections.slice(0, this.sections.indexOf(sec)).findLast((s): s is S => s.type === sec.type);
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
  describe(): string[] {
    return this.sections.map((sec) => sec.describe());
  }
}
