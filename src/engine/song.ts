// A song: seed + options -> form, harmony, melodies, bass and drums.
// Arranger (arranger.ts) turns one into a Strudel pattern.

import { BassWriter } from './bass';
import { KITS, PRE_FLAVOURS, STYLE, TITLE_WORDS } from './constants';
import { DrumWriter } from './drums';
import { FormPlanner, Section } from './form';
import { Harmonizer, Template } from './harmony';
import { MelodyWriter, Solo } from './melody';
import { Chord, Key } from './music';
import { Rng } from './random';
import type {
  Bar,
  DrumPlan,
  IntroHarmony,
  IntroTexture,
  Lift,
  Material,
  Materials,
  MelodyKind,
  PreFlavour,
  SectionType,
  SongOptions,
} from './types';

export class Song {
  constructor(
    readonly seed: string,
    readonly title: string,
    readonly key: Key,
    readonly bpm: number,
    readonly swing: number,
    readonly kit: string | null,
    readonly form: Section[],
    readonly materials: Materials,
  ) {}

  /** A song from a seed (and optionally a tonic and tempo). */
  static generate(options: SongOptions = {}): Song {
    const seed = String(options.seed ?? 'strudel');
    const rng = new Rng(seed);
    const key = new Key(options.key ?? rng.pick(STYLE.tonics));
    const bpm = options.bpm ?? rng.int(...STYLE.tempo);
    const swing = Math.round(rng.range(STYLE.swing) * 100) / 100;
    const form = new FormPlanner(rng.fork('form')).plan();
    const materials = new SongBuilder(key, form, rng.fork('materials')).build();
    return new Song(seed, Song.titleFor(seed), key, bpm, swing, rng.fork('kit').weighted(KITS), form, materials);
  }

  private static titleFor(seed: string): string {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const [a, b] = TITLE_WORDS;
    return `${a[h % a.length]} ${b[(h >>> 8) % b.length]}`;
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
    const { templates } = STYLE;
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
    const breakdown = this.section('breakdown');
    if (breakdown) this.add('breakdown', { bars: this.chorusBars.slice(0, breakdown.bars) });
    this.lifts();
    this.add('finale', { bars: [[new Chord(key.tonic, '^9', 'lydian')]] });
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
    const { templates } = PRE_FLAVOURS[flavour];
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
          : this.progression('intro', rng.pick(STYLE.templates.intro), 4, rng);
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
    const body = this.progression('bridge', rng.pick(STYLE.templates.bridge), 6, rng, key);
    const cadence = new Harmonizer(this.key.transpose(after?.shift ?? 0), rng).approach();
    this.add('bridge', { bars: [...body, ...cadence], key });
  }

  private solos(): void {
    for (const type of ['solo', 'solo2'] as const) {
      if (!this.has(type)) continue;
      const rng = this.rng.fork(type);
      const bars = new Harmonizer(this.key, rng).soloCycle(8);
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
