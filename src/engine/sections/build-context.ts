// What a section is built in: the song's key, tempo and plan, the other
// sections, and the harmony several parts share (the chorus's chords and
// its hook, the vamp's, the intro's). A section's constructor writes its
// part's material from it.

import type { Program } from '../../lib/general-midi';
import { lazy } from '../../lib/lazy';
import type { Odds, Rng } from '../../lib/random';
import {
  BASS_WITH,
  CHORUS,
  CLAV,
  INTRO,
  MELODIES,
  SWAP,
  THEME,
  tonalityOf,
  type BassFeel,
  type Colour,
  type GuitarOstinato,
  type DrumFeel,
  type GroovePlan,
  type IntroHarmony,
  type MelodyStyle,
  type Tonality,
} from '../../style';
import { Key, Template, type Bar, type Chord } from '../../theory';
import { BassWriter, DrumWriter, Harmonizer, MelodyWriter, type BassLine, type Melody } from '../writers';
import { empty, type StepGains } from '../../lib/steps';
import { Form } from './form';
import { Chorus } from './chorus';
import { Intro } from './intro';
import type { AnySection, Material } from './index';
import type { Plan, PlayedMaterial, Section, SectionKind } from './section';
import { Vamp } from './vamp';

export class BuildContext {
  // Each section, by its plan, built on first use.
  private readonly built = new Map<Plan, AnySection>();
  // Each part's material, by part id, written by the first of its sections built.
  private readonly materials = new Map<string, Material>();
  // For the harmony and lines several parts share, each written once on first use.
  private readonly shared: Rng;

  /** `traits`: what the song does throughout (Traits). */
  constructor(
    readonly key: Key,
    readonly bpm: number,
    readonly plan: Form<Plan>,
    private readonly rng: Rng,
    readonly traits: Traits = PLAIN_TRAITS,
  ) {
    this.shared = rng.fork('shared');
  }

  /** How lush the song's chords are. */
  get colour(): Colour {
    return this.traits.colour;
  }

  /** A Harmonizer in the song's colour, in a key (the song's unless given). */
  harmonizer(rng: Rng, key: Key = this.key): Harmonizer {
    return new Harmonizer(key, rng, this.colour);
  }

  /** The song's sections, each built from its plan. */
  build(): Form {
    return new Form(this.plan.sections.map((plan) => this.section(plan)));
  }

  /** The section a plan's section is built into, on first use. */
  section(plan: Plan): AnySection {
    let sec = this.built.get(plan);
    if (!sec) {
      // Each kind's class takes a plan of its own kind.
      const Kind = plan.kind as unknown as new (plan: Plan, ctx: BuildContext) => AnySection;
      sec = new Kind(plan, this);
      this.built.set(plan, sec);
    }
    return sec;
  }

  /** The first section of a kind, built, if the form has one. */
  first<K extends SectionKind>(kind: K): InstanceType<K> | undefined {
    const plan = this.plan.first(kind);
    return plan && (this.section(plan) as InstanceType<K>);
  }

  /**
   * A section's part's material: written by `write` from the part's own
   * stream for the first section of the part built, and the same for the
   * rest. Like every function here that takes an Rng, `write` owns the
   * stream it is given: a caller hands on a fork, and never draws from it
   * again.
   */
  material<M>(sec: Section<M>, write: (rng: Rng) => M): M {
    let mat = this.materials.get(sec.part);
    if (!mat) {
      mat = write(this.rng.fork(`part/${sec.part}`)) as Material;
      this.materials.set(sec.part, mat);
    }
    // Part ids are a kind's own (every chorus is part Chorus.id, each solo its own).
    return mat as M;
  }

  /** The last section of `sec`'s kind before it, built, if there is one. */
  previous<S extends Section>(sec: S): S | undefined {
    const before = this.plan.previous(sec.plan);
    return before && (this.section(before) as unknown as S);
  }

  /** The section just before `sec`, built, if there is one. */
  before(sec: Section): AnySection | undefined {
    const plan = this.plan.before(sec.plan);
    return plan && this.section(plan);
  }

  /**
   * The first chord of the section after `sec` (a lift or a drum break,
   * leading into it), and that section's shift.
   */
  firstChordAfter(sec: Section): { chord: Chord; shift: number } {
    const next = this.plan.next(sec.plan);
    const mat = next && this.section(next).material;
    if (!mat || !('bars' in mat)) {
      throw new Error(`A ${sec.kind.label} can't lead into ${next?.kind.label ?? 'nothing'}`);
    }
    return { chord: mat.bars[0][0], shift: next.shift };
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
    return this.harmonizer(rng, key).progression(template, bars, { ending });
  }

  /** Four bars of one of some templates (the key's vamps or riffs). */
  loop(templates: readonly string[], rng: Rng): Bar[] {
    return this.progress(rng.pick(templates), 4, rng.fork('harmony'));
  }

  /** Perhaps sounds for a section's keys of its own (SWAP), in order of preference. */
  swap(rng: Rng): readonly Program[] | undefined {
    return rng.chance(SWAP.chance) ? rng.shuffle(SWAP.keys) : undefined;
  }

  /** A melody in a style, in a key, over some chords. */
  melody(style: MelodyStyle, key: Key, bars: Bar[], rng: Rng): Melody {
    return new MelodyWriter(key, style, rng).write(bars);
  }

