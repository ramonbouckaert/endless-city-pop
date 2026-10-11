// The hook, doubled an octave up if it fits (perhaps echoed, and perhaps
// trilling a held note when it comes back); later choruses answer it
// (in its gaps every other bar, or with a held line), and the last one
// adds stabs, strings and choir, and answers in every bar.

import { ANSWER_STYLES, COMP, ECHO, GROOVES, OSTINATO_CHANCE, TRILL, type AnswerStyle } from '../../style';
import { AnswerWriter, type Melody } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { spans, type NoteSpec } from '../score';

export interface ChorusFields {
  /** Later choruses answer the hook. */
  answer: boolean;
  /** The last chorus has everything. */
  big: boolean;
  /** Whether it plays just the chorus's second half (a part of its own: HALF). */
  half?: boolean;
}

/** The part of choruses playing only the chorus's second half. */
export const HALF = 'chorus:half';

export interface ChorusMaterial extends PlayedMaterial {
  melody: Melody;
  answer: Melody;
  /** How it answers the hook. */
  variant: AnswerStyle;
  /** How far behind the lead its echo plays, in bars, if it has one. */
  echo?: number;
  /** A theme's: whether the bells' ostinato plays under its second half. */
  bells: boolean;
  /** Whether it trills its first long held note when it comes back (TRILL). */
  trill: boolean;
}

export interface Chorus extends Readonly<ChorusFields> {}

export class Chorus extends PlayedSection<ChorusMaterial> {
  static readonly id = 'chorus';
  static readonly short = 'c';
  static override readonly handsOver = true;

  readonly material: ChorusMaterial;

  constructor(plan: Plan<ChorusFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      if (this.half) return this.second(ctx);
      const { key } = ctx;
      const bars = ctx.chorusBars();
      const hook = ctx.hook();
      const variant = rng.weightedKey(ANSWER_STYLES);
      const echo = rng.fork('echo');
      return {
        ...(echo.chance(ECHO.chance) ? { echo: echo.pick(ECHO.delays) } : {}),
        bells: ctx.theme && rng.fork('bells').chance(OSTINATO_CHANCE.theme),
        trill: rng.fork('trill').chance(TRILL.chance),
        ...ctx.band(key, bars, GROOVES.chorus, rng.fork('groove')),
        melody: hook,
        answer: new AnswerWriter(key, variant, rng.fork('answer')).write(hook, bars),
        variant,
      };
    });
  }

  // A whole chorus's material, from where its last `bars` start.
  private second(ctx: BuildContext): ChorusMaterial {
    const whole = ctx.plan.ofType(Chorus).find((c) => !c.half);
    if (!whole) throw new Error('A half chorus needs a whole one');
    const mat = (ctx.section(whole) as Chorus).material;
    const from = mat.bars.length - this.bars;
    return {
      ...mat,
      bars: mat.bars.slice(from),
      bass: mat.bass.drop(from),
      melody: mat.melody.drop(from),
      answer: mat.answer.drop(from),
    };
  }

  protected override get details(): string[] {
    return this.half ? ['second half'] : [];
  }

  // What of the answer plays: all of it in the last chorus (or a held
  // line); else, if the hook rests any bar (as a theme's does each
  // phrase), those bars; or every other bar.
  private get answered(): Melody {
    const mat = this.material;
    if (this.big || mat.variant === 'line') return mat.answer;
    return mat.melody.bars.some((notes) => !notes.length) ? mat.answer.where(mat.melody.rests) : mat.answer.alternate;
  }

  // The chords make room for the answer's long notes too.
  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return [...ctx.line(this.material.melody), ...(this.answer ? ctx.line(this.answered) : [])];
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len, key } = ctx;
    const mat = this.material;
    const { answer, big } = this;
    // A chorus coming back may trill its first long held note, up to the scale step above.
    const above = (semis: number) => key.scale.semis(key.scale.degree(semis).step + 1);
    const melody = ctx.repeat && mat.trill ? mat.melody.trilled(above) : mat.melody;
    // An echo of the hook plays only in bars the answer rests: they fill the same gaps.
    const echoed = answer ? melody.where(this.answered.rests) : melody;
    return [
      ctx.drums(),
      B,
      band.comp(C, spans(COMP.chorus, len)),
      ctx.clav,
      band.pad(C),
      band.lead(ctx.line(melody)),
      band.double(ctx.line(melody), ctx.octaveUp(melody)),
      mat.echo !== undefined && band.echo(ctx.line(echoed), mat.echo).until(len),
      answer && band.counter(ctx.line(this.answered)),
      mat.bells && band.ostinato(C).mask(ctx.from(len / 2)),
      big && band.stabs(C),
      big && band.strings(C),
      big && band.choir(C),
    ];
  }
}
