// A song: seed + options -> form, harmony, melodies, bass and drums.
// Arranger (arranger.ts) turns one into a Strudel pattern.

import { BassWriter } from './bass';
import { FINALE_STYLES, LIFT_STYLES, PRE_FLAVOURS, STYLE, TONALITIES } from './constants';
import { DrumWriter } from './drums';
import { FormPlanner, Section } from './form';
import { Harmonizer } from './harmony';
import { BAND, KITS, PICKS, SAME_SOUND, SOUND_LEVELS, VOICES } from './instruments';
import { type Melody, MelodyWriter, Solo } from './melody';
import { Chord, Key, Template } from './music';
import { Rng } from './random';
import { titleFor } from './title';
import type {
  Bar,
  Bass,
  Drums,
  IntroHarmony,
  IntroTexture,
  Lift,
  MaterialOf,
  Materials,
  MelodyKind,
  PreMelody,
  Rhythm,
  SectionType,
  PickedPart,
  Sounds,
  Tonality,
  Voice,
  VoiceRole,
} from './types';

// The parts a song picks sounds for, in the order it picks them.
const PICK_ORDER: readonly PickedPart[] = [
  'keys',
  'guitar',
  'pad',
  'strings',
  'choir',
  'answer',
  'bell',
  'stabs',
  'hornDouble',
  'bass',
];

export class Song {
  constructor(
    readonly seed: string,
    readonly title: string,
    readonly key: Key,
    readonly bpm: number,
    readonly swing: number,
    readonly kit: string | null,
    readonly sounds: Sounds,
    readonly form: Section[],
    readonly materials: Materials,
  ) {}

  /** A song from a seed, which picks everything else: mode, key, tempo, form and sounds. */
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'strudel');
    const rng = new Rng(s);
    const mode = rng.fork('mode').weightedKey(TONALITIES);
    const tonality = TONALITIES[mode];
    const key = new Key(rng.pick(tonality.tonics), mode);
    const bpm = rng.int(...STYLE.tempo);
    const swing = Math.round(rng.range(STYLE.swing) * 100) / 100;
    const form = new FormPlanner(rng.fork('form'), tonality.turnarounds).plan();
    const materials = buildMaterials(key, form, rng.fork('materials'));
    const kit = rng.fork('kit').weighted(KITS);
    const sounds = Song.soundsFor(rng.fork('voices'));
    return new Song(s, titleFor(s), key, bpm, swing, kit, sounds, form, materials);
  }

  /** A sound playing a melody part, at the part's gain and the sound's level. */
  static voice(sound: string, role: VoiceRole): Voice {
    return [sound, Math.round(VOICES.gains[role] * (SOUND_LEVELS[sound] ?? 1) * 1000) / 1000];
  }

  private static soundsFor(rng: Rng): Sounds {
    const recording = (s: string) => SAME_SOUND[s] ?? s;
    // The sounds of `from` that play no recording in `used`.
    const unused = (from: readonly string[], used: ReadonlySet<string>) => from.filter((s) => !used.has(recording(s)));
    // The sounds of `from` that play no recording before them in it.
    const distinct = (from: readonly string[]) =>
      from.filter((s, i) => !from.slice(0, i).some((t) => recording(t) === recording(s)));
    const melody = distinct(rng.shuffle(VOICES.pool)).slice(0, 2 + VOICES.soloists);
    const [lead, double, ...soloists] = melody;

    // Each part in turn, each taking a sound no part before it plays, where its list allows.
    const { picked } = PICK_ORDER.reduce(
      ({ used, picked }, part) => {
        const options = unused(PICKS[part], used);
        const sound = rng.pick(options.length ? options : PICKS[part]);
        return { used: new Set([...used, recording(sound)]), picked: { ...picked, [part]: sound } };
      },
      { used: new Set(melody.map(recording)), picked: {} as Record<PickedPart, string> },
    );
    const pickVoice = (part: 'answer' | 'bell'): Voice => [picked[part], BAND[part][1]];

    return {
      ...BAND,
      ...picked,
      answer: pickVoice('answer'),
      bell: pickVoice('bell'),
      lead: Song.voice(lead, 'lead'),
      double: Song.voice(double, 'double'),
      soloists: soloists.map((s) => Song.voice(s, 'soloists')),
    };
  }

  get bars(): number {
    return this.form.reduce((n, s) => n + s.bars, 0);
  }

  /** The soloists the form's solos go to, in order, as indexes into the sounds' soloists. */
  get soloists(): number[] {
    return this.form.flatMap((s) =>
      s.opts.soloist === undefined ? [] : [s.opts.soloist % this.sounds.soloists.length],
    );
  }

  /** The material a section type plays. */
  material<T extends SectionType>(type: T): MaterialOf<T> {
    const mat = this.materials[type];
    if (!mat) throw new Error(`No material for ${type}`);
    return mat;
  }

  describe() {
    return {
      key: this.key.name,
      mode: this.key.mode,
      bpm: this.bpm,
      bars: this.bars,
      sections: this.form.map((s) => s.describe()),
      intro: `${this.materials.intro?.harmony} ${this.materials.intro?.texture}`,
      pre: this.materials.pre?.flavour,
      finale: this.materials.finale?.ending,
      lifts: this.materials.lift?.lifts?.map((l) => l.style),
      phrases: Object.fromEntries(
        (['verse', 'chorus', 'bridge'] as const).flatMap((t) => {
          const form = this.materials[t]?.melody?.form;
          return form ? [[t, form]] : [];
        }),
      ),
    };
  }
}

