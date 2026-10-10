// What a section's recipe plays with: the band, and the parts most
// recipes share. A section the band plays through is played from a
// PlayedScoreContext: its chords, bass, lines and the figures built on
// them.

import { lazy } from '../../lib/lazy';
import { DOUBLE_TOP, FIGURES, MIX, RHYTHMS, RISER, type DrumRole, type PlayedType, type Rhythm } from '../../style';
import type { Chord, Key } from '../../theory';
import type { ScoreBand } from '../band';
import { drumNotes } from '../drums';
import { lastBar, spans, timed, type Timed } from '../figures';
import type { PlayedMaterial } from '../material';
import type { Melody, Solo } from '../melody';
import { Changes, onChord, Part, rise, scoreNote, within, type NoteSpec } from '../score';
import type { PlayedSection, Section } from './section';

/** A section's drums, and its pitched parts (falsy ones left out). */
export type Parts = { drums: Part[]; pitched: (Part | null | false | undefined)[] };

export class ScoreContext {
  constructor(
    readonly sec: Section,
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

  /** Two bass notes leading into a chord: the scale degrees below its root. */
  pickupInto(chord: Chord): Part {
    const { len } = this;
    const notes = timed(lastBar(len, FIGURES.pickup), len).map(({ time, dur, value }) => ({
      time,
      dur,
      note: onChord(chord, value),
    }));
    return this.band.bass(notes);
  }
}

export class PlayedScoreContext<T extends PlayedType = PlayedType> extends ScoreContext {
  constructor(
    override readonly sec: PlayedSection<T>,
    band: ScoreBand,
    repeat: number,
  ) {
    super(sec, band, repeat);
  }

  // The section's material, as every played section has it.
  private get played(): PlayedMaterial {
    return this.sec.material;
  }

  // The section's chords, and the band's bass line over them, each built on first use.
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
  /** The bass line held back, under a sparser texture. */
  get underB(): Part {
    return this.B.gain(MIX.bassUnder.gain);
  }

  /** The section's key. */
  get key(): Key {
    return this.played.key;
  }

  /** The key's tonic in octave 4 (MIDI), which melody notes count up from. */
  get tonicPitch(): number {
    return 60 + this.key.tonic;
  }

  /** A melody in this section's key, optionally shifted up. */
  line(melody: Melody, up = 0): NoteSpec[] {
    return melody.notes(this.len, (n) => this.tonicPitch + up + n.semis);
  }

  /** A melody with a second voice `below` scale steps under each note: diatonic harmony. */
  harmonized(melody: Melody, below: number): NoteSpec[] {
    const { key } = this;
    const lower = (semis: number) => {
      const { step, alter } = key.scale.degree(semis, key.usesFlats);
      return key.scale.semis(step - below) + alter;
    };
    return [...this.line(melody), ...melody.notes(this.len, (n) => this.tonicPitch + lower(n.semis))];
  }

  /** A figure of chord-scale degrees against the section's chords (from each one's bass root), shifted up. */
  onChords(hits: readonly Timed<number>[], up: number): NoteSpec[] {
    return hits.map(({ time, dur, value }) => ({ time, dur, note: onChord(this.C.at(time), value) + up }));
  }

  // 12 to play a melody an octave up, or 0 if that would take it too high.
  octaveUp(melody: Melody): number {
    return this.tonicPitch + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
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
