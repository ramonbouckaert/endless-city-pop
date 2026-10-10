// What a section's recipe works with: its section and material, the
// band, and the parts most recipes share. Sections the band plays
// through get a PlayedScoreContext: their chords, bass, lines and the
// figures built on them. As render/sections/context.ts, without Strudel.

import { lazy } from '../../lib/lazy';
import type { Line, MaterialOf, Melody, Note, PlayedMaterial, PlayedType, SectionOf, Solo, Song } from '../../model';
import type { DrumRole, SectionType } from '../../style';
import type { Chord, Key } from '../../theory';
import type { NoteSpec, ScoreBand } from '../band';
import { drumNotes } from '../drums';
import { DOUBLE_TOP, lastBar, type Rhythm, RHYTHMS, SLIDE_SECONDS, spans, type Timed } from '../figures';
import { Changes, Part, rise, within } from '../score';

/** A section's drums, and its pitched parts (falsy ones left out). */
export type Parts = { drums: Part[]; pitched: (Part | null | false | undefined)[] };

/** A line's notes over `bars` bars, looping it, each at the pitch `pitch` gives it. */
export function lineNotes<N extends Note>(
  line: Line<N>,
  bars: number,
  pitch: (note: N, time: number) => number,
): NoteSpec[] {
  return Array.from({ length: bars }, (_, b) =>
    line.bars[b % line.bars.length].map((n) => {
      const time = b + n.start / line.grid;
      const dur = (Math.min(n.start + n.len, line.grid) - n.start) / line.grid;
      return { time, dur, note: pitch(n, time) };
    }),
  ).flat();
}

/** A pitch a chord-scale degree up from a chord's bass root. */
export const onChord = (chord: Chord, degree: number, alter = 0): number =>
  chord.bassMidi + chord.chordScale.semis(degree) + alter;

export class ScoreContext<T extends SectionType = SectionType> {
  constructor(
    readonly song: Song,
    readonly sec: SectionOf<T>,
    readonly mat: MaterialOf<T>,
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

  /** White noise rising through the section, a hit a bar. */
  get riser(): Part {
    const bars = Array.from({ length: this.len }, (_, b) => b);
    return new Part(
      bars.map((time) => ({ time, dur: 1, sound: 'white', gain: 0, velocity: 1, postgain: 1, clip: 1, controls: {} })),
    )
      .gain(rise(0, 0.07, this.len))
      .hpf(3000);
  }
}

export class PlayedScoreContext<T extends PlayedType = PlayedType> extends ScoreContext<T> {
  // The material, as every played section has it.
  private get played(): PlayedMaterial {
    return this.mat;
  }

  // The section's chords, and the band's bass line over them, each built
  // on first use (so the band notes the bass only if it plays).
  private readonly changes = lazy(() => Changes.of(this.played.bars, this.len));
  private readonly bassLine = lazy(() =>
    this.band.bass(
      lineNotes(this.played.bass, this.len, (n, time) => onChord(this.C.at(time), n.degree.step, n.degree.alter)),
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
    return lineNotes(melody, this.len, (n) => base + n.semis);
  }

  /** A melody with a second voice `below` scale steps under each note: diatonic harmony. */
  harmonized(melody: Melody, below: number): NoteSpec[] {
    const { key } = this;
    const base = 60 + key.tonic;
    const lower = (semis: number) => {
      const { step, alter } = key.scale.degree(semis, key.usesFlats);
      return key.scale.semis(step - below) + alter;
    };
    return [
      ...lineNotes(melody, this.len, (n) => base + n.semis),
      ...lineNotes(melody, this.len, (n) => base + lower(n.semis)),
    ];
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

  /** An improvised line against the section's chord-scales, two octaves up: grace notes flicked or slid into. */
  soloLine(solo: Solo): NoteSpec[] {
    return Array.from({ length: this.len }, (_, b) =>
      solo.bars[b % solo.bars.length].flatMap((n): NoteSpec[] => {
        const time = b + n.start / solo.grid;
        const dur = (Math.min(n.start + n.len, solo.grid) - n.start) / solo.grid;
        const chord = this.C.at(time);
        const note = onChord(chord, n.degree) + 24;
        const { grace } = n;
        if (!grace) return [{ time, dur, note }];
        if (grace.slur) return [{ time, dur, note, slide: { semis: grace.semis, seconds: SLIDE_SECONDS } }];
        // A flick: a third of a sixteenth, then the note.
        const flick = dur / (3 * n.len);
        const from = grace.chromatic ? note + grace.from : onChord(chord, n.degree + grace.from) + 24;
        return [
          { time, dur: flick, note: from },
          { time: time + flick, dur: dur - flick, note },
        ];
      }),
    ).flat();
  }
}

/** The context a section type's recipe gets. */
export type ScoreContextOf<T extends SectionType> = T extends PlayedType ? PlayedScoreContext<T> : ScoreContext<T>;