// ---- Material pipeline ----------------------------------------------

// Each section type's material, from the writer below; the drum break
// last, as it picks up into whatever follows it.
function buildMaterials(key: Key, form: Section[], rng: Rng): Materials {
  const writer = new MaterialWriter(key, form, rng);
  const materials: Materials = {
    intro: writer.intro(),
    verse: writer.verse(),
    chorus: writer.chorus(),
    finale: writer.finale(),
    ...writer.pre(),
    ...writer.vamp(),
    ...writer.riff(),
    ...writer.breakdown(),
    ...writer.lift(),
    ...writer.bridge(),
    ...writer.solos(),
    ...writer.outro(),
  };
  return { ...materials, ...writer.drumBreak(materials) };
}

/**
 * Writes a song's material, a section type at a time: each written whole,
 * harmony, then melody, then the drums and bass that play it, and each
 * part drawing on its own forked stream. A type the form lacks gets none
 * (an empty object, to spread).
 */
class MaterialWriter {
  private readonly templates: Tonality['templates'];
  private readonly melRng: Rng;
  private readonly groove: GrooveWriter;
  // Chords other sections reuse: the chorus's and its hook (the intro
  // and breakdown), the vamp's (a trading outro) and the intro's (a
  // reprise).
  private readonly chorusBars: Bar[];
  private readonly hook: Melody;
  private readonly vampBars?: Bar[];
  private readonly introHarmony: { harmony: IntroHarmony; bars: Bar[] };

  constructor(
    private readonly key: Key,
    private readonly form: Section[],
    private readonly rng: Rng,
  ) {
    this.templates = tonality(key).templates;
    this.melRng = rng.fork('melody');
    this.groove = new GrooveWriter(rng.fork('drums'), rng.fork('bass'));
    this.chorusBars = buildChorus(key, form, rng);
    this.hook = this.melody('chorus', key, this.chorusBars);
    if (has(form, 'vamp')) this.vampBars = this.loop('vamp');
    this.introHarmony = this.writeIntroHarmony();
  }

  verse(): MaterialOf<'verse'> {
    const bars = progress(this.key, this.rng.pick(this.templates.verse), 8, this.rng.fork('verse'));
    return { ...this.band('verse', this.key, bars), melody: this.melody('verse', this.key, bars) };
  }

