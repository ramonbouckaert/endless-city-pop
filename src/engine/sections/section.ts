// A section of a song's form. Each type is a class (one per file here):
// what the form decides for it (its length, its part, its shift, and its
// own fields: a chorus's answer and big, a solo's soloist, ...), its
// part's material (which it writes, and keeps), and how it is played, as
// notes.

import type { Rng } from '../../lib/random';
import { SECTION_TYPES, type PlayedType, type SectionType } from '../../style';
import { materialOf, type MaterialOf } from '../material';
import type { Breakdown } from './breakdown';
import type { Bridge } from './bridge';
import type { Chorus } from './chorus';
import type { Parts, ScoreContextOf, WriteContext } from './context';
import type { DrumBreak } from './drum-break';
import type { Finale } from './finale';
import type { Intro } from './intro';
import type { Lift } from './lift';
import type { Outro } from './outro';
import type { PreChorus } from './pre';
import type { Riff } from './riff';
import type { SoloSection } from './solo';
import type { Vamp } from './vamp';
import type { Verse } from './verse';

/** One section of a song's form (of a type, if given). */
export interface Section<T extends SectionType = SectionType> {
  readonly type: T;
  readonly bars: number;
  /**
   * Sections with the same part play the same material (every chorus the
   * same chords and hook); a section longer than its material loops it.
   */
  readonly part: string;
  /** Semitones up, after a last-chorus key change. */
  readonly shift: number;
  /** Its part's material, once written (or shared): it throws before. */
  readonly material: MaterialOf<T>;
  /**
   * Writes its part's material, drawing on the part's own stream. Like
   * every function here that takes an Rng, it owns the stream it is
   * given: a caller hands on a fork, and never draws from it again.
   */
  write(ctx: WriteContext, rng: Rng): void;
  /** Takes its part's material from the section of its part that wrote it. */
  share(writer: Section): void;
  /** Which instruments play its material, and how, as notes. */
  play(ctx: ScoreContextOf<T>): Parts;
  /** The section in a line: "chorus (+2) 8", "lift (to +2, ii-V) 2". */
  describe(): string;
}

/** A section's part (its type, unless given) and shift (none, unless given). */
export interface Placement {
  part?: string;
  shift?: number;
}

/** What every section type's class shares. */
export abstract class SectionBase<T extends SectionType> implements Section<T> {
  readonly part: string;
  readonly shift: number;
  private written?: MaterialOf<T>;

  constructor(
    readonly type: T,
    readonly bars: number,
    { part = type, shift = 0 }: Placement = {},
  ) {
    this.part = part;
    this.shift = shift;
  }

  get material(): MaterialOf<T> {
    if (!this.written) throw new Error(`The ${this.part} part's material isn't written yet`);
    return this.written;
  }

  write(ctx: WriteContext, rng: Rng): void {
    this.written = this.compose(ctx, rng);
  }

  share(writer: Section): void {
    this.written = materialOf(this.type, writer.material);
  }

  // Its part's material, as its type writes it.
  protected abstract compose(ctx: WriteContext, rng: Rng): MaterialOf<T>;
  abstract play(ctx: ScoreContextOf<T>): Parts;

  describe(): string {
    const shift = this.shift ? ` (+${this.shift})` : '';
    return `${this.label}${shift} ${this.bars}`;
  }

  // What describe() calls the section.
  protected get label(): string {
    return this.type;
  }
}

interface SectionClasses {
  intro: Intro;
  vamp: Vamp;
  verse: Verse;
  pre: PreChorus;
  chorus: Chorus;
  riff: Riff;
  bridge: Bridge;
  solo: SoloSection;
  breakdown: Breakdown;
  lift: Lift;
  outro: Outro;
  drumBreak: DrumBreak;
  finale: Finale;
}

/** A section type's class. */
export type SectionOf<T extends SectionType> = SectionClasses[T];

/** Narrows a section to a type. */
export const isSection =
  <T extends SectionType>(type: T) =>
  (sec: Section): sec is SectionOf<T> =>
    sec.type === type;

/** Whether the band plays through a section (it has chords, drums and bass). */
export const isPlayed = (sec: Section): sec is SectionOf<PlayedType> => SECTION_TYPES[sec.type].played;
