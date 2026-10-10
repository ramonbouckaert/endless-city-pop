// A song: seed + options -> form, harmony, melodies, bass and drums.
// Arranger (arranger.ts) turns one into a Strudel pattern.

import { BassWriter } from './bass';
import { FINALE_STYLES, LIFT_STYLES, PRE_FLAVOURS, STYLE, TONALITIES } from './constants';
import { DrumWriter } from './drums';
import { FormPlanner, Section } from './form';
import { Harmonizer, Template } from './harmony';
import { BAND, KITS, PICKS, SAME_SOUND, SOUND_LEVELS, VOICES } from './instruments';
import { MelodyWriter, Solo } from './melody';
import { Chord, Key } from './music';
import { Rng } from './random';
import { titleFor } from './title';
import type {
  Bar,
  DrumPlan,
  IntroHarmony,
  IntroTexture,
  Lift,
  LiftStyle,
  Material,
  Materials,
  MelodyKind,
  Mode,
  PreFlavour,
  SectionType,
  PickedPart,
  Sounds,
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
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'strudel');
    const rng = new Rng(s);
    const mode = rng.fork('mode').weighted(Object.entries(TONALITIES).map(([m, t]) => [m as Mode, t.weight] as const));
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
    const used = new Set<string>();
    const recording = (s: string) => SAME_SOUND[s] ?? s;
    const free = (s: string) => !used.has(recording(s));
    const take = (s: string) => {
      used.add(recording(s));
      return s;
    };
    const melody: string[] = [];
    for (const s of rng.shuffle(VOICES.pool)) if (melody.length < 2 + VOICES.soloists && free(s)) melody.push(take(s));
    const [lead, double, ...soloists] = melody;

    const pick = (part: PickedPart): string => {
      const options = PICKS[part].filter(free);
      return take(rng.pick(options.length ? options : PICKS[part]));
    };
    const pickVoice = (part: 'answer' | 'bell'): Voice => [pick(part), BAND[part][1]];

    return {
      ...BAND,
      keys: pick('keys'),
      guitar: pick('guitar'),
      pad: pick('pad'),
      strings: pick('strings'),
      choir: pick('choir'),
      answer: pickVoice('answer'),
      bell: pickVoice('bell'),
      stabs: pick('stabs'),
      hornDouble: pick('hornDouble'),
      bass: pick('bass'),
      lead: Song.voice(lead, 'lead'),
      double: Song.voice(double, 'double'),
      soloists: soloists.map((s) => Song.voice(s, 'soloists')),
    };
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

function buildMaterials(key: Key, form: Section[], rng: Rng): Materials {
  const { materials: harmony, chorusBars } = buildHarmony(key, form, rng);
  const { intro, outro, introHarmony, texture } = buildIntro(key, form, rng, chorusBars);
  const bridge = buildBridge(key, form, rng);
  const solos = buildSolos(key, form, rng);
  let m: Materials = { ...harmony, intro, ...(outro ? { outro } : {}), ...(bridge ? { bridge } : {}), ...solos };
  m = buildMelodies(key, rng, m, introHarmony);
  const drumBreakMat = buildDrumBreak(key, form, m);
  if (drumBreakMat) m = { ...m, drumBreak: drumBreakMat };
  return buildRhythm(rng, m, texture);
}

const has = (form: Section[], type: SectionType) => form.some((s) => s.type === type);
const section = (form: Section[], type: SectionType) => form.find((s) => s.type === type);
const tonality = (key: Key) => TONALITIES[key.mode];
const progress = (key: Key, template: string, bars: number, rng: Rng) =>
  new Harmonizer(key, rng).progression(template, bars, STYLE.reharm);