  /**
   * A section's chords in a key, with drums from its plan and a bass line
   * in a feel that sits with them: in a song whose kick follows its bass,
   * a grooving section's kick on the bass line's notes, and perhaps the
   * song's one bass riff. A grooving section plays the song's guitar
   * figure, if it has one.
   */
  band(key: Key, bars: Bar[], plan: GroovePlan, rng: Rng): PlayedMaterial {
    const drumWriter = new DrumWriter(plan.drums, rng.fork('drums'));
    const grooves = LOCKED_FEELS.includes(drumWriter.feel);
    const { lock, riff, ostinato } = this.traits;
    const feels = bassFeels(plan.bass, drumWriter.feel);
    const bass = new BassWriter(feels, key, this.bpm, rng.fork('bass'), grooves ? riff : undefined).write(bars);
    const drums = drumWriter.write(lock && grooves ? kicksOf(bass) : undefined);
    return {
      key,
      bars,
      drums,
      bass,
      clav: rng.fork('clav').weightedKey(CLAV),
      ...(ostinato && grooves ? { signature: ostinato } : {}),
    };
  }

  /** Whether the chorus is a sixteen-bar theme, in four-bar phrases (a theme song's). */
  get theme(): boolean {
    return (this.plan.first(Chorus)?.bars ?? 8) >= 16;
  }

  /**
   * The chorus's key (the intro's, if it plays the hook, and the
   * breakdown's): the song's, or in a minor or dorian song (but for a
   * theme's), now and then its relative major (ANRI's chorus).
   */
  readonly chorusKey = lazy((): Key => {
    const { key } = this;
    if (this.theme || !(key.mode === 'minor' || key.mode === 'dorian')) return key;
    if (!this.shared.fork('chorusKey').chance(CHORUS.relativeMajor)) return key;
    return new Key(key.majorTonic, 'major');
  });

  /**
   * The chorus's chords (the intro's and breakdown's too), in its key:
   * eight bars (a theme's sixteen), and a tag if the chorus runs longer.
   */
  readonly chorusBars = lazy((): Bar[] => {
    const rng = this.shared.fork(`${Chorus.id}Harmony`);
    const key = this.chorusKey();
    const { templates } = tonalityOf(key.mode);
    const bars = this.theme
      ? this.themeBars(rng.fork('theme'))
      : this.progress(rng.pick(templates.chorus), 8, rng.fork('harmony'), { key });
    const len = this.plan.first(Chorus)?.bars ?? 8;
    if (len <= bars.length) return bars;
    const tag = new Template(rng.pick(templates.tag)).fit(len - bars.length);
    return [...bars, ...this.harmonizer(rng.fork('tag'), key).realise(tag)];
  });

  // A theme's sixteen bars: the vamp three times and a tag, or the
  // chorus's changes twice, the second time to their cadence.
  private themeBars(rng: Rng): Bar[] {
    if (rng.weightedKey(THEME.harmony) === 'vamp') {
      const vamp = this.vampBars();
      const tag = new Template(rng.pick(this.tonality.templates.tag)).fit(4);
      return [...vamp, ...vamp, ...vamp, ...this.harmonizer(rng.fork('tag')).realise(tag)];
    }
    const template = rng.pick(this.tonality.templates.chorus);
    return [
      ...this.progress(template, 8, rng.fork('first')),
      ...this.progress(template, 8, rng.fork('second'), { ending: true }),
    ];
  }

  /** The chorus's melody (the intro's teaser and the breakdown's line too): a theme's in four-bar phrases. */
  readonly hook = lazy(() =>
    this.melody(
      this.theme ? MELODIES.theme : MELODIES.chorus,
      this.chorusKey(),
      this.chorusBars(),
      this.shared.fork('hook'),
    ),
  );

  /** The vamp's chords (a trading outro's too). */
  readonly vampBars = lazy(() => this.loop(this.tonality.templates.vamp, this.shared.fork(`${Vamp.id}Harmony`)));

  /** The intro's chords (a reprise's too): the hook's, planing chords, or a template of its own. */
  readonly introBars = lazy((): { harmony: IntroHarmony; bars: Bar[] } => {
    const rng = this.shared.fork(`${Intro.id}Harmony`);
    const harmony = rng.weightedKey(INTRO.harmony);
    if (harmony === 'hook') return { harmony, bars: this.chorusBars().slice(0, 4) };
    if (harmony === 'planing') return { harmony, bars: this.harmonizer(rng.fork('planing')).planing() };
    return { harmony, bars: this.progress(rng.pick(this.tonality.templates.intro), 4, rng.fork('harmony')) };
  });
}

// A quiet drum feel limits the bass to feels that suit it (any of them,
// if none of the plan's does).
function bassFeels(feels: Odds<BassFeel>, drums: DrumFeel): Odds<BassFeel> {
  const fits = BASS_WITH[drums];
  if (!fits) return feels;
  const matching = Object.entries(feels).filter(([f]) => fits.includes(f as BassFeel));
  return Object.fromEntries(matching.length ? matching : fits.map((f) => [f, 1]));
}

/**
 * What a song does throughout: how lush its chords are; whether its kick
 * follows its bass line, and the one riff that bass plays all through
 * (a riff cell, BASS_FEELS), if it does; and its signature guitar figure,
 * if it has one. (Only grooving sections, LOCKED_FEELS, play these.)
 */
export interface Traits {
  colour: Colour;
  lock: boolean;
  riff?: string;
  ostinato?: GuitarOstinato;
}

/** A song with none of the traits, lushly coloured. */
export const PLAIN_TRAITS: Traits = { colour: 'lush', lock: false };

// The drum feels that groove, where a song's traits play.
const LOCKED_FEELS: readonly DrumFeel[] = ['funk', 'disco', 'fusion', 'halfTime'];

// A kick on every note a bass line starts in its first bar: louder on the beats.
function kicksOf(bass: BassLine): StepGains {
  const starts = new Set((bass.bars[0] ?? []).map((n) => n.start).filter((s) => Number.isInteger(s) && s < 16));
  return empty().map((_, i) => (starts.has(i) ? (i % 4 ? 0.6 : 0.75) : 0));
}
