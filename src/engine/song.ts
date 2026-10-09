// A song: seed + options -> form, harmony, melodies, bass and drums.
// Arranger (arranger.ts) turns one into a Strudel pattern.

import { BassWriter } from './bass';
import { PRE_FLAVOURS, STYLE, TITLE_ROMAJI, TITLE_WORDS, TONALITIES } from './constants';
import { DrumWriter } from './drums';
import { FormPlanner, Section } from './form';
import { Harmonizer, Template } from './harmony';
import { BAND, KITS, PICKS, SAME_SOUND, SOUND_LEVELS, VOICES } from './instruments';
import { MelodyWriter, Solo } from './melody';
import { Chord, Key } from './music';
import { Rng } from './random';
import { romanise } from './romaji';
import type {
  Bar,
  DrumPlan,
  IntroHarmony,
  IntroTexture,
  Lift,
  Material,
  Materials,
  MelodyKind,
  Mode,
  PreFlavour,
  SectionType,
  BandSounds,
  PickedPart,
  SongOptions,
  Sounds,
  TitleParts,
  TitleWord,
  Tonality,
  Voice,
  VoiceRole,
} from './types';

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

  /** A song from a seed (and optionally a tonic, mode and tempo). */
  static generate(options: SongOptions = {}): Song {
    const seed = String(options.seed ?? 'strudel');
    const rng = new Rng(seed);
    // The mode has its own stream, so it doesn't reshuffle the rest.
    const mode =
      options.mode ??
      rng.fork('mode').weighted(Object.entries(TONALITIES).map(([m, t]) => [m as Mode, t.weight] as const));
    const tonality = TONALITIES[mode];
    const key = new Key(options.key ?? rng.pick(tonality.tonics), mode);
    const bpm = options.bpm ?? rng.int(...STYLE.tempo);
    const swing = Math.round(rng.range(STYLE.swing) * 100) / 100;
    const form = new FormPlanner(rng.fork('form'), tonality.turnarounds).plan();
    const materials = new SongBuilder(key, form, rng.fork('materials')).build();
    const kit = rng.fork('kit').weighted(KITS);
    const sounds = Song.soundsFor(rng.fork('voices'));
    return new Song(seed, Song.titleFor(seed), key, bpm, swing, kit, sounds, form, materials);
  }

  /** A sound playing a melody part, at the part's gain and the sound's level. */
  static voice(sound: string, role: VoiceRole): Voice {
    return [sound, Math.round(VOICES.gains[role] * (SOUND_LEVELS[sound] ?? 1) * 1000) / 1000];
  }

  // A lead, its double and the soloists from the pool, then a sound for
  // each picked part: never a sound another part plays (or its twin, in
  // SAME_SOUND), where its list allows.
  private static soundsFor(rng: Rng): Sounds {
    const used = new Set<string>();
    const recording = (s: string) => SAME_SOUND[s] ?? s;
    const free = (s: string) => !used.has(recording(s));
    const take = (s: string) => (used.add(recording(s)), s);
    const melody: string[] = [];
    for (const s of rng.shuffle(VOICES.pool)) if (melody.length < 2 + VOICES.soloists && free(s)) melody.push(take(s));
    const [lead, double, ...soloists] = melody;
    const band: Record<string, BandSounds[keyof BandSounds]> = { ...BAND };
    for (const part of Object.keys(PICKS) as PickedPart[]) {
      const options = PICKS[part].filter(free);
      const sound = take(rng.pick(options.length ? options : PICKS[part]));
      const was = BAND[part];
      band[part] = typeof was === 'string' ? sound : [sound, was[1]];
    }
    return {
      ...(band as unknown as BandSounds),
      lead: Song.voice(lead, 'lead'),
      double: Song.voice(double, 'double'),
      soloists: soloists.map((s) => Song.voice(s, 'soloists')),
    };
  }

  /** A city pop title (titleParts), the second part in brackets, after a dash, or straight after. */
  static titleFor(seed: string): string {
    const { title, aside, join } = Song.titleParts(seed);
    return join === 'brackets' ? `${title} (${aside})` : join === 'dash' ? `${title} – ${aside}` : `${title} ${aside}`;
  }

  /**
   * A city pop title in two languages, and how to join them: "真夜中の
   * ドライブ" and "Midnight Drive", either first, or the same with the
   * Japanese in katakana English (ミッドナイト・ドライブ). The English is as
   * it is, in capitals, or in fullwidth letters as on Japanese record
   * sleeves (Ｍｉｄｎｉｇｈｔ　Ｄｒｉｖｅ, ＭＩＤＮＩＧＨＴ　ＤＲＩＶＥ). One title in
   * five (TITLE_ROMAJI) gives the Japanese in romaji instead of the English
   * (Mayonaka no Doraibu, Middonaito Doraibu), without diacritics.
   */
  static titleParts(seed: string): TitleParts {
    const rng = new Rng(`${seed}/title`);
    const { modifiers, nouns } = TITLE_WORDS;
    // Not "Rainy Rain" or "Midsummer Summer".
    const clash = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase().slice(0, 4));
    let mod, noun;
    do [mod, noun] = [rng.pick(modifiers), rng.pick(nouns)];
    while (clash(mod.en, noun.en) || clash(noun.en, mod.en));
    const en = `${mod.en} ${noun.en}`;
    const katakana = /^[゠-ヿ]+$/;
    const both = katakana.test(mod.ja) && katakana.test(noun.ja);
    const ja = mod.adj ? mod.ja + noun.ja : both ? `${mod.ja}・${noun.ja}` : `${mod.ja}の${noun.ja}`;
    const kana = mod.kana && noun.kana ? `${mod.kana}・${noun.kana}` : undefined;
    const [title, aside] = rng.pick([
      [ja, en],
      [en, ja],
      ...(kana
        ? [
            [kana, en],
            [en, kana],
          ]
        : []),
    ]);
    const style = rng.pick(['plain', 'caps', 'fullwidth', 'fullwidth caps'] as const);
    const join = rng.pick(['brackets', 'dash', 'space'] as const);
    // The Japanese side read aloud, each word capitalised but の (no).
    const romanised = rng.chance(TITLE_ROMAJI);
    const japanese = title === en ? aside : title;
    const read = (w: TitleWord) => w.romaji ?? romanise(w.ja);
    const capital = (s: string) => s.replace(/(^| )(\p{L})/gu, (_, gap, c: string) => gap + c.toUpperCase());
    const reading =
      japanese === kana
        ? capital(romanise(kana))
        : capital(`${read(mod)}${mod.adj || both ? ' ' : ' no '}${read(noun)}`).replace(/ No /, ' no ');
    const english = romanised ? reading : en;
    // ASCII letters to their fullwidth forms, spaces to ideographic ones.
    const fullwidth = (s: string) =>
      s
        .replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))
        .replace(/ /g, String.fromCharCode(0x3000));
    const cased = style.endsWith('caps') ? english.toUpperCase() : english;
    const styled = style.startsWith('fullwidth') ? fullwidth(cased) : cased;
    const side = (s: string) => (s === en ? styled : s);
    return { title: side(title), aside: side(aside), join, romanised };
  }

  get bars(): number {
    return this.form.reduce((n, s) => n + s.bars, 0);
  }

  /** The material a section type plays. */
  material(type: SectionType): Material {
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
      pre: this.materials.pre?.flavour,
    };
  }
}

