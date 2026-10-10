// What a section is built in: the song's key and plan, the other
// sections, and the harmony several parts share (the chorus's chords and
// its hook, the vamp's, the intro's). A section's constructor writes its
// part's material from it.

import { lazy } from '../../lib/lazy';
import type { Rng } from '../../lib/random';
import {
  INTRO,
  tonalityOf,
  type GroovePlan,
  type IntroHarmony,
  type MelodyKind,
  type PlayedType,
  type PreMelody,
  type SectionType,
  type Tonality,
} from '../../style';
import { Template, type Bar, type Key } from '../../theory';
import { Form } from '../form';
import { GrooveWriter } from '../groove';
import { Harmonizer } from '../harmony';
import { MelodyWriter, type Melody } from '../melody';
import { materialOf, type Material, type MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { AnySection, Section, SectionOf } from './section';

/** Each section type's class, by type: built from a plan of its type, in a BuildContext. */
export type SectionClasses = {
  [T in SectionType]: new (plan: SectionPlan<T>, ctx: BuildContext) => SectionOf<T>;
};

export class BuildContext {
  // Each section, by its plan, built on first use.
  private readonly built = new Map<SectionPlan, AnySection>();
  // Each part's material, by part id, written by the first of its sections built.
  private readonly materials = new Map<string, Material>();
  // For the harmony and lines several parts share, each written once on first use.
  private readonly shared: Rng;

  constructor(
    readonly key: Key,
    readonly plan: Form<SectionPlan>,
    private readonly rng: Rng,
    private readonly classes: SectionClasses,
  ) {
    this.shared = rng.fork('shared');
  }

  /** The song's sections, each built from its plan. */
  build(): Form {
    return new Form(this.plan.sections.map((plan) => this.section(plan)));
  }

  /** The section a plan's section is built into, on first use. */
  section<P extends SectionPlan>(plan: P): SectionOf<P['type']> {
    let sec = this.built.get(plan);
    if (!sec) {
      // Each type's class takes a plan of its type.
      const Class = this.classes[plan.type] as new (plan: P, ctx: BuildContext) => AnySection;
      sec = new Class(plan, this);
      this.built.set(plan, sec);
    }
    return sec as SectionOf<P['type']>;
  }

  /**
   * A section's part's material: written by `write` from the part's own
   * stream for the first section of the part built, and the same for the
   * rest. Like every function here that takes an Rng, `write` owns the
   * stream it is given: a caller hands on a fork, and never draws from it
   * again.
   */
  material<T extends SectionType>(sec: Section<T>, write: (rng: Rng) => MaterialOf<T>): MaterialOf<T> {
    let mat = this.materials.get(sec.part);
    if (!mat) {
      mat = write(this.rng.fork(`part/${sec.part}`));
      this.materials.set(sec.part, mat);
    }
    return materialOf(sec.type, mat);
  }

  /** The song's key's tonality. */
  get tonality(): Tonality {
    return tonalityOf(this.key.mode);
  }

  /**
   * A template's progression, `bars` long, in a key (the song's unless
   * given), ending on its cadence if `ending`.
   */
  progress(template: string, bars: number, rng: Rng, { key = this.key, ending = false } = {}): Bar[] {
    return new Harmonizer(key, rng).progression(template, bars, { ending });
  }

  /** Four bars of one of the key's vamp or riff templates. */
  loop(kind: 'vamp' | 'riff', rng: Rng): Bar[] {
    return this.progress(rng.pick(this.tonality.templatesFor(kind)), 4, rng.fork('harmony'));
  }

  melody(kind: MelodyKind, key: Key, bars: Bar[], rng: Rng, style?: PreMelody): Melody {
    return new MelodyWriter(key, kind, rng, style).write(bars);
  }

  /** A section's chords in a key, with drums and a bass line to play them. */
  band<T extends PlayedType>(type: T, key: Key, bars: Bar[], plan: GroovePlan, rng: Rng) {
    return { type, key, bars, ...new GrooveWriter(plan, key, rng).write(bars) };
  }

  /** The chorus's chords (the intro's and breakdown's too): eight bars, and a tag if the chorus runs longer. */
  readonly chorusBars = lazy((): Bar[] => {
    const rng = this.shared.fork('chorusHarmony');
    const bars = this.progress(rng.pick(this.tonality.templatesFor('chorus')), 8, rng.fork('harmony'));
    const len = this.plan.first('chorus')?.bars ?? 8;
    if (len <= 8) return bars;
    const tag = new Template(rng.pick(this.tonality.templatesFor('tag'))).fit(len - 8);
    return [...bars, ...new Harmonizer(this.key, rng.fork('tag')).realize(tag)];
  });

  /** The chorus's melody (the intro's teaser and the breakdown's line too). */
  readonly hook = lazy(() => this.melody('chorus', this.key, this.chorusBars(), this.shared.fork('hook')));

  /** The vamp's chords (a trading outro's too). */
  readonly vampBars = lazy(() => this.loop('vamp', this.shared.fork('vampHarmony')));

  /** The intro's chords (a reprise's too): the chorus's, planing chords, or a template of its own. */
  readonly introBars = lazy((): { harmony: IntroHarmony; bars: Bar[] } => {
    const rng = this.shared.fork('introHarmony');
    const harmony = rng.weightedKey(INTRO.harmony);
    if (harmony === 'chorus') return { harmony, bars: this.chorusBars().slice(0, 4) };
    if (harmony === 'planing') return { harmony, bars: new Harmonizer(this.key, rng.fork('planing')).planing() };
    return { harmony, bars: this.progress(rng.pick(this.tonality.templatesFor('intro')), 4, rng.fork('harmony')) };
  });
}
