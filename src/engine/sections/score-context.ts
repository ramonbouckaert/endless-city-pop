// What a section's recipe plays with: the band, and the parts most
// recipes share. A section the band plays through is played from a
// PlayedScoreContext: its chords, bass, lines and the figures built on
// them.

import { PERCUSSION } from '../../lib/general-midi';
import { lazy } from '../../lib/lazy';
import {
  CLAV,
  DOUBLE_TOP,
  FERMATA,
  FIGURES,
  GUITAR_OSTINATOS,
  LAYERS,
  MIX,
  RHYTHMS,
  RISER,
  RISER_SECONDS,
  type DrumRole,
  type Rhythm,
} from '../../style';
import type { Chord, Key } from '../../theory';
import {
  Changes,
  lastBar,
  onChord,
  Part,
  rise,
  scoreNote,
  spans,
  timed,
  within,
  type NoteSpec,
  type ScoreBand,
  type ScoreNote,
  type Timed,
} from '../score';
import { drumNotes, type Melody, type Solo } from '../writers';
import type { PlayedMaterial, PlayedSection, Section } from './section';

/**
 * A section's parts (falsy ones left out), drums first. The arranger
 * moves them into the section's key, the drums and the riser staying put.
 */
export type Parts = readonly (Part | null | false | undefined)[];

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

  /**
   * A reverse cymbal swelling into the next section, its peak on the
   * downbeat (over a last bar played at `scale` of the song's tempo).
   */
  riserAt(scale = 1): Part {
    const dur = (RISER_SECONDS * this.band.bpm * scale) / 240; // seconds in bars of 4 beats
    return new Part([scoreNote({ time: this.len - dur, dur, program: RISER, note: 60, gain: 0.35 })]);
  }

  /** A reverse cymbal swelling into the next section, its peak on the downbeat. */
  get riser(): Part {
    return this.riserAt();
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

export class PlayedScoreContext extends ScoreContext {
  constructor(
    override readonly sec: PlayedSection,
    band: ScoreBand,
    repeat: number,
  ) {
    super(sec, band, repeat);
  }

  // The section's material, as every played section has it.
  private get played(): PlayedMaterial {
    return this.sec.material;
  }

  // The section's chords under its melody, and the band's bass line over them, each built on first use.
  private readonly changes = lazy(() => Changes.of(this.played.bars, this.len).under(this.sec.melodyOver(this)));
  private readonly bassLine = lazy(() =>
    this.band.bass(
      this.played.bass.notes(this.len, (n, time) => onChord(this.C.at(time), n.degree.step, n.degree.alter)),
    ),
  );

  /** The section's chords, making room for its melody. */
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

  /** The clavinet on the part's figure. */
  get clav(): Part {
    return this.band.clav(this.C, CLAV[this.played.clav].figure);
  }

  /** The song's guitar figure, if this section plays it. */
  get signature(): Part | undefined {
    const { signature } = this.played;
    return signature && this.band.signature(this.C, GUITAR_OSTINATOS[signature]);
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

  /** The horns running up the scale through the last bar's last three beats, into the next downbeat. */
  runInto(): Part {
    const { len, band } = this;
    return band.horns(this.onChords(timed(lastBar(len, FIGURES.liftRun), len), 12));
  }

  // 12 to play a melody an octave up, or 0 if that would take it too high.
  octaveUp(melody: Melody): number {
    return this.tonicPitch + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
  }

  /** The intro's line on bells, if it has one: an octave up, if it fits. */
  teaser(melody: Melody | undefined): Part | undefined {
    const line = this.teaserLine(melody);
    return line && this.band.bell(line);
  }
  /** The teaser's notes. */
  teaserLine(melody: Melody | undefined): NoteSpec[] | undefined {
    return melody && this.line(melody, this.octaveUp(melody));
  }

  /** The section's drums; `enter` may hold a part back, by role. */
  drums(enter?: (role: DrumRole) => ((time: number) => boolean) | undefined): Part {
    return drumNotes(this.band, this.played.drums, this.len, this.repeat, enter);
  }

  /**
   * Stop-time: the band and drums hit together on the stops, then (if
   * `drive`) groove through the last bar.
   */
  stopTime(drums: Part, drive = true): Part[] {
    const { band, len, C, B } = this;
    const hits = (last: Rhythm) => spans(drive ? lastBar(len, last, RHYTHMS.stops) : RHYTHMS.stops, len);
    return [
      drums.mask(within(hits(RHYTHMS.whole))),
      B.struct(hits(RHYTHMS.eighths)),
      band.keys(C, hits(RHYTHMS.offbeats)).clip(0.3),
      band.stabs(C, hits([[]])),
    ];
  }

  /**
   * Hand percussion (LAYERS) coming in one at a time, evenly through the
   * section after its first bars, each playing on from there.
   */
  layers(): Part {
    const { len, band } = this;
    const every = Math.max(1, Math.floor(len / (LAYERS.length + 1)));
    return Part.stack(
      ...LAYERS.map((hits, i) =>
        Part.stack(
          ...hits.map(({ drum, at, gain }) =>
            band.kit(
              drum,
              Array.from({ length: len }, (_, b) => ({ time: b + at / 16, dur: 1 / 16, gain })).filter(
                ({ time }) => time >= (i + 1) * every,
              ),
            ),
          ),
        ),
      ),
    );
  }

  /**
   * The section's parts with its last bar held on a fermata (slowed by
   * its tempo): everything stops at that bar's downbeat, where the band
   * hits its first chord under a crash and holds it, a reverse cymbal
   * swelling into the next section.
   */
  fermata(parts: Parts): Parts {
    const { band, len } = this;
    const last = len - 1;
    const chord = this.C.at(last);
    const held = new Changes([{ time: last, dur: 1, chord }], len);
    return [
      ...parts.map((p) => p && p.until(last)),
      band.kit([PERCUSSION.kick, PERCUSSION.crash], [{ time: last, dur: 1, gain: 0.5 }]),
      band.finaleKeys(held),
      band.strings(held),
      band.bass([{ time: last, dur: 1, note: chord.bassMidi }]),
      this.riserAt(FERMATA.midSong),
    ];
  }

  /**
   * The section's parts with the band stopping dead in its last bar: a
   * hit on its downbeat, then silence under the melody voices (which sing
   * on), and a snare pickup through the last beat into the next section.
   */
  stopBar(parts: Parts): Parts {
    const { band, len } = this;
    const last = len - 1;
    const hit = [{ time: last, dur: 1 / 8 }];
    const sings = (n: ScoreNote) => !!n.path && SINGING.some((p) => n.path?.startsWith(p));
    return [
      ...parts.map(
        (p) => p && Part.stack(new Part(p.until(last).notes.filter((n) => !sings(n))), new Part(p.notes.filter(sings))),
      ),
      band.kit([PERCUSSION.kick, PERCUSSION.crash], [{ ...hit[0], gain: 0.5 }]),
      band.keys(this.C, hit),
      band.stabs(this.C, hit),
      band.bass([{ ...hit[0], note: this.C.at(last).bassMidi }]),
      band.kit(
        PERCUSSION.snare,
        [12, 13, 14, 15].map((step, i) => ({ time: last + step / 16, dur: 1 / 16, gain: 0.22 + 0.06 * i })),
      ),
    ];
  }

  /** Strings swelling through the section, up to `top`. */
  swell(top: number): Part {
    return this.band.strings(this.C).gain(rise(0.04, top, this.len));
  }

  /** A solo against the section's chords: a stab's chords too, if `chords`. */
  soloLine(solo: Solo, chords = false): NoteSpec[] {
    return solo.play(this.C, this.len, chords);
  }
}

// The melody voices, which sing on through a stop: their parts' paths.
const SINGING = ['lead', 'double', 'echo', 'answer', 'bell', 'soloists.'];
