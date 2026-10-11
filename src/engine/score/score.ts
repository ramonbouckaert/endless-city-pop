// A song as timed notes: every note each part plays, with the controls
// that shape its sound. Times and lengths are in bars, from the start of
// the song in a Score and of the section in a Part.

import type { Program } from '../../lib/general-midi';
import { loopBars } from '../../lib/steps';
import { MELODY_HELD, type Figure, type Rhythm } from '../../style';
import type { PartPath } from '../song';
import type { Bar, Chord } from '../../theory';

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
  /** An echo's: how far behind the line it echoes it plays, in bars (it swings as that line does). */
  readonly delay?: number;
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

// The style's rhythms and figures (style/figures.ts) placed in time, in
// bars from the section's start.

/** A figure's hit placed in time, in bars from the section's start. */
export interface Timed<V> extends Span {
  readonly value: V;
}

/** A rhythm's hits over `bars` bars. */
export function spans(rhythm: Rhythm, bars: number): Span[] {
  return loopBars(rhythm, bars, ([step, len], b) => ({ time: b + step / 16, dur: len / 16 }));
}

/** A figure's hits over `bars` bars, each with its value. */
export function timed<V>(figure: Figure<V>, bars: number): Timed<V>[] {
  return loopBars(figure, bars, ([step, len, value], b) => ({ time: b + step / 16, dur: len / 16, value }));
}

/** `bars` bars of a rhythm or figure: `rest` (looping) in all but the last, which plays `last`'s first bar. */
export function lastBar<H>(
  bars: number,
  last: readonly (readonly H[])[],
  rest: readonly (readonly H[])[] = [[]],
): (readonly H[])[] {
  return [...Array.from({ length: bars - 1 }, (_, b) => rest[b % rest.length] ?? []), last[0] ?? []];
}

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

  /** The notes that start before `time`, any still sounding then cut off there. */
  until(time: number): Part {
    return new Part(
      this.notes.filter((n) => n.time < time).map((n) => (n.time + n.dur > time ? { ...n, dur: time - n.time } : n)),
    );
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

  /** Pitched notes moved by semitones (drums, and effects such as the riser, stay as they are). */
  transpose(semis: number): Part {
    if (!semis) return this;
    return this.map((n) => (n.program === 'drums' || !n.path ? n : { ...n, note: n.note + semis }));
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
  chord.rootMidi + chord.chordScale.semis(degree) + alter;

/** A section's chords over time: what plays when, and the melody over them. */
export class Changes {
  constructor(
    readonly spans: readonly ChordSpan[],
    readonly bars: number,
    readonly melody: readonly NoteSpec[] = [],
  ) {}

  /** The same chords under a melody, which chords played over it make room for (melodyOver). */
  under(line: readonly NoteSpec[] | undefined): Changes {
    return new Changes(this.spans, this.bars, [...this.melody, ...(line ?? [])]);
  }

  /**
   * The pitches of the melody a chord over a span makes room for: its long
   * notes (MELODY_HELD) sounding during the span, and any note struck with it.
   */
  melodyOver({ time, dur }: Span): number[] {
    const struck = (n: NoteSpec) => Math.abs(n.time - time) < 1 / 64;
    return this.melody
      .filter((n) => n.time < time + dur && n.time + n.dur > time && (n.dur >= MELODY_HELD || struck(n)))
      .map((n) => n.note);
  }

  /** `bars` bars of a material's chords, looping them; two in a bar share it. */
  static of(material: readonly Bar[], bars: number): Changes {
    const spans = loopBars(material, bars, (chord, b, i) => {
      const { length } = material[b % material.length];
      return { time: b + i / length, dur: 1 / length, chord };
    });
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