function buildHarmony(key: Key, form: Section[], rng: Rng): { materials: Partial<Materials>; chorusBars: Bar[] } {
  const { templates, finale } = tonality(key);
  const mk = (type: SectionType, mat: Partial<Material>): Material => ({ type, key, ...mat });
  const result: Partial<Materials> = {};

  result.verse = mk('verse', { bars: progress(key, rng.pick(templates.verse), 8, rng.fork('verse')) });

  const chorusRng = rng.fork('chorus');
  const chorusBars = progress(key, rng.pick(templates.chorus), 8, chorusRng);
  const chorusLen = section(form, 'chorus')?.bars ?? 8;
  if (chorusLen > 8) {
    const tag = new Template(rng.pick(templates.tag)).fit(chorusLen - 8);
    chorusBars.push(...new Harmonizer(key, chorusRng).realize(tag));
  }
  result.chorus = mk('chorus', { bars: chorusBars });

  const preMat = buildPre(key, form, rng);
  if (preMat) result.pre = preMat;
  for (const type of ['vamp', 'riff'] as const) {
    if (has(form, type)) result[type] = mk(type, { bars: progress(key, rng.pick(templates[type]), 4, rng.fork(type)) });
  }
  if (result.vamp) result.vamp = { ...result.vamp, entry: rng.fork('vampEntry').weighted(STYLE.vampEntry) };
  const breakdown = section(form, 'breakdown');
  if (breakdown) result.breakdown = mk('breakdown', { bars: chorusBars.slice(0, breakdown.bars) });
  const liftMat = buildLifts(key, form, rng);
  if (liftMat) result.lift = liftMat;
  const [symbol, scale] = rng.fork('finale').pick(finale);
  const ending = rng.fork('finaleStyle').weighted(FINALE_STYLES);
  result.finale = mk('finale', { bars: [[new Chord(key.tonic, symbol, scale)]], ending });
  return { materials: result, chorusBars };
}

function buildPre(key: Key, form: Section[], rng: Rng): Material | null {
  const sec = section(form, 'pre');
  if (!sec) return null;
  const preRng = rng.fork('pre');
  const flavour = preRng.weighted(
    Object.entries(PRE_FLAVOURS).map(([name, def]) => [name as PreFlavour, def.weight] as const),
  );
  const templates = tonality(key).pre[flavour];
  const fitting = templates.filter((t) => new Template(t).length === sec.bars);
  const template = preRng.pick(fitting.length ? fitting : templates);
  const bars = new Harmonizer(key, preRng).progression(template, sec.bars, STYLE.reharm, true);
  return { type: 'pre', key, bars, flavour };
}

function buildLifts(key: Key, form: Section[], rng: Rng): Material | null {
  const liftRng = rng.fork('lift');
  const styleRng = rng.fork('liftStyle');
  let style: LiftStyle | undefined;
  const lifts = form
    .filter((s) => s.type === 'lift')
    .map((s): Lift => {
      const liftKey = key.transpose(s.opts.liftTo!);
      const turnaround = s.opts.turnaround!;
      const bars = new Harmonizer(liftKey, liftRng).turnaround(turnaround);
      // Never the same style as the lift before.
      style = styleRng.weighted(LIFT_STYLES.filter(([name]) => name !== style));
      return { turnaround, key: liftKey, bars, style };
    });
  if (!lifts.length) return null;
  return { type: 'lift', key: lifts[0].key, bars: lifts[0].bars, lifts };
}

function buildIntro(
  key: Key,
  form: Section[],
  rng: Rng,
  chorusBars: Bar[],
): { intro: Material; outro: Material | undefined; introHarmony: IntroHarmony; texture: IntroTexture } {
  const introRng = rng.fork('intro');
  const introHarmony = introRng.weighted(STYLE.introHarmony);
  let bars: Bar[];
  if (introHarmony === 'chorus') bars = chorusBars.slice(0, 4);
  else if (introHarmony === 'planing') bars = new Harmonizer(key, introRng).planing();
  else bars = progress(key, introRng.pick(tonality(key).templates.intro), 4, introRng);
  const texture = introRng.pick(Object.keys(STYLE.introTextures) as IntroTexture[]);
  const intro: Material = { type: 'intro', key, bars, harmony: introHarmony, texture };
  const outro: Material | undefined = has(form, 'outro') ? { type: 'outro', key, bars } : undefined;
  return { intro, outro, introHarmony, texture };
}

function buildBridge(key: Key, form: Section[], rng: Rng): Material | null {
  if (!has(form, 'bridge')) return null;
  const bridgeRng = rng.fork('bridge');
  const bridgeKey = new Harmonizer(key, bridgeRng).bridgeKey(STYLE.adventurous);
  const after = form
    .slice(form.findIndex((s) => s.type === 'bridge') + 1)
    .find((s) => s.type !== 'drumBreak');
  const templates = TONALITIES[bridgeKey.mode].templates.bridge;
  if (!templates) throw new Error(`No bridge templates in ${bridgeKey.mode}`);
  const body = progress(bridgeKey, bridgeRng.pick(templates), 6, bridgeRng);
  const cadence = new Harmonizer(key.transpose(after?.shift ?? 0), bridgeRng).approach();
  return { type: 'bridge', key: bridgeKey, bars: [...body, ...cadence] };
}

