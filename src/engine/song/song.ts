// A song: seed -> mode and key, tempo, form (its sections each with its
// part's material), the sounds that play it, and a title. ScoreArranger
// turns one into timed notes.

import { lerp } from '../../lib/math';
import { Rng } from '../../lib/random';
import { Timeline } from '../../lib/timeline';
import {
  BALLAD,
  balladChance,
  balladLean,
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
  Outro,
  PreChorus,
  SoloSection,
  Verse,
  type AnySection,
  type Form,
  type SectionKind,
  type Traits,
} from '../sections';
import { FormPlanner } from './form-planner';
import { Instruments, type PartPath } from './orchestration';
import { formatTitle, TitleWriter, type TitleParts } from './title';

export interface SongData {
  seed: string;
  titleParts: TitleParts;
  key: Key;
  /** What it does throughout: how lush its chords are, ... (Traits). */
  traits: Traits;
  bpm: number;
  /** How late an off-beat lands, in its own unit: a sixteenth (in eighths' swing, an eighth). */
  swing: number;
  /** What swings: the second sixteenth of each eighth (16), or (a ballad's) the second eighth of each beat (8). */
  swingUnit: 8 | 16;
  /** Whether only some parts swing (SONG.swingOnly.parts), the rest playing straight. */
  swingOnly: boolean;
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
    this.timeline = new Timeline(data.form.tempos(data.bpm, data.traits.ritard));
  }

  /** A song from a seed, which picks everything else: mode, key, tempo, form and sounds. */
  static generate(seed?: string | number): Song {
    const s = String(seed ?? 'demo');
    const rng = new Rng(s);
    const tonality = rng.fork('mode').pick(Object.values(TONALITIES));
    const key = new Key(rng.pick(tonality.tonics), tonality.mode);
    const bpm = Math.round(rng.range(rng.weighted(SONG.tempo)));
    // How far its tempo leans it towards a ballad (BALLAD): eighths' swing is likelier the further.
    const ballad = balladLean(bpm);
    const eighths = rng.fork('swingUnit').chance(balladChance(ballad));
    const swingOnly = !eighths && rng.fork('swingOnly').chance(SONG.swingOnly.chance);
    const traits = Song.traits(rng.fork('traits'), ballad);
    const plan = new FormPlanner(rng.fork('form'), tonality.turnarounds, bpm, ballad).plan();
    const form = buildForm(plan, key, bpm, rng.fork('materials'), traits);
    return new Song({
      seed: s,
      key,
      traits,
      bpm,
      swing: Math.round(rng.range(eighths ? BALLAD.swing : SONG.swing) * 100) / 100,
      swingUnit: eighths ? 8 : 16,
      swingOnly,
      voicings: Song.voicings(tonality.voicings ?? SONG.voicings, rng.fork('voicings')),
      form,
      instruments: Instruments.pick(rng.fork('instruments'), ballad),
      titleParts: new TitleWriter(rng.fork('title')).write(),
    });
  }

  // What a song does throughout, rolled from the style's odds: the
  // further it leans towards a ballad (`ballad`, 0 to 1), the likelier it
  // pairs its chords and eases back each phrase (and the further back),
  // and the less likely its kick follows its bass.
  private static traits(rng: Rng, ballad: number): Traits {
    const colour = rng.fork('colour').weightedKey(SONG.colour);
    const paired = rng.fork('paired').chance(BALLAD.paired * ballad);
    const eases = ballad >= BALLAD.ritardFrom && rng.fork('ritard').chance(balladChance(ballad));
    const ritard = eases ? lerp(1, BALLAD.ritard, ballad) : undefined;
    const lock = rng.chance(SONG.lock * (1 - ballad));
    const riff = lock && rng.chance(SONG.riff) ? rng.pick(BASS_RIFFS) : undefined;
    const ostinato = rng.chance(SONG.ostinato)
      ? rng.pick(Object.keys(GUITAR_OSTINATOS) as GuitarOstinato[])
      : undefined;
    return {
      colour,
      lock,
      ...(riff ? { riff } : {}),
      ...(ostinato ? { ostinato } : {}),
      ...(paired ? { paired } : {}),
      ...(ritard ? { ritard } : {}),
    };
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

  /** Its rounds of verse and chorus, and what comes between them (a returning vamp, a pickup). */
  get rounds(): AnySection[] {
    const { sections } = this.form;
    const first = sections.findIndex((s) => s.round !== undefined);
    const last = sections.findLastIndex((s) => s.round !== undefined);
    return sections.slice(first, last + 1);
  }

  /** Whether its last round, and only that one, plays its chorus twice (a tune plays every round's twice). */
  get chorusTwice(): boolean {
    const rounds = this.form.ofType(Chorus).flatMap((c) => (c.round === undefined ? [] : [c.round]));
    const twice = (r: number) => rounds.indexOf(r) !== rounds.lastIndexOf(r);
    const last = Math.max(...rounds);
    return rounds.length > 0 && rounds.every((r) => twice(r) === (r === last));
  }

  /** The last section it plays before its ending's outro and finale (if any). */
  get lastPlayed(): AnySection | undefined {
    return this.form.sections.findLast((s) => !(s instanceof Finale) && !(s instanceof Outro));
  }

  /** Whether the part at `path` swings: every part does, but in a song that swings only some (`swingOnly`). */
  swings(path: PartPath): boolean {
    // (A soloist's path names its part first: `soloists.1`.)
    const parts: ReadonlySet<string> = SONG.swingOnly.parts;
    return !this.swingOnly || parts.has(path.split('.')[0]);
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
        this.traits.paired && 'two chords a bar',
        this.traits.ritard && `easing back to ${this.traits.ritard.toFixed(2)}`,
        this.swingOnly && `only ${[...SONG.swingOnly.parts].join(', ')} swung`,
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