  chorus(): MaterialOf<'chorus'> {
    const { key, chorusBars: bars, hook } = this;
    return {
      ...this.band('chorus', key, bars),
      melody: hook,
      answer: hook.answer(bars, key, this.melRng.fork('answer')),
    };
  }

  pre(): Pick<Materials, 'pre'> {
    const pre = section(this.form, 'pre');
    if (!pre) return {};
    const { key } = this;
    const preRng = this.rng.fork('pre');
    const flavour = preRng.weightedKey(PRE_FLAVOURS);
    const options = tonality(key).pre[flavour];
    const fitting = options.filter((t) => new Template(t).length === pre.bars);
    const template = preRng.pick(fitting.length ? fitting : options);
    const bars = new Harmonizer(key, preRng).progression(template, pre.bars, STYLE.reharm, true);
    const def = PRE_FLAVOURS[flavour];
    return {
      pre: { ...this.band('pre', key, bars, def), flavour, melody: this.melody('pre', key, bars, 'pre', def.melody) },
    };
  }

  vamp(): Pick<Materials, 'vamp'> {
    if (!this.vampBars) return {};
    const entry = this.rng.fork('vampEntry').weighted(STYLE.vampEntry);
    return { vamp: { ...this.band('vamp', this.key, this.vampBars), entry } };
  }

  riff(): Pick<Materials, 'riff'> {
    if (!has(this.form, 'riff')) return {};
    const bars = this.loop('riff');
    return { riff: { ...this.band('riff', this.key, bars), melody: this.melody('riff', this.key, bars) } };
  }

  breakdown(): Pick<Materials, 'breakdown'> {
    const breakdown = section(this.form, 'breakdown');
    if (!breakdown) return {};
    const bars = this.chorusBars.slice(0, breakdown.bars);
    return { breakdown: { ...this.band('breakdown', this.key, bars), melody: this.hook.take(bars.length) } };
  }

  lift(): Pick<Materials, 'lift'> {
    const lifts = buildLifts(this.key, this.form, this.rng);
    if (!lifts.length) return {};
    const { drums, bass } = this.groove.write('lift', STYLE.rhythm.lift!);
    return {
      lift: {
        type: 'lift',
        key: lifts[0].key,
        drums,
        lifts: lifts.map((lift, i) => ({ ...lift, bass: bass(lift.bars, lift.key, `lift${i}`) })),
      },
    };
  }

  finale(): MaterialOf<'finale'> {
    const { key } = this;
    const [symbol, scale] = this.rng.fork('finale').pick(tonality(key).finale);
    const ending = this.rng.fork('finaleStyle').weighted(FINALE_STYLES);
    return { type: 'finale', key, bars: [[new Chord(key.tonic, symbol, scale)]], ending };
  }

  intro(): MaterialOf<'intro'> {
    const { harmony, bars } = this.introHarmony;
    const texture = this.rng.fork('introTexture').pick(Object.keys(STYLE.introTextures) as IntroTexture[]);
    const teaser = this.teaser();
    return {
      ...this.band('intro', this.key, bars, STYLE.introTextures[texture]),
      harmony,
      texture,
      ...(teaser ? { melody: teaser } : {}),
    };
  }

  bridge(): Pick<Materials, 'bridge'> {
    const bridge = buildBridge(this.key, this.form, this.rng);
    if (!bridge) return {};
    const { key, bars } = bridge;
    return { bridge: { ...this.band('bridge', key, bars), melody: this.melody('bridge', key, bars) } };
  }

  solos(): Pick<Materials, 'solo' | 'solo2'> {
    const first = section(this.form, 'solo');
    const second = section(this.form, 'solo2');
    return {
      ...(first ? { solo: { ...this.soloOver('solo', first.bars), type: 'solo' as const } } : {}),
      ...(second ? { solo2: { ...this.soloOver('solo2', second.bars), type: 'solo2' as const } } : {}),
    };
  }

