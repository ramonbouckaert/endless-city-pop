// Writes the material each part of a form plays: its harmony, then its
// melody, then the drums and bass that play it. Each part draws on its
// own forked stream. A part is written when first asked for, so one can
// draw on another (a drum break picks up into whatever follows it; a
// lift is never played the way the one before it was).

import type { Rng } from '../lib/random';
import {
  ADVENTUROUS,
  BOSSA_SOLO,
  FINALE_STYLES,
  FORM,
  INTRO,
  INTRO_TEXTURES,
  LIFT_STYLES,
  PRE_FLAVOURS,
  RHYTHM,
  TONALITIES,
  TRADE_OUTRO,
  VAMP_ENTRY,
  type GroovePlan,
  type IntroHarmony,
  type IntroTexture,
  type MelodyKind,
  type PreMelody,
  type SectionType,
} from '../style';
import { Chord, Template, type Bar, type Key } from '../theory';
import { writeGroove } from './groove';
import { Harmonizer } from './harmony';
import { materialOf, type Material, type MaterialOf } from './material';
import { MelodyWriter, Solo, type Melody } from './melody';
import type { Section } from './section';

/** Each part's material, by part id. */
export function writeMaterials(key: Key, form: readonly Section[], rng: Rng): Record<string, Material> {
  const writer = new MaterialWriter(key, form, rng);
  return Object.fromEntries(form.map((sec) => [sec.part, writer.material(sec)]));
}

type Writers = { [T in SectionType]: (sec: Section, rng: Rng) => MaterialOf<T> };

class MaterialWriter {
  private readonly written = new Map<string, Material>();
  private readonly writers: Writers = {
    intro: (sec, rng) => this.intro(sec, rng),
    vamp: (sec, rng) => this.vamp(sec, rng),
    verse: (sec, rng) => this.verse(sec, rng),
    pre: (sec, rng) => this.pre(sec, rng),
    chorus: (sec, rng) => this.chorus(sec, rng),
    riff: (sec, rng) => this.riff(sec, rng),
    bridge: (sec, rng) => this.bridge(sec, rng),
    solo: (sec, rng) => this.solo(sec, rng),
    breakdown: (sec, rng) => this.breakdown(sec, rng),
    lift: (sec, rng) => this.lift(sec, rng),
    outro: (sec, rng) => this.outro(sec, rng),
    drumBreak: (sec, rng) => this.drumBreak(sec, rng),
    finale: (sec, rng) => this.finale(sec, rng),
  };

  constructor(
    private readonly key: Key,
    private readonly form: readonly Section[],
    private readonly rng: Rng,
  ) {}

  /** A section's material: its part's, written on first use. */
  material(sec: Section): Material {
    let mat = this.written.get(sec.part);
    if (!mat) {
      mat = this.writers[sec.type](sec, this.rng.fork(`part/${sec.part}`));
      this.written.set(sec.part, mat);
    }
    return mat;
  }

  private get templates() {
    return TONALITIES[this.key.mode].templates;
  }

  // ---- Shared harmony --------------------------------------------------
  // Chords and lines several parts play: the chorus's and its hook (in
  // the intro and breakdown too), the vamp's (a trading outro's too) and
  // the intro's (a reprise's too).

  // Eight bars, and a tag if the chorus runs longer.
  private chorusBarsMemo?: Bar[];
  private get chorusBars(): Bar[] {
    if (this.chorusBarsMemo) return this.chorusBarsMemo;
    const rng = this.rng.fork('chorusHarmony');
    const bars = this.progress(rng.pick(this.templates.chorus), 8, rng);
    const len = this.first('chorus')?.bars ?? 8;
    const tag =
      len > 8 ? new Harmonizer(this.key, rng).realize(new Template(rng.pick(this.templates.tag)).fit(len - 8)) : [];
    return (this.chorusBarsMemo = [...bars, ...tag]);
  }

  private hookMemo?: Melody;
  private get hook(): Melody {
    return (this.hookMemo ??= this.melody('chorus', this.key, this.chorusBars, this.rng.fork('hook')));
  }

  private vampBarsMemo?: Bar[];
  private get vampBars(): Bar[] {
    return (this.vampBarsMemo ??= this.loop('vamp', this.rng.fork('vampHarmony')));
  }