function buildSolos(key: Key, form: Section[], rng: Rng): Partial<Materials> {
  const result: Partial<Materials> = {};
  for (const type of ['solo', 'solo2'] as const) {
    if (!has(form, type)) continue;
    const soloRng = rng.fork(type);
    const bars = new Harmonizer(key, soloRng).solo(section(form, type)!.bars, STYLE.reharm);
    result[type] = { type, key, bars, solo: Solo.improvise(bars, soloRng.fork('line')) };
  }
  return result;
}

function buildMelodies(key: Key, rng: Rng, m: Materials, introHarmony: IntroHarmony): Materials {
  const melRng = rng.fork('melody');
  let result: Materials = { ...m };
  for (const type of ['verse', 'pre', 'chorus', 'bridge', 'riff'] as MelodyKind[]) {
    const mat = result[type];
    if (!mat) continue;
    const style = mat.flavour && PRE_FLAVOURS[mat.flavour].melody;
    result[type] = { ...mat, melody: new MelodyWriter(mat.key, type, melRng.fork(type), style).write(mat.bars!) };
  }
  const hook = result.chorus!.melody!;
  result.chorus = { ...result.chorus!, answer: hook.answer(result.chorus!.bars!, key, melRng.fork('answer')) };
  if (result.breakdown) result.breakdown = { ...result.breakdown, melody: hook.take(result.breakdown.bars!.length) };
  const intro = result.intro!;
  if (introHarmony === 'chorus') {
    result.intro = { ...intro, melody: hook.take(4) };
  } else if (introHarmony === 'template' && melRng.chance(STYLE.introMelodyChance)) {
    result.intro = { ...intro, melody: new MelodyWriter(key, 'riff', melRng.fork('intro')).write(intro.bars!) };
  }
  return result;
}

function buildDrumBreak(key: Key, form: Section[], m: Materials): Material | null {
  const i = form.findIndex((s) => s.type === 'drumBreak');
  if (i < 0) return null;
  const next = form[i + 1];
  return {
    type: 'drumBreak',
    key,
    pickupInto: m[next.type]!.bars![0][0],
    pickupFrom: next.type,
    pickupShift: next.shift,
  };
}

function buildRhythm(rng: Rng, m: Materials, texture: IntroTexture): Materials {
  const drumRng = rng.fork('drums');
  const bassRng = rng.fork('bass');
  const intro = STYLE.introTextures[texture];
  const result: Materials = {};
  for (const mat of Object.values(m)) {
    if (mat.type === 'finale') {
      result[mat.type] = mat;
      continue;
    }
    const r = drumRng.fork(mat.type);
    let plan: DrumPlan;
    let feels;
    if (mat.type === 'intro') {
      plan = intro.drums;
      feels = intro.bass;
    } else if (mat.flavour) {
      plan = PRE_FLAVOURS[mat.flavour].drums;
      feels = PRE_FLAVOURS[mat.flavour].bass;
    } else {
      plan = STYLE.drums[mat.type]!;
      feels = STYLE.bassFeels[mat.type]!;
    }
    const feel = r.pick(plan.feels);
    const crash = r.chance(plan.crash);
    const fill = r.chance(plan.fill);
    const drums = { ...new DrumWriter(feel, r).write(fill), crash, fill };
    if (!mat.bars) {
      result[mat.type] = { ...mat, drums };
      continue;
    }
    const fits = STYLE.bassWith[feel];
    const matching = fits ? feels.filter((f) => fits.includes(f)) : feels;
    const makeBass = (bars: Bar[], bassKey: Key, label: string) =>
      new BassWriter(matching.length ? matching : fits!, bassKey, bassRng.fork(label), STYLE.approachChromatic).write(
        bars,
      );
    const bass = makeBass(mat.bars, mat.key, mat.type);
    const lifts = mat.lifts?.map((lift, i) => ({ ...lift, bass: makeBass(lift.bars, lift.key, `lift${i}`) }));
    result[mat.type] = { ...mat, drums, bass, ...(lifts ? { lifts } : {}) };
  }
  return result;
}