  outro(): Pick<Materials, 'outro'> {
    const outro = section(this.form, 'outro');
    if (outro?.opts.outro === 'reprise') {
      return { outro: { ...this.band('outro', this.key, this.introHarmony.bars), outro: 'reprise' } };
    }
    if (outro?.opts.outro !== 'trade') return {};
    // Two soloists trade lines over the vamp's changes, or a vamp of its
    // own when the song has none.
    const tradeRng = this.rng.fork('trade');
    const loop = this.vampBars ?? progress(this.key, tradeRng.pick(this.templates.vamp), 4, tradeRng.fork('vamp'));
    const bars = Array.from({ length: outro.bars }, (_, i) => loop[i % loop.length]);
    const solo = Solo.improvise(bars, tradeRng.fork('line'));
    return { outro: { ...this.band('outro', this.key, bars, STYLE.tradeOutro), outro: 'trade', solo } };
  }

  /** The drum break, picking up into the section after it, whose material is in `materials`. */
  drumBreak(materials: Materials): Pick<Materials, 'drumBreak'> {
    const i = this.form.findIndex((s) => s.type === 'drumBreak');
    if (i < 0) return {};
    const next = this.form[i + 1];
    const mat = materials[next.type];
    // A lift starts on its first turnaround's chords.
    const into = mat?.type === 'lift' ? mat.lifts[0] : mat;
    if (!into || !('bars' in into)) throw new Error(`A drum break can't pick up into ${next.type}`);
    const { drums } = this.groove.write('drumBreak', STYLE.rhythm.drumBreak!);
    const pickup = { into: into.bars[0][0], key: into.key, shift: next.shift };
    return { drumBreak: { type: 'drumBreak', key: this.key, drums, pickup } };
  }

  // The intro's chords: the chorus's, planing chords, or a template of its own.
  private writeIntroHarmony(): { harmony: IntroHarmony; bars: Bar[] } {
    const { key } = this;
    const introRng = this.rng.fork('intro');
    const harmony = introRng.weighted(STYLE.introHarmony);
    if (harmony === 'chorus') return { harmony, bars: this.chorusBars.slice(0, 4) };
    if (harmony === 'planing') return { harmony, bars: new Harmonizer(key, introRng).planing() };
    return { harmony, bars: progress(key, introRng.pick(this.templates.intro), 4, introRng) };
  }

  // The intro's line: the hook as a teaser, or perhaps a riff of its own.
  private teaser(): Melody | undefined {
    const { harmony, bars } = this.introHarmony;
    if (harmony === 'chorus') return this.hook.take(4);
    if (harmony === 'template' && this.melRng.fork('teaser').chance(STYLE.introMelodyChance)) {
      return this.melody('riff', this.key, bars, 'intro');
    }
    return undefined;
  }

  // Four bars of one of the key's vamp or riff templates.
  private loop(kind: 'vamp' | 'riff'): Bar[] {
    return progress(this.key, this.rng.pick(this.templates[kind]), 4, this.rng.fork(kind));
  }

  // Changes for a solo section, and the line over them.
  private soloOver(type: 'solo' | 'solo2', bars: number) {
    const soloRng = this.rng.fork(type);
    const changes = new Harmonizer(this.key, soloRng).solo(bars, STYLE.reharm);
    return { ...this.band(type, this.key, changes), solo: Solo.improvise(changes, soloRng.fork('line')) };
  }

  private melody(kind: MelodyKind, at: Key, bars: Bar[], label: string = kind, style?: PreMelody): Melody {
    return new MelodyWriter(at, kind, this.melRng.fork(label), style).write(bars);
  }

  // A section's chords in a key, with drums and a bass line to play them.
  private band<T extends SectionType>(type: T, at: Key, bars: Bar[], rhythm = STYLE.rhythm[type]!) {
    const { drums, bass } = this.groove.write(type, rhythm);
    return { type, key: at, bars, drums, bass: bass(bars, at) };
  }
}

