// What a section works with. Its `write` writes its part's material
// from a WriteContext (the song's key and form, other parts' material,
// the harmony several parts share: the chorus's chords and its hook, the
// vamp's, the intro's); its `play` turns it into notes from a
// ScoreContext (the band, and the parts most recipes share).
// Sections the band plays through are played from a PlayedScoreContext:
// their chords, bass, lines and the figures built on them.

import { lazy } from '../../lib/lazy';
import type { Rng } from '../../lib/random';
import {
  INTRO,
  RISER,
  tonalityOf,
  type DrumRole,
  type GroovePlan,
  type IntroHarmony,
  type MelodyKind,
  type PlayedType,
  type PreMelody,
  type SectionType,
  type Tonality,
} from '../../style';
import { Template, type Bar, type Key } from '../../theory';
import type { ScoreBand } from '../band';
import { drumNotes } from '../drums';
import { DOUBLE_TOP, FIGURES, lastBar, type Rhythm, RHYTHMS, spans, timed, type Timed } from '../figures';
import type { Form } from '../form';
import { GrooveWriter } from '../groove';
import { Harmonizer } from '../harmony';
import { MelodyWriter, type Melody, type Solo } from '../melody';
import { Changes, onChord, Part, rise, scoreNote, within, type NoteSpec } from '../score';
import type { PlayedMaterial } from '../material';
import type { Section } from './section';

/** A section's drums, and its pitched parts (falsy ones left out). */
export type Parts = { drums: Part[]; pitched: (Part | null | false | undefined)[] };

/** The context a section type's recipe gets. */
// (Of a section of any type, a plain ScoreContext.)
export type ScoreContextOf<T extends SectionType> = [T] extends [PlayedType]
  ? PlayedScoreContext<T & PlayedType>
  : ScoreContext<T>;

// ---- Writing

export class WriteContext {
  // The section that wrote each part's material, by part id.
  private readonly writers = new Map<string, Section>();
  // For the harmony and lines several parts share, each written once on first use.
  private readonly shared: Rng;

  constructor(
    readonly key: Key,
    readonly form: Form,
    private readonly rng: Rng,
  ) {
    this.shared = rng.fork('shared');
  }

  /** A section, its part's material written (or shared) on first use. */
  written<S extends Section>(sec: S): S {
    const writer = this.writers.get(sec.part);
    if (writer) {
      if (writer !== sec) sec.share(writer);
    } else {
      sec.write(this, this.rng.fork(`part/${sec.part}`));
      this.writers.set(sec.part, sec);
    }
    return sec;
  }

  /** The song's key's tonality. */
  get tonality(): Tonality {
    return tonalityOf(this.key.mode);
  }

  /** A template's progression, `bars` long, in a key (the song's unless given). */
  progress(template: string, bars: number, rng: Rng, key = this.key): Bar[] {
    return new Harmonizer(key, rng).progression(template, bars);
  }

  /** Four bars of one of the key's vamp or riff templates. */
  loop(kind: 'vamp' | 'riff', rng: Rng): Bar[] {
    return this.progress(rng.pick(this.tonality.templatesFor(kind)), 4, rng.fork('harmony'));
  }

  melody(kind: MelodyKind, key: Key, bars: Bar[], rng: Rng, style?: PreMelody): Melody {
    return new MelodyWriter(key, kind, rng, style).write(bars);
  }

  /** A section's chords in a key, with drums and a bass line to play them. */
  band<T extends PlayedType>(type: T, key: Key, bars: Bar[], plan: GroovePlan, rng: Rng) {
    return { type, key, bars, ...new GrooveWriter(plan, key, rng).write(bars) };
  }

  /** The chorus's chords (the intro's and breakdown's too): eight bars, and a tag if the chorus runs longer. */
  readonly chorusBars = lazy((): Bar[] => {
    const rng = this.shared.fork('chorusHarmony');
    const bars = this.progress(rng.pick(this.tonality.templatesFor('chorus')), 8, rng.fork('harmony'));
    const len = this.form.first('chorus')?.bars ?? 8;
    if (len <= 8) return bars;
    const tag = new Template(rng.pick(this.tonality.templatesFor('tag'))).fit(len - 8);
    return [...bars, ...new Harmonizer(this.key, rng.fork('tag')).realize(tag)];
  });

  /** The chorus's melody (the intro's teaser and the breakdown's line too). */
  readonly hook = lazy(() => this.melody('chorus', this.key, this.chorusBars(), this.shared.fork('hook')));

  /** The vamp's chords (a trading outro's too). */
  readonly vampBars = lazy(() => this.loop('vamp', this.shared.fork('vampHarmony')));