  // The intro's chords: the chorus's, planing chords, or a template of its own.
  private introHarmonyMemo?: { harmony: IntroHarmony; bars: Bar[] };
  private get introHarmony(): { harmony: IntroHarmony; bars: Bar[] } {
    if (this.introHarmonyMemo) return this.introHarmonyMemo;
    const rng = this.rng.fork('introHarmony');
    const harmony = rng.weighted(INTRO.harmony);
    let bars: Bar[];
    if (harmony === 'chorus') bars = this.chorusBars.slice(0, 4);
    else if (harmony === 'planing') bars = new Harmonizer(this.key, rng).planing();
    else bars = this.progress(rng.pick(this.templates.intro), 4, rng);
    return (this.introHarmonyMemo = { harmony, bars });
  }

  // ---- Writers ----------------------------------------------------------

  private intro(_sec: Section, rng: Rng): MaterialOf<'intro'> {
    const { harmony, bars } = this.introHarmony;
    const texture = rng.pick(Object.keys(INTRO_TEXTURES) as IntroTexture[]);
    // The hook as a teaser, or perhaps a riff of its own.
    let melody: Melody | undefined;
    if (harmony === 'chorus') melody = this.hook.take(4);
    else if (harmony === 'template' && rng.chance(INTRO.melodyChance))
      melody = this.melody('riff', this.key, bars, rng);
    return {
      ...this.band('intro', this.key, bars, INTRO_TEXTURES[texture], rng),
      harmony,
      texture,
      ...(melody ? { melody } : {}),
    };
  }

  private vamp(_sec: Section, rng: Rng): MaterialOf<'vamp'> {
    return { ...this.band('vamp', this.key, this.vampBars, RHYTHM.vamp, rng), entry: rng.weighted(VAMP_ENTRY) };
  }

  private verse(_sec: Section, rng: Rng): MaterialOf<'verse'> {
    const bars = this.progress(rng.pick(this.templates.verse), 8, rng);
    return {
      ...this.band('verse', this.key, bars, RHYTHM.verse, rng),
      melody: this.melody('verse', this.key, bars, rng),
    };
  }

  private pre(sec: Section, rng: Rng): MaterialOf<'pre'> {
    const { key } = this;
    const flavour = rng.weightedKey(PRE_FLAVOURS);
    const def = PRE_FLAVOURS[flavour];
    const options = TONALITIES[key.mode].pre[flavour];
    const fitting = options.filter((t) => new Template(t).length === sec.bars);
    const template = rng.pick(fitting.length ? fitting : options);
    const bars = new Harmonizer(key, rng.fork('harmony')).progression(template, sec.bars, { ending: true });
    return {
      ...this.band('pre', key, bars, def, rng),
      flavour,
      melody: this.melody('pre', key, bars, rng, def.melody),
    };
  }

  private chorus(_sec: Section, rng: Rng): MaterialOf<'chorus'> {
    const { key, chorusBars: bars, hook } = this;
    return {
      ...this.band('chorus', key, bars, RHYTHM.chorus, rng),
      melody: hook,
      answer: hook.answer(bars, key, rng.fork('answer')),
    };
  }

  private riff(_sec: Section, rng: Rng): MaterialOf<'riff'> {
    const bars = this.loop('riff', rng);
    return { ...this.band('riff', this.key, bars, RHYTHM.riff, rng), melody: this.melody('riff', this.key, bars, rng) };
  }

  // A related key's progression, then the cadence home (into the key of
  // whatever follows).
  private bridge(sec: Section, rng: Rng): MaterialOf<'bridge'> {
    const key = new Harmonizer(this.key, rng).bridgeKey(ADVENTUROUS);
    const after = this.after(sec);
    const templates = TONALITIES[key.mode].templates.bridge;
    if (!templates) throw new Error(`No bridge templates in ${key.mode}`);
    const body = this.progress(rng.pick(templates), 6, rng, key);
    const cadence = new Harmonizer(this.key.transpose(after?.shift ?? 0), rng).approach();
    const bars = [...body, ...cadence];
    return { ...this.band('bridge', key, bars, RHYTHM.bridge, rng), melody: this.melody('bridge', key, bars, rng) };
  }

  // Changes as long as the section, and the line over them.
  private solo(sec: Section, rng: Rng): MaterialOf<'solo'> {
    const comp = sec.opts.second ? 'bossa' : 'band';
    const bars = new Harmonizer(this.key, rng.fork('changes')).solo(sec.bars);
    return {
      ...this.band('solo', this.key, bars, comp === 'bossa' ? BOSSA_SOLO : RHYTHM.solo, rng),
      solo: Solo.improvise(bars, rng.fork('line')),
      comp,
    };
  }