/** Writes the material for every section type a form uses. */
class SongBuilder {
  private readonly m: Materials = {};
  private chorusBars: Bar[] = [];
  private introHarmony: IntroHarmony = 'template';
  private texture: IntroTexture = 'pads';

  constructor(
    private readonly key: Key,
    private readonly form: Section[],
    private readonly rng: Rng,
  ) {}

  private get tonality(): Tonality {
    return TONALITIES[this.key.mode];
  }

  build(): Materials {
    this.harmony();
    this.intro();
    this.bridge();
    this.solos();
    this.melodies();
    this.drumBreak();
    this.rhythm();
    return this.m;
  }

  private has(type: SectionType): boolean {
    return this.form.some((s) => s.type === type);
  }

  private section(type: SectionType): Section | undefined {
    return this.form.find((s) => s.type === type);
  }

  private add(type: SectionType, material: Partial<Material>): Material {
    return (this.m[type] = { type, key: this.key, ...material });
  }

  private progression(type: SectionType, template: string, bars: number, rng = this.rng.fork(type), key = this.key) {
    return new Harmonizer(key, rng).progression(template, bars, STYLE.reharm);
  }

  // Verse, chorus (perhaps with a tag), pre-chorus, vamp and riff
  // changes, the lift into a key change, and the final chord.
  private harmony(): void {
    const { templates, finale } = this.tonality;
    const { rng, key } = this;
    this.add('verse', { bars: this.progression('verse', rng.pick(templates.verse), 8) });

    const chorusRng = rng.fork('chorus');
    this.chorusBars = this.progression('chorus', rng.pick(templates.chorus), 8, chorusRng);
    const chorusLen = this.section('chorus')?.bars ?? 8;
    if (chorusLen > 8) {
      const tag = new Template(rng.pick(templates.tag)).fit(chorusLen - 8);
      this.chorusBars.push(...new Harmonizer(key, chorusRng).realize(tag));
    }
    this.add('chorus', { bars: this.chorusBars });

    this.pre();
    for (const type of ['vamp', 'riff'] as const) {
      if (this.has(type)) this.add(type, { bars: this.progression(type, rng.pick(templates[type]), 4) });
    }
    if (this.m.vamp) this.m.vamp.entry = rng.fork('vampEntry').weighted(STYLE.vampEntry);
    const breakdown = this.section('breakdown');
    if (breakdown) this.add('breakdown', { bars: this.chorusBars.slice(0, breakdown.bars) });
    this.lifts();
    const [symbol, scale] = rng.fork('finale').pick(finale);
    this.add('finale', { bars: [[new Chord(key.tonic, symbol, scale)]] });
  }

