// A song: seed -> mode and key, tempo, form (its sections each with its
// part's material), the sounds that play it, and a title. ScoreArranger
// turns one into timed notes.

import { Rng } from '../lib/random';
import { SONG, TONALITIES } from '../style';
import { Key } from '../theory';
import type { Form } from './form';
import { FormPlanner } from './form-planner';
import { Instruments } from './orchestration';
import {
  Bridge,
  buildForm,
  Chorus,
  Finale,
  Intro,
  Lift,
  PreChorus,
  SoloSection,
  Verse,
  type SectionKind,
} from './sections';
import { formatTitle, TitleWriter, type TitleParts } from './title';

export interface SongData {
  seed: string;
  titleParts: TitleParts;
  key: Key;
  bpm: number;
  swing: number;
  instruments: Instruments;
  /** Its sections, each with its part's material. */
  form: Form;
}

// A song has its data's fields (merged in from this interface), and the
// views below on them.
export interface Song extends Readonly<SongData> {}

export class Song {
  constructor(data: SongData) {
    Object.assign(this, data);
  }

  /** A song from a seed, which picks everything else: mode, key, tempo, form and sounds. */
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'demo');
    const rng = new Rng(s);
    const mode = rng.fork('mode').weightedKey(TONALITIES);
    const tonality = TONALITIES[mode];
    const key = new Key(rng.pick(tonality.tonics), mode);
    const plan = new FormPlanner(rng.fork('form'), tonality.turnarounds).plan();
    const form = buildForm(plan, key, rng.fork('materials'));
    return new Song({
      seed: s,
      key,
      bpm: rng.int(...SONG.tempo),
      swing: Math.round(rng.range(SONG.swing) * 100) / 100,
      form,
      instruments: Instruments.pick(rng.fork('instruments')),
      titleParts: new TitleWriter(rng.fork('title')).write(),
    });
  }

  /** The title on one line: "真夜中のドライブ (Midnight Drive)". */
  get title(): string {
    return formatTitle(this.titleParts);
  }

  get bars(): number {
    return this.form.bars;
  }

  /** The soloists the form's solos go to, in order, as indexes into the sounds' soloists. */
  get soloists(): number[] {
    return this.form.ofType(SoloSection).map((s) => s.soloist);
  }

  /** The material of each part of a kind, in form order. */
  parts<K extends SectionKind>(kind: K): InstanceType<K>['material'][] {
    return [...new Map(this.form.ofType(kind).map((sec) => [sec.part, sec.material])).values()];
  }

  /** The first part of a kind's material, if the form has one. */
  part<K extends SectionKind>(kind: K): InstanceType<K>['material'] | undefined {
    return this.parts(kind)[0];
  }

  /** An outline, for debugging and scripts/generate.ts. */
  describe() {
    const intro = this.part(Intro);
    return {
      key: this.key.name,
      bpm: this.bpm,
      bars: this.bars,
      sections: this.form.describe(),
      intro: `${intro?.harmony} ${intro?.variant}`,
      pre: this.part(PreChorus)?.variant,
      solos: this.parts(SoloSection).map((s) => s.variant),
      lifts: this.parts(Lift).map((l) => l.variant),
      finale: this.part(Finale)?.variant,
      phrases: Object.fromEntries(
        [Verse, Chorus, Bridge].flatMap((kind) => {
          const form = this.part(kind)?.melody.form;
          return form ? [[kind.id, form]] : [];
        }),
      ),
    };
  }
}