  // The hook over the chorus's first bars.
  private breakdown(sec: Section, rng: Rng): MaterialOf<'breakdown'> {
    const bars = this.chorusBars.slice(0, sec.bars);
    return { ...this.band('breakdown', this.key, bars, RHYTHM.breakdown, rng), melody: this.hook.take(bars.length) };
  }

  // A turnaround into the lifted key, never played the way the lift before it was.
  private lift(sec: Section, rng: Rng): MaterialOf<'lift'> {
    const key = this.key.transpose(sec.opts.liftTo!);
    const turnaround = sec.opts.turnaround!;
    const bars = new Harmonizer(key, rng.fork('harmony')).turnaround(turnaround);
    const before = this.form.slice(0, this.form.indexOf(sec)).findLast((s) => s.type === 'lift');
    const last = before && materialOf('lift', this.material(before)).style;
    const style = rng.weighted(LIFT_STYLES.filter(([name]) => name !== last));
    return { ...this.band('lift', key, bars, RHYTHM.lift, rng), turnaround, style };
  }

  private outro(sec: Section, rng: Rng): MaterialOf<'outro'> {
    if (sec.opts.outro === 'reprise') {
      const intro = materialOf('intro', this.material(this.form[0]));
      const { melody } = intro;
      return {
        ...this.band('outro', this.key, intro.bars, RHYTHM.outro, rng),
        outro: 'reprise',
        ...(melody ? { melody } : {}),
      };
    }
    // Two soloists trade lines over the vamp's changes, or a vamp of its
    // own when the song has none: the song's soloists first, if it had solos.
    const loop = this.first('vamp') ? this.vampBars : this.loop('vamp', rng.fork('vamp'));
    const bars = Array.from({ length: sec.bars }, (_, i) => loop[i % loop.length]);
    const fromSolos = this.form.flatMap((s) => (s.opts.soloist === undefined ? [] : [s.opts.soloist]));
    const [first, second] = [...new Set([...fromSolos, ...FORM.soloists])];
    return {
      ...this.band('outro', this.key, bars, TRADE_OUTRO, rng),
      outro: 'trade',
      solo: Solo.improvise(bars, rng.fork('line')),
      soloists: [first, second],
    };
  }

  // Drums alone, then a pickup into the next section's first chord.
  private drumBreak(sec: Section, rng: Rng): MaterialOf<'drumBreak'> {
    const next = this.form[this.form.indexOf(sec) + 1];
    const into = next && this.material(next);
    if (!into || !('bars' in into)) throw new Error(`A drum break can't pick up into ${next?.type ?? 'nothing'}`);
    const { drums } = writeGroove(RHYTHM.drumBreak, rng);
    return {
      type: 'drumBreak',
      key: this.key,
      drums,
      pickup: { into: into.bars[0][0], key: into.key, shift: next.shift },
    };
  }

  private finale(_sec: Section, rng: Rng): MaterialOf<'finale'> {
    const { key } = this;
    const [symbol, scale] = rng.pick(TONALITIES[key.mode].finale);
    return { type: 'finale', key, chord: new Chord(key.tonic, symbol, scale), ending: rng.weighted(FINALE_STYLES) };
  }

  // ---- Helpers ----------------------------------------------------------

  private first(type: SectionType): Section | undefined {
    return this.form.find((s) => s.type === type);
  }

  // The section after `sec`, not counting a drum break.
  private after(sec: Section): Section | undefined {
    return this.form.slice(this.form.indexOf(sec) + 1).find((s) => s.type !== 'drumBreak');
  }

  private progress(template: string, bars: number, rng: Rng, key = this.key): Bar[] {
    return new Harmonizer(key, rng.fork('harmony')).progression(template, bars);
  }

  // Four bars of one of the key's vamp or riff templates.
  private loop(kind: 'vamp' | 'riff', rng: Rng): Bar[] {
    return this.progress(rng.pick(this.templates[kind]), 4, rng);
  }

  private melody(kind: MelodyKind, key: Key, bars: Bar[], rng: Rng, style?: PreMelody): Melody {
    return new MelodyWriter(key, kind, rng.fork('melody'), style).write(bars);
  }

  // A section's chords in a key, with drums and a bass line to play them.
  private band<T extends SectionType>(type: T, key: Key, bars: Bar[], plan: GroovePlan, rng: Rng) {
    const groove = writeGroove(plan, rng.fork('groove'));
    return { type, key, bars, drums: groove.drums, bass: groove.bass(bars, key) };
  }
}
