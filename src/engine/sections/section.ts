// A section of a song's form. Each type is a class (one per file here):
// what the form decides for it (its length, its part, its shift, and its
// own fields: a chorus's answer and big, a solo's soloist, ...), its
// part's material, written as it is built from its plan, and how it is
// played, as notes.

import { SECTION_TYPES, type PlayedType, type SectionType } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Breakdown } from './breakdown';
import type { Bridge } from './bridge';
import type { Chorus } from './chorus';
import type { Parts, ScoreContextOf } from './context';
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

/**
 * One section of a song's form (of a type, if given). Each type's class
 * extends it; its constructor takes its plan and the BuildContext it is
 * built in, copies its own fields from the plan, then writes its
 * material (ctx.material).
 */
export abstract class Section<T extends SectionType = SectionType> {
  readonly type: T;
  readonly bars: number;
  /**
   * Sections with the same part play the same material (every chorus the
   * same chords and hook); a section longer than its material loops it.
   */
  readonly part: string;
  /** Semitones up, after a last-chorus key change. */
  readonly shift: number;
  /** Its part's material: every section of the part has the same. */
  abstract readonly material: MaterialOf<T>;

  constructor({ type, bars, part, shift }: SectionPlan<T>) {
    this.type = type;
    this.bars = bars;
    this.part = part;
    this.shift = shift;
  }

  /** Which instruments play its material, and how, as notes. */
  abstract play(ctx: ScoreContextOf<T>): Parts;

  /** The section in a line: "chorus (+2) 8", "lift (to +2, ii-V) 2". */
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
/** A section of any type, as its type's class (narrowed by its `type`). */
export type AnySection = SectionOf<SectionType>;

/** Whether the band plays through a section (it has chords, drums and bass). */
export const isPlayed = (sec: Section): sec is SectionOf<PlayedType> => SECTION_TYPES[sec.type].played;
