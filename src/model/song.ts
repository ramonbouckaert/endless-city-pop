// A song: seed -> mode and key, tempo, form, each part's material, the
// sounds that play it, and a title. render/ turns one into a Strudel pattern.

import { Rng } from '../lib/random';
import { SONG, TONALITIES, type SectionType } from '../style';
import { Key } from '../theory';
import { FormPlanner } from './form';
import { materialOf, type Material, type MaterialOf } from './material';
import { writeMaterials } from './materials';
import { pickInstruments, type Instruments } from './orchestration';
import type { Section } from './section';
import { formatTitle, writeTitle, type TitleParts } from './title';

export class Song {
  constructor(
    readonly seed: string,
    readonly titleParts: TitleParts,
    readonly key: Key,
    readonly bpm: number,
    readonly swing: number,
    readonly instruments: Instruments,
    readonly form: readonly Section[],
    readonly materials: Readonly<Record<string, Material>>,
  ) {}

  /** A song from a seed, which picks everything else: mode, key, tempo, form and sounds. */
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'strudel');
    const rng = new Rng(s);
    const mode = rng.fork('mode').weightedKey(TONALITIES);
    const tonality = TONALITIES[mode];
    const key = new Key(rng.pick(tonality.tonics), mode);
    const bpm = rng.int(...SONG.tempo);
    const swing = Math.round(rng.range(SONG.swing) * 100) / 100;
    const form = new FormPlanner(rng.fork('form'), tonality.turnarounds).plan();
    const materials = writeMaterials(key, form, rng.fork('materials'));
    const instruments = pickInstruments(rng.fork('instruments'));
    return new Song(s, writeTitle(rng.fork('title')), key, bpm, swing, instruments, form, materials);
  }

  /** The title on one line: "真夜中のドライブ (Midnight Drive)". */
  get title(): string {
    return formatTitle(this.titleParts);
  }

  get bars(): number {
    return this.form.reduce((n, s) => n + s.bars, 0);
  }

  /** The soloists the form's solos go to, in order, as indexes into the sounds' soloists. */
  get soloists(): number[] {
    return this.form.flatMap((s) => (s.opts.soloist === undefined ? [] : [s.opts.soloist]));
  }

  /** The material a section plays. */
  material(sec: Section): Material {
    const mat = this.materials[sec.part];
    if (!mat) throw new Error(`No material for ${sec.part}`);
    return mat;
  }

  /** The material of each part of a type, in form order. */
  parts<T extends SectionType>(type: T): MaterialOf<T>[] {
    const ids = [...new Set(this.form.filter((s) => s.type === type).map((s) => s.part))];
    return ids.map((id) => materialOf(type, this.materials[id]));
  }

  /** The first part of a type's material, if the form has one. */
  part<T extends SectionType>(type: T): MaterialOf<T> | undefined {
    return this.parts(type)[0];
  }

  /** An outline, for debugging and scripts/generate.ts. */
  describe() {
    return {
      key: this.key.name,
      bpm: this.bpm,
      bars: this.bars,
      sections: this.form.map((s) => s.describe()),
      intro: `${this.part('intro')?.harmony} ${this.part('intro')?.texture}`,
      pre: this.part('pre')?.flavour,
      finale: this.part('finale')?.ending,
      lifts: this.parts('lift').map((l) => l.style),
      phrases: Object.fromEntries(
        (['verse', 'chorus', 'bridge'] as const).flatMap((t) => {
          const form = this.part(t)?.melody.form;
          return form ? [[t, form]] : [];
        }),
      ),
    };
  }
}
