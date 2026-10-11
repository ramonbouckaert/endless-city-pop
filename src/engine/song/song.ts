// A song: seed -> mode and key, tempo, form (its sections each with its
// part's material), the sounds that play it, and a title. ScoreArranger
// turns one into timed notes.

import { Rng } from '../../lib/random';
import { Timeline } from '../../lib/timeline';
import {
  BASS_RIFFS,
  GUITAR_OSTINATOS,
  SONG,
  TONALITIES,
  type GuitarOstinato,
  type VoicingOdds,
  type Voicings,
} from '../../style';
import { Key } from '../../theory';
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
  type Form,
  type SectionKind,
  type Traits,
} from '../sections';
import { FormPlanner } from './form-planner';
import { Instruments } from './orchestration';
import { formatTitle, TitleWriter, type TitleParts } from './title';

export interface SongData {
  seed: string;
  titleParts: TitleParts;
  key: Key;
  /** What it does throughout: how lush its chords are, ... (Traits). */
  traits: Traits;
  bpm: number;
  swing: number;
  voicings: Voicings;
  instruments: Instruments;
  /** Its sections, each with its part's material. */
  form: Form;
}

// A song has its data's fields (merged in from this interface), and the
// views below on them.
export interface Song extends Readonly<SongData> {}

export class Song {
  /** Its bars and tempo: where a time in bars falls, in quarter notes and seconds. */
  readonly timeline: Timeline;

  constructor(data: SongData) {
    Object.assign(this, data);
    this.timeline = new Timeline(data.form.tempos(data.bpm));
  }

  /** A song from a seed, which picks everything else: mode, key, tempo, form and sounds. */
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'demo');
    const rng = new Rng(s);
    const tonality = rng.fork('mode').pick(Object.values(TONALITIES));
    const key = new Key(rng.pick(tonality.tonics), tonality.mode);
    const bpm = rng.int(...SONG.tempo);
    const traits = Song.traits(rng.fork('traits'));
    const plan = new FormPlanner(rng.fork('form'), tonality.turnarounds, bpm).plan();
    const form = buildForm(plan, key, bpm, rng.fork('materials'), traits);
    return new Song({
      seed: s,
      key,
      traits,
      bpm,
      swing: Math.round(rng.range(SONG.swing) * 100) / 100,
      voicings: Song.voicings(tonality.voicings ?? SONG.voicings, rng.fork('voicings')),
      form,
      instruments: Instruments.pick(rng.fork('instruments')),
      titleParts: new TitleWriter(rng.fork('title')).write(),
    });
  }

  // What a song does throughout, rolled from the style's odds.
  private static traits(rng: Rng): Traits {
    const colour = rng.fork('colour').weightedKey(SONG.colour);
    const lock = rng.chance(SONG.lock);
    const riff = lock && rng.chance(SONG.riff) ? rng.pick(BASS_RIFFS) : undefined;
    const ostinato = rng.chance(SONG.ostinato)
      ? rng.pick(Object.keys(GUITAR_OSTINATOS) as GuitarOstinato[])
      : undefined;
    return { colour, lock, ...(riff ? { riff } : {}), ...(ostinato ? { ostinato } : {}) };
  }

  // How a song voices its chords, picked from some odds.
  private static voicings(odds: VoicingOdds, rng: Rng): Voicings {
    return { comp: rng.weightedKey(odds.comp), sustain: rng.weightedKey(odds.sustain) };
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
      traits: [
        this.traits.colour,
        this.traits.lock && 'kick on the bass',
        this.traits.riff && `riff ${this.traits.riff}`,
        this.traits.ostinato && `${this.traits.ostinato} guitar`,
      ]
        .filter(Boolean)
        .join(', '),
      bpm: this.bpm,
      bars: this.bars,
      voicings: `${this.voicings.comp}/${this.voicings.sustain}`,
      sections: this.form.describe(),
      intro: `${intro?.harmony} ${intro?.variant}`,
      pre: this.part(PreChorus)?.variant,
      answers: this.part(Chorus)?.variant,
      solos: this.parts(SoloSection).map((s) => `${s.variant} over ${s.over}`),
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
