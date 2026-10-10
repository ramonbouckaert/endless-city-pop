// A section of a song's form. Each kind is a class (one per file here):
// what it is (its id, name and how it hands over, as statics), what the
// form decides for it (its plan: its length, its part, its shift, and its
// own fields: a chorus's answer and big, a solo's soloist, ...), its
// part's material, written as it is built from its plan, and how it is
// played, as notes.
//
// What a part plays: every kind of section has its own material, declared
// with its class (VerseMaterial, ...), so writers and recipes can rely on
// what's there: a section the band plays through has at least
// PlayedMaterial's. A kind with variants (style/variants.ts) has the one
// it plays as `variant` (an outro's is its section's, as it sets its
// length). Material is in the song's key (a bridge's in its own): a
// section after a key change plays it shifted up (Section.shift).

import type { Bar, Key } from '../../theory';
import type { ScoreBand } from '../score';
import type { BassLine, Drums } from '../writers';
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

/** What a section the band plays through has: its chords in a key, groove and bass line. */
export interface PlayedMaterial {
  key: Key;
  bars: Bar[];
  drums: Drums;
  bass: BassLine;
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
