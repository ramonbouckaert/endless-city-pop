import type { OutroStyle, SectionType } from '../style';

// What an instance of a section changes. second: a later round (later
// verses add a layer; the second solo is over a bossa comp). shift:
// semitones up, after a last-chorus key change. liftTo: the shift a lift
// leads into, by way of `turnaround` (a name in the tonality's).
export interface SectionOpts {
  second?: boolean;
  answer?: boolean;
  big?: boolean;
  shift?: number;
  soloist?: number;
  liftTo?: number;
  turnaround?: string;
  outro?: OutroStyle;
}

/**
 * One section of a song's form. Sections with the same `part` play the
 * same material (every chorus the same chords and hook); a section
 * longer than its material loops it.
 */
export class Section {
  constructor(
    readonly type: SectionType,
    readonly bars: number,
    readonly opts: SectionOpts = {},
    readonly part: string = type,
  ) {}

  /** Semitones up, for sections after a key change. */
  get shift(): number {
    return this.opts.shift ?? 0;
  }

  describe(): string {
    const { liftTo, turnaround, outro } = this.opts;
    if (liftTo) return `${this.type} (to +${liftTo}, ${turnaround}) ${this.bars}`;
    const stylePart = outro ? ` ${outro}` : '';
    const shiftPart = this.shift ? ` (+${this.shift})` : '';
    return `${this.type}${stylePart}${shiftPart} ${this.bars}`;
  }
}

/** The bar each section starts on. */
export const sectionStarts = (form: readonly Section[]): number[] =>
  form.map((_, i) => form.slice(0, i).reduce((n, s) => n + s.bars, 0));
