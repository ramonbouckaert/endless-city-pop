// A section of a song's form. Each type is a class (one per file here):
// what the form decides for it (its length, its part, its shift, and its
// own fields: a chorus's answer and big, a solo's soloist, ...), its
// part's material, written as it is built from its plan, and how it is
// played, as notes.

import { SECTION_TYPES, type PlayedType, type SectionType } from '../../style';
import type { ScoreBand } from '../band';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Breakdown } from './breakdown';
import type { Bridge } from './bridge';
import type { Chorus } from './chorus';
import type { DrumBreak } from './drum-break';
import type { Finale } from './finale';
import type { Intro } from './intro';
import type { Lift } from './lift';
import type { Outro } from './outro';
import type { PreChorus } from './pre';
import type { Riff } from './riff';
import { PlayedScoreContext, type Parts } from './score-context';
import type { SoloSection } from './solo';
import type { Vamp } from './vamp';
import type { Verse } from './verse';

/**
 * One section of a song's form (of a type, if given). Each type's class
 * extends it (or PlayedSection); its constructor takes its plan and the
 * BuildContext it is built in, copies its own fields from the plan, then
 * writes its material (ctx.material).
 */
export abstract class Section<T extends SectionType = SectionType> {
  readonly type: T;
  readonly bars: number;
  /**
   * Sections with the same part play the same material (every chorus the
   * same chords and hook); a section longer than its material loops it.
   */
  readonly part: string;
  /** Semitones up, after a key change (a lift's: the key it lifts to). */
  readonly shift: number;
  /** Its part's material: every section of the part has the same. */
  abstract readonly material: MaterialOf<T>;

  constructor({ type, bars, part, shift }: SectionPlan<T>) {
    this.type = type;
    this.bars = bars;
    this.part = part;
    this.shift = shift;
  }

  /** What the section plays, the `repeat`th time its part plays, as notes. */
  abstract parts(band: ScoreBand, repeat: number): Parts;

  /** The section in a line: "chorus (+2) 8", "lift (+2, ii-V) 2". */
  describe(): string {
    const details = [this.shift ? `+${this.shift}` : '', ...this.details].filter(Boolean);
    return `${this.label}${details.length ? ` (${details.join(', ')})` : ''} ${this.bars}`;
  }

  // What describe() calls the section.
  protected get label(): string {
    return SECTION_TYPES[this.type].label;
  }

  // What describe() says of it besides its shift.
  protected get details(): string[] {
    return [];
  }
}

/** A section the band plays through: its chords, drums and bass, and its type's recipe over them. */
export abstract class PlayedSection<T extends PlayedType = PlayedType> extends Section<T> {
  parts(band: ScoreBand, repeat: number): Parts {
    return this.play(new PlayedScoreContext(this, band, repeat));
  }

  /** Which instruments play its material, and how. */
  protected abstract play(ctx: PlayedScoreContext<T>): Parts;
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