  // The pre-chorus, in one of its flavours: a template of its length if
  // there is one, fitted to end on its cadence into the chorus.
  private pre(): void {
    const section = this.section('pre');
    if (!section) return;
    const rng = this.rng.fork('pre');
    const flavour = rng.weighted(
      Object.entries(PRE_FLAVOURS).map(([name, def]) => [name as PreFlavour, def.weight] as const),
    );
    const templates = this.tonality.pre[flavour];
    const fitting = templates.filter((t) => new Template(t).length === section.bars);
    const template = rng.pick(fitting.length ? fitting : templates);
    const bars = new Harmonizer(this.key, rng).progression(template, section.bars, STYLE.reharm, true);
    this.add('pre', { bars, flavour });
  }

  // Each lift's turnaround into its new key. The material's own bars and
  // key are the first lift's.
  private lifts(): void {
    const rng = this.rng.fork('lift');
    const lifts = this.form
      .filter((s) => s.type === 'lift')
      .map((s): Lift => {
        const key = this.key.transpose(s.opts.liftTo!);
        const turnaround = s.opts.turnaround!;
        return { turnaround, key, bars: new Harmonizer(key, rng).turnaround(turnaround) };
      });
    if (lifts.length) this.add('lift', { bars: lifts[0].bars, key: lifts[0].key, lifts });
  }

  // The intro: the chorus's first bars, planing chords or an intro
  // template, in one of the style's textures. The outro plays it too.
  private intro(): void {
    const rng = this.rng.fork('intro');
    this.introHarmony = rng.weighted(STYLE.introHarmony);
    const bars =
      this.introHarmony === 'chorus'
        ? this.chorusBars.slice(0, 4)
        : this.introHarmony === 'planing'
          ? new Harmonizer(this.key, rng).planing()
          : this.progression('intro', rng.pick(this.tonality.templates.intro), 4, rng);
    this.texture = rng.pick(Object.keys(STYLE.introTextures) as IntroTexture[]);
    this.add('intro', { bars, harmony: this.introHarmony, texture: this.texture });
    if (this.has('outro')) this.add('outro', { bars });
  }