  /** The intro's chords (a reprise's too): the chorus's, planing chords, or a template of its own. */
  readonly introBars = lazy((): { harmony: IntroHarmony; bars: Bar[] } => {
    const rng = this.shared.fork('introHarmony');
    const harmony = rng.weighted(INTRO.harmony);
    if (harmony === 'chorus') return { harmony, bars: this.chorusBars().slice(0, 4) };
    if (harmony === 'planing') return { harmony, bars: new Harmonizer(this.key, rng.fork('planing')).planing() };
    return { harmony, bars: this.progress(rng.pick(this.tonality.templatesFor('intro')), 4, rng.fork('harmony')) };
  });
}

// ---- Playing

export class ScoreContext<T extends SectionType = SectionType> {
  constructor(
    readonly sec: Section<T>,
    readonly band: ScoreBand,
    readonly repeat: number, // earlier sections of this part
  ) {}

  get len(): number {
    return this.sec.bars;
  }

  /** Keeps notes from bar `start` on. */
  from(start: number): (time: number) => boolean {
    return (time) => time >= start;
  }

  /** A reverse cymbal swelling through the last bar into the next section. */
  get riser(): Part {
    return new Part([scoreNote({ time: this.len - 1, dur: 1, program: RISER, note: 60, gain: 0.35 })]);
  }

  /** Two bass notes leading into the next section, each at the pitch `pitch` gives its degree. */
  pickup(pitch: (degree: number) => number): Part {
    const { len } = this;
    const notes = timed(lastBar(len, FIGURES.pickup), len).map(({ time, dur, value }) => ({
      time,
      dur,
      note: pitch(value),
    }));
    return this.band.bass(notes);
  }
}

export class PlayedScoreContext<T extends PlayedType = PlayedType> extends ScoreContext<T> {
  // The section's material, as every played section has it.
  private get played(): PlayedMaterial {
    return this.sec.material;
  }

  // The section's chords, and the band's bass line over them, each built
  // on first use (so the band notes the bass only if it plays).
  private readonly changes = lazy(() => Changes.of(this.played.bars, this.len));
  private readonly bassLine = lazy(() =>
    this.band.bass(
      this.played.bass.notes(this.len, (n, time) => onChord(this.C.at(time), n.degree.step, n.degree.alter)),
    ),
  );

  /** The section's chords. */
  get C(): Changes {
    return this.changes();
  }
  /** The bass line. */
  get B(): Part {
    return this.bassLine();
  }

  /** The section's key. */
  get key(): Key {
    return this.played.key;
  }

  /** A melody in this section's key (counting up from its tonic in octave 4), optionally shifted up. */
  line(melody: Melody, up = 0): NoteSpec[] {
    const base = 60 + this.key.tonic + up;
    return melody.notes(this.len, (n) => base + n.semis);
  }

  /** A melody with a second voice `below` scale steps under each note: diatonic harmony. */
  harmonized(melody: Melody, below: number): NoteSpec[] {
    const { key } = this;
    const base = 60 + key.tonic;
    const lower = (semis: number) => {
      const { step, alter } = key.scale.degree(semis, key.usesFlats);
      return key.scale.semis(step - below) + alter;
    };
    return [...melody.notes(this.len, (n) => base + n.semis), ...melody.notes(this.len, (n) => base + lower(n.semis))];
  }

  /** A figure of chord-scale degrees against the section's chords (from each one's bass root), shifted up. */
  onChords(hits: readonly Timed<number>[], up: number): NoteSpec[] {
    return hits.map(({ time, dur, value }) => ({ time, dur, note: onChord(this.C.at(time), value) + up }));
  }

  // 12 to play a melody an octave up, or 0 if that would take it too high
  // (melody notes count up from the tonic in octave 4).
  octaveUp(melody: Melody): number {
    return 60 + this.key.tonic + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
  }

  /** The intro's line on bells, if it has one: an octave up, if it fits. */
  teaser(melody: Melody | undefined): Part | undefined {
    return melody && this.band.bell(this.line(melody, this.octaveUp(melody)));
  }

  /** The section's drums; `enter` may hold a part back, by role. */
  drums(enter?: (role: DrumRole) => ((time: number) => boolean) | undefined): Part[] {
    return [drumNotes(this.band, this.played.drums, this.len, this.repeat, enter)];
  }

  /** Stop-time: the band and drums hit together, then drive the last bar. */
  stopTime(drums: Part[]): Parts & { pitched: Part[] } {
    const { band, len, C, B } = this;
    const hits = (last: Rhythm) => spans(lastBar(len, last, RHYTHMS.stops), len);
    return {
      drums: [Part.stack(...drums).mask(within(hits(RHYTHMS.whole)))],
      pitched: [
        B.struct(hits(RHYTHMS.eighths)),
        band.keys(C, hits(RHYTHMS.offbeats)).clip(0.3),
        band.stabs(C, hits([[]])),
      ],
    };
  }

  /** Strings swelling through the section, up to `top`. */
  swell(top: number): Part {
    return this.band.strings(this.C).gain(rise(0.04, top, this.len));
  }

  /** A solo against the section's chords. */
  soloLine(solo: Solo): NoteSpec[] {
    return solo.play(this.C, this.len);
  }
}
