// A section of a song's form. Each kind is a class (one per file here):
// what it is (its id, name and how it hands over, as statics), what the
// form decides for it (its length, its part, its shift, and its own
// fields: a chorus's answer and big, a solo's soloist, ...), its part's
// material, written as it is built from its plan, and how it is played,
// as notes.

import type { ScoreBand } from '../band';
import type { PlayedMaterial } from '../material';
import type { Plan } from '../plan';
import type { BuildContext } from './build-context';
import { PlayedScoreContext, type Parts } from './score-context';

/** A kind of section: its class, built from a plan of its own in a BuildContext, and what it is. */
export interface SectionKind<S extends Section = Section> {
  new (plan: never, ctx: BuildContext): S;
  /** Its name in part ids and the page's styles: "chorus", "drumBreak". */
  readonly id: string;
  /** Its name on the page: "chorus", "drum break". */
  readonly label: string;
  /** Its name for narrow spaces: "c", "d". */
  readonly short: string;
  /** Whether it hands over to anything (so the opening vamp may come back after it). */
  readonly handsOver: boolean;
}

/**
 * One section of a song's form, playing `M`. Each kind's class extends it
 * (or PlayedSection), gives its statics (`id`, `short`, ...), and
 * declares its own fields from its plan by merging them in (`interface
 * Verse extends Readonly<VerseFields> {}`): this constructor copies them
 * over. Its own constructor takes its plan and the BuildContext it is
 * built in, and writes its material (ctx.material).
 */
export abstract class Section<M = unknown> {
  declare static readonly id: string;
  declare static readonly short: string;
  static readonly handsOver: boolean = false;
  static get label(): string {
    return this.id;
  }

  // Declared, not defined: the constructor copies them from the plan.
  /** Its class. */
  declare readonly kind: SectionKind;
  declare readonly bars: number;
  /**
   * Sections with the same part play the same material (every chorus the
   * same chords and hook); a section longer than its material loops it.
   */
  declare readonly part: string;
  /** Semitones up, after a key change (a lift's: the key it lifts to). */
  declare readonly shift: number;
  /** The plan it was built from. */
  readonly plan: Plan;
  /** Its part's material: every section of the part has the same. */
  abstract readonly material: M;

  constructor(plan: Plan) {
    Object.assign(this, plan);
    this.plan = plan;
  }

  /** What the section plays, the `repeat`th time its part plays, as notes (drums first). */
  abstract parts(band: ScoreBand, repeat: number): Parts;

  /** The section in a line: "chorus (+2) 8", "lift (+2, ii-V) 2". */
  describe(): string {
    const details = [this.shift ? `+${this.shift}` : '', ...this.details].filter(Boolean);
    const aside = details.length ? ` (${details.join(', ')})` : '';
    return `${this.label}${aside} ${this.bars}`;
  }

  // What describe() calls the section.
  protected get label(): string {
    return this.kind.label;
  }

  // What describe() says of it besides its shift.
  protected get details(): string[] {
    return [];
  }
}

/** A section the band plays through: its chords, drums and bass, and its kind's recipe over them. */
export abstract class PlayedSection<M extends PlayedMaterial = PlayedMaterial> extends Section<M> {
  parts(band: ScoreBand, repeat: number): Parts {
    return this.play(new PlayedScoreContext(this, band, repeat));
  }

  /** Which instruments play its material, and how. */
  protected abstract play(ctx: PlayedScoreContext): Parts;
}