  // The bridge, in a related key, ending with a cadence into whatever
  // follows it.
  private bridge(): void {
    if (!this.has('bridge')) return;
    const rng = this.rng.fork('bridge');
    const key = new Harmonizer(this.key, rng).bridgeKey(STYLE.adventurous);
    const after = this.form
      .slice(this.form.findIndex((s) => s.type === 'bridge') + 1)
      .find((s) => s.type !== 'drumBreak');
    const templates = TONALITIES[key.mode].templates.bridge;
    if (!templates) throw new Error(`No bridge templates in ${key.mode}`);
    const body = this.progression('bridge', rng.pick(templates), 6, rng, key);
    const cadence = new Harmonizer(this.key.transpose(after?.shift ?? 0), rng).approach();
    this.add('bridge', { bars: [...body, ...cadence], key });
  }

  private solos(): void {
    for (const type of ['solo', 'solo2'] as const) {
      if (!this.has(type)) continue;
      const rng = this.rng.fork(type);
      const bars = new Harmonizer(this.key, rng).solo(this.section(type)!.bars, STYLE.reharm);
      this.add(type, { bars, solo: Solo.improvise(bars, rng.fork('line')) });
    }
  }

  // Melodies for the sung sections, the chorus's answers, and the
  // sections that borrow the hook.
  private melodies(): void {
    const { m, key } = this;
    const rng = this.rng.fork('melody');
    for (const type of ['verse', 'pre', 'chorus', 'bridge', 'riff'] as MelodyKind[]) {
      const mat = m[type];
      if (!mat) continue;
      const style = mat.flavour && PRE_FLAVOURS[mat.flavour].melody;
      mat.melody = new MelodyWriter(mat.key, type, rng.fork(type), style).write(mat.bars!);
    }
    const chorus = m.chorus!;
    const hook = chorus.melody!;
    chorus.answer = hook.answer(chorus.bars!, key, rng.fork('answer'));
    if (m.breakdown) m.breakdown.melody = hook.take(m.breakdown.bars!.length);
    const intro = m.intro!;
    if (this.introHarmony === 'chorus') intro.melody = hook.take(4);
    // Planing chords leave the key, so only template intros get a new line.
    else if (this.introHarmony === 'template' && rng.chance(STYLE.introMelodyChance)) {
      intro.melody = new MelodyWriter(key, 'riff', rng.fork('intro')).write(intro.bars!);
    }
  }

  // The drum break hands over to whatever follows it.
  private drumBreak(): void {
    const i = this.form.findIndex((s) => s.type === 'drumBreak');
    if (i < 0) return;
    const next = this.form[i + 1];
    this.add('drumBreak', {
      pickupInto: this.m[next.type]!.bars![0][0],
      pickupFrom: next.type,
      pickupShift: next.shift,
    });
  }

  // Drums for every playing section, then bass that sits with them.
  private rhythm(): void {
    const drumRng = this.rng.fork('drums');
    const bassRng = this.rng.fork('bass');
    const intro = STYLE.introTextures[this.texture];
    for (const mat of Object.values(this.m)) {
      if (mat.type === 'finale') continue;
      const r = drumRng.fork(mat.type);
      const plan: DrumPlan =
        mat.type === 'intro' ? intro.drums : mat.flavour ? PRE_FLAVOURS[mat.flavour].drums : STYLE.drums[mat.type]!;
      const feel = r.pick(plan.feels);
      const crash = r.chance(plan.crash);
      const fill = r.chance(plan.fill);
      mat.drums = { ...new DrumWriter(feel, r).write(fill), crash, fill };
      if (!mat.bars) continue;
      const feels =
        mat.type === 'intro' ? intro.bass : mat.flavour ? PRE_FLAVOURS[mat.flavour].bass : STYLE.bassFeels[mat.type]!;
      const fits = STYLE.bassWith[feel];
      const matching = fits ? feels.filter((f) => fits.includes(f)) : feels;
      const bass = (bars: Bar[], key: Key, label: string) =>
        new BassWriter(matching.length ? matching : fits!, key, bassRng.fork(label), STYLE.approachChromatic).write(
          bars,
        );
      mat.bass = bass(mat.bars, mat.key, mat.type);
      // Each lift has its own changes.
      mat.lifts?.forEach((lift, i) => (lift.bass = bass(lift.bars, lift.key, `lift${i}`)));
    }
  }
}