const has = (form: Section[], type: SectionType) => form.some((s) => s.type === type);
const section = (form: Section[], type: SectionType) => form.find((s) => s.type === type);
const tonality = (key: Key) => TONALITIES[key.mode];
const progress = (key: Key, template: string, bars: number, rng: Rng) =>
  new Harmonizer(key, rng).progression(template, bars, STYLE.reharm);

// Eight bars, and a tag if the chorus runs longer.
function buildChorus(key: Key, form: Section[], rng: Rng): Bar[] {
  const { templates } = tonality(key);
  const chorusRng = rng.fork('chorus');
  const bars = progress(key, rng.pick(templates.chorus), 8, chorusRng);
  const len = section(form, 'chorus')?.bars ?? 8;
  if (len <= 8) return bars;
  const tag = new Template(rng.pick(templates.tag)).fit(len - 8);
  return [...bars, ...new Harmonizer(key, chorusRng).realize(tag)];
}

// The lifts' turnarounds and styles, without their bass lines.
function buildLifts(key: Key, form: Section[], rng: Rng): Omit<Lift, 'bass'>[] {
  const liftRng = rng.fork('lift');
  const styleRng = rng.fork('liftStyle');
  return form
    .filter((s) => s.type === 'lift')
    .reduce<Omit<Lift, 'bass'>[]>((lifts, s) => {
      const liftKey = key.transpose(s.opts.liftTo!);
      const turnaround = s.opts.turnaround!;
      const bars = new Harmonizer(liftKey, liftRng).turnaround(turnaround);
      // Never the same style as the lift before.
      const before = lifts.at(-1)?.style;
      const style = styleRng.weighted(LIFT_STYLES.filter(([name]) => name !== before));
      return [...lifts, { turnaround, key: liftKey, bars, style }];
    }, []);
}

// A related key's progression, then the cadence home (into the key of
// whatever follows).
function buildBridge(key: Key, form: Section[], rng: Rng): { key: Key; bars: Bar[] } | null {
  if (!has(form, 'bridge')) return null;
  const bridgeRng = rng.fork('bridge');
  const bridgeKey = new Harmonizer(key, bridgeRng).bridgeKey(STYLE.adventurous);
  const after = form.slice(form.findIndex((s) => s.type === 'bridge') + 1).find((s) => s.type !== 'drumBreak');
  const templates = TONALITIES[bridgeKey.mode].templates.bridge;
  if (!templates) throw new Error(`No bridge templates in ${bridgeKey.mode}`);
  const body = progress(bridgeKey, bridgeRng.pick(templates), 6, bridgeRng);
  const cadence = new Harmonizer(key.transpose(after?.shift ?? 0), bridgeRng).approach();
  return { key: bridgeKey, bars: [...body, ...cadence] };
}

/**
 * Drums for each section, from its rhythm's plan, and bass lines in a
 * feel that sits with them.
 */
class GrooveWriter {
  constructor(
    private readonly drumRng: Rng,
    private readonly bassRng: Rng,
  ) {}

  write(type: SectionType, { drums: plan, bass: feels }: Rhythm) {
    const r = this.drumRng.fork(type);
    const feel = r.pick(plan.feels);
    const crash = r.chance(plan.crash);
    const fill = r.chance(plan.fill);
    const drums: Drums = { ...new DrumWriter(feel, r).write(fill), crash, fill };
    const fits = STYLE.bassWith[feel];
    const matching = fits ? feels.filter((f) => fits.includes(f)) : feels;
    const bass = (bars: Bar[], key: Key, label: string = type): Bass =>
      new BassWriter(matching.length ? matching : fits!, key, this.bassRng.fork(label), STYLE.approachChromatic).write(
        bars,
      );
    return { drums, bass };
  }
}
