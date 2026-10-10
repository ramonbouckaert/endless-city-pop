// A song as timed notes: every note each part plays, with the controls
// that shape its sound. Times and lengths are in bars, from the start of
// the song in a Score and of the section in a Part.

import type { Program } from '../lib/general-midi';
import type { PartPath } from './orchestration';
import type { Bar, Chord } from '../theory';

/** Effects on a note, as MIDI carries them: pan, reverb (room) and the filter (lpf). */
export interface Controls {
  readonly room?: number;
  readonly pan?: number;
  readonly lpf?: number;
}

/** A note that starts `semis` off its pitch (negative: below) and slides onto it over `seconds`. */
export interface Slide {
  readonly semis: number;
  readonly seconds: number;
}

export interface ScoreNote {
  readonly time: number;
  readonly dur: number;
  /** The part of the band that plays it (none: the riser, an effect). */
  readonly path?: PartPath;
  /** The General MIDI instrument that plays it, or the song's drum kit. */
  readonly program: Program | 'drums';
  /** Its MIDI note: a pitch, or on the drum kit, a percussion key. */
  readonly note: number;
  readonly gain: number;
  readonly velocity: number;
  /** The sound's trim (Instruments.trim), or a recipe's own. */
  readonly postgain: number;
  /** The share of its length a note sounds for. */
  readonly clip: number;
  readonly slide?: Slide;
  readonly controls: Controls;
}

/** A note at full velocity, untrimmed, sounding its whole length, with no effects, unless given. */
export const scoreNote = (
  n: Pick<ScoreNote, 'time' | 'dur' | 'program' | 'note' | 'gain'> & Partial<ScoreNote>,
): ScoreNote => ({ velocity: 1, postgain: 1, clip: 1, controls: {}, ...n });

/** A value, or one that changes through a section: given a note's time in bars from the section's start. */
type Ramp = number | ((time: number) => number);

const valueAt = (ramp: Ramp, time: number): number => (typeof ramp === 'number' ? ramp : ramp(time));

/** A ramp from `from` to `to` over `bars` bars. */
export const rise =
  (from: number, to: number, bars: number) =>
  (time: number): number =>
    from + ((to - from) * time) / bars;

/** A span of time a note may fall in: from `time`, `dur` long. */
export interface Span {
  readonly time: number;
  readonly dur: number;
}

/** A pitched note to play, in bars from the section's start. */
export interface NoteSpec extends Span {
  readonly note: number;
  readonly slide?: Slide;
}

/** Whether a time falls in any of some spans. */
export const within = (spans: readonly Span[]) => (time: number) =>
  spans.some((s) => time >= s.time && time < s.time + s.dur);

/** Some notes of a section, and what can be done to them. Each change gives a new Part. */
export class Part {
  constructor(readonly notes: readonly ScoreNote[]) {}

  /** Parts played together (falsy ones left out). */
  static stack(...parts: readonly (Part | null | false | undefined)[]): Part {
    return new Part(parts.flatMap((p) => (p ? p.notes : [])));
  }

  map(f: (n: ScoreNote) => ScoreNote): Part {
    return new Part(this.notes.map(f));
  }

  /** The notes that start where `keep` says. */
  mask(keep: (time: number) => boolean): Part {
    return new Part(this.notes.filter((n) => keep(n.time)));
  }

  /** The notes sounding at each of `spans`' starts, played on them instead. */
  struct(spans: readonly Span[]): Part {
    return new Part(
      spans.flatMap((s) =>
        this.notes.filter((n) => n.time <= s.time && s.time < n.time + n.dur).map((n) => ({ ...n, ...s })),
      ),
    );
  }

  gain(ramp: Ramp): Part {
    return this.map((n) => ({ ...n, gain: valueAt(ramp, n.time) }));
  }

  postgain(value: number): Part {
    return this.map((n) => ({ ...n, postgain: value }));
  }

  velocity(ramp: Ramp): Part {
    return this.map((n) => ({ ...n, velocity: valueAt(ramp, n.time) }));
  }

  clip(value: number): Part {
    return this.map((n) => ({ ...n, clip: value }));
  }

  /** Pitched notes moved by semitones (drums stay as they are). */
  transpose(semis: number): Part {
    if (!semis) return this;
    return this.map((n) => (n.program === 'drums' ? n : { ...n, note: n.note + semis }));
  }

  /** Every note `bars` later. */
  late(bars: number): Part {
    return this.map((n) => ({ ...n, time: n.time + bars }));
  }

  room(value: number): Part {
    return this.control({ room: value });
  }

  pan(value: number): Part {
    return this.control({ pan: value });
  }

  lpf(ramp: Ramp): Part {
    return this.map((n) => ({ ...n, controls: { ...n.controls, lpf: valueAt(ramp, n.time) } }));
  }

  private control(controls: Controls): Part {
    return this.map((n) => ({ ...n, controls: { ...n.controls, ...controls } }));
  }
}

/** A chord sounding over a span. */
interface ChordSpan extends Span {
  readonly chord: Chord;
}

/** A pitch a chord-scale degree up from a chord's bass root. */
export const onChord = (chord: Chord, degree: number, alter = 0): number =>
  chord.bassMidi + chord.chordScale.semis(degree) + alter;

/** A section's chords over time: what plays when. */
export class Changes {
  constructor(
    readonly spans: readonly ChordSpan[],
    readonly bars: number,
  ) {}

  /** `bars` bars of a material's chords, looping them; two in a bar share it. */
  static of(material: readonly Bar[], bars: number): Changes {
    const spans = Array.from({ length: bars }, (_, b) => {
      const bar = material[b % material.length];
      return bar.map((chord, i) => ({ time: b + i / bar.length, dur: 1 / bar.length, chord }));
    }).flat();
    return new Changes(spans, bars);
  }

  /** The chord sounding at a time. */
  at(time: number): Chord {
    const span = this.spans.find((s) => time >= s.time && time < s.time + s.dur);
    if (span) return span.chord;
    // Past the end (a figure's last note): the last chord.
    const last = this.spans.at(-1);
    if (!last) throw new Error(`No chords to play at bar ${time}`);
    return last.chord;
  }
}

/** A song as timed notes. */
export interface Score {
  /** Every note, by time. */
  readonly notes: readonly ScoreNote[];
  readonly bars: number;
}
