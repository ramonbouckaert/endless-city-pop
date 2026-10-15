// What a section is built in: the song's key, tempo and plan, the other
// sections, and the harmony several parts share (the chorus's chords and
// its hook, the vamp's, the intro's). A section's constructor writes its
// part's material from it.

import type { Program } from '../../lib/general-midi';
import { lazy } from '../../lib/lazy';
import { only, type Odds, type Rng } from '../../lib/random';
import {
  BALLAD_FEELS,
  balladLean,
  BASS_WITH,
  CHORUS,
  CLAV,
  INTRO,
  MELODIES,
  SWAP,
  THEME,
  tonalityOf,
  WEATHER,
  type BassFeel,
  type Colour,
  type GuitarOstinato,
  type DrumFeel,
  type GroovePlan,
  type IntroHarmony,
  type MelodyStyle,
  type Tonality,
  type Weather,
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

  /** How far the song's tempo leans it towards a ballad (0 to 1, BALLAD). */
  get ballad(): number {
    return balladLean(this.bpm);
  }

  /** Whether the song has a chorus (all but a verse-and-B song's). */
  get choruses(): boolean {
    return !!this.plan.first(Chorus);
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

  /**
   * The section just before `sec`, built, if there is one (given `kind`,
   * only if it is of that kind, and only then built: a section that picks
   * up into `sec`, such as a drum break into a lift, is built after it).
   */
  before(sec: Section): AnySection | undefined;
  before<K extends SectionKind>(sec: Section, kind: K): InstanceType<K> | undefined;
  before(sec: Section, kind?: SectionKind): AnySection | undefined {
    const plan = this.plan.before(sec.plan);
    if (!plan || (kind && plan.kind !== kind)) return undefined;
    return this.section(plan);
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
   * given), ending on its cadence if `ending`; two chords a bar, if
   * `paired` and the song pairs them.
   */
  progress(template: string, bars: number, rng: Rng, { key = this.key, ending = false, paired = false } = {}): Bar[] {
    return this.harmonizer(rng, key).progression(template, bars, { ending, paired: paired && !!this.traits.paired });
  }

  /** Four bars of one of some templates (the key's vamps or riffs). */
  loop(templates: readonly string[], rng: Rng): Bar[] {
    return this.progress(rng.pick(templates), 4, rng.fork('harmony'));
  }

  /** Perhaps sounds for a section's keys of its own (SWAP), in order of preference. */
  swap(rng: Rng): readonly Program[] | undefined {
    return rng.chance(SWAP.chance) ? rng.shuffle(SWAP.keys) : undefined;
  }

  /** Perhaps the song's weather under a section, at `chance` (WEATHER). */
  weather(chance: number, rng: Rng): { weather?: Weather } {
    return rng.chance(chance) ? { weather: this.songWeather() } : {};
  }

  // The song's weather, the same under every section that has any.
  private readonly songWeather = lazy(() => this.shared.fork('weather').weightedKey(WEATHER.sounds));

  /** A melody in a style, in a key, over some chords: in longer notes, the further the song leans towards a ballad. */
  melody(style: MelodyStyle, key: Key, bars: Bar[], rng: Rng): Melody {
    return new MelodyWriter(key, style, rng, this.ballad).write(bars);
  }

  /**
   * A section's chords in a key, with drums from its plan and a bass line
   * in a feel that sits with them: in a song whose kick follows its bass,
   * a grooving section's kick on the bass line's notes, and perhaps the
   * song's one bass riff. A grooving section plays the song's guitar
   * figure, if it has one. The slower the song, the likelier a ballad's
   * feels (BALLAD_FEELS).
   */
  band(key: Key, bars: Bar[], groove: GroovePlan, rng: Rng): PlayedMaterial {
    const plan = easedGroove(groove, this.ballad);
    const drumWriter = new DrumWriter(plan.drums, rng.fork('drums'));
    const grooves = LOCKED_FEELS.has(drumWriter.feel);
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
      : this.progress(rng.pick(templates.chorus), 8, rng.fork('harmony'), { key, paired: true });
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

  /**
   * The intro's chords (a reprise's too), and their key: the hook's (in a
   * song with a chorus, in the chorus's key), planing chords, or a
   * template of its own.
   */
  readonly introBars = lazy((): { harmony: IntroHarmony; bars: Bar[]; key: Key } => {
    const rng = this.shared.fork(`${Intro.id}Harmony`);
    const harmony = rng.weightedKey(INTRO.harmony, this.choruses ? undefined : 'hook');
    const { key } = this;
    if (harmony === 'hook') return { harmony, bars: this.chorusBars().slice(0, 4), key: this.chorusKey() };
    if (harmony === 'planing') return { harmony, bars: this.harmonizer(rng.fork('planing')).planing(), key };
    return { harmony, bars: this.progress(rng.pick(this.tonality.templates.intro), 4, rng.fork('harmony')), key };
  });
}

// A quiet drum feel limits the bass to feels that suit it (any of them,
// if none of the plan's that weigh anything does).
function bassFeels(feels: Odds<BassFeel>, drums: DrumFeel): Odds<BassFeel> {
  const fits = BASS_WITH[drums];
  if (!fits) return feels;
  const matching = only(feels, (f, weight) => weight > 0 && fits.includes(f));
  return Object.keys(matching).length ? matching : Object.fromEntries(fits.map((f) => [f, 1]));
}

/**
 * What a song does throughout: how lush its chords are; whether its kick
 * follows its bass line, and the one riff that bass plays all through
 * (a riff cell, BASS_FEELS), if it does; its signature guitar figure, if
 * it has one (only grooving sections, LOCKED_FEELS, play these); whether
 * its verses and choruses move two chords a bar; and how far it eases
 * back at the end of each four-bar phrase, if it does (the last two
 * likelier, and the kick less likely to follow the bass, the slower the
 * song: BALLAD).
 */
export interface Traits {
  colour: Colour;
  lock: boolean;
  riff?: string;
  ostinato?: GuitarOstinato;
  paired?: boolean;
  /** The share of its tempo the last beat of each four-bar phrase eases back to. */
  ritard?: number;
}

/** A song with none of the traits, lushly coloured. */
export const PLAIN_TRAITS: Traits = { colour: 'lush', lock: false };

// The drum feels that groove, where a song's traits play.
const LOCKED_FEELS: ReadonlySet<DrumFeel> = new Set(['funk', 'disco', 'fusion', 'halfTime']);

// A kick on every note a bass line starts in its first bar: louder on the beats.
function kicksOf(bass: BassLine): StepGains {
  const starts = new Set((bass.bars[0] ?? []).map((n) => n.start).filter((s) => Number.isInteger(s) && s < 16));
  const gain = (i: number) => (i % 4 ? 0.6 : 0.75);
  return empty().map((_, i) => (starts.has(i) ? gain(i) : 0));
}

// A section's groove eased towards a ballad's (BALLAD_FEELS): `t` of
// each eased feel's weight moved onto the ballad's feel (all of it at 1).
function easedGroove({ drums, bass }: GroovePlan, t: number): GroovePlan {
  const eased = <F extends string>(odds: Odds<F>, to: Readonly<Partial<Record<F, F>>>): Odds<F> => {
    const out: Partial<Record<F, number>> = {};
    for (const [feel, weight] of Object.entries(odds) as [F, number][]) {
      const as = to[feel];
      out[feel] = (out[feel] ?? 0) + (as ? weight * (1 - t) : weight);
      if (as) out[as] = (out[as] ?? 0) + weight * t;
    }
    return out;
  };
  return { drums: { ...drums, feels: eased(drums.feels, BALLAD_FEELS.drums) }, bass: eased(bass, BALLAD_FEELS.bass) };
}
