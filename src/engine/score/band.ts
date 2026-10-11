// The instruments, as a score plays them: a song's sounds on lines of
// pitches and on chords, each part at its level in the mix.

import { PERCUSSION, type Percussion } from '../../lib/general-midi';
import type { Rng } from '../../lib/random';
import {
  CHORDAL,
  COMP,
  FIGURES,
  MIX,
  RHYTHMS,
  SCOOP,
  SCOOPERS,
  type Figure,
  type Level,
  type MixName,
  type Voicings,
} from '../../style';
import { Chord, Voicing } from '../../theory';
import type { Instruments, SoundPath } from '../song';
import { Part, scoreNote, spans, timed, type Changes, type NoteSpec, type Span } from './score';

/** A part that plays lines, at a gain (before its sound's trim). */
export interface LineVoice {
  path: SoundPath;
  gain: number;
}

// The parts that play chords, and those of them that sustain (voiced as
// the song voices sustained chords; the rest as it voices comping).
type ChordPart = 'keys' | 'clav' | 'guitar' | 'pad' | 'strings' | 'choir' | 'stabs';
const SUSTAINED: ReadonlySet<ChordPart> = new Set(['pad', 'strings', 'choir']);

// A chord to play over a span: all of its voicing, or note `n` of it.
interface ChordHit extends Span {
  chord: Chord;
  n?: number;
}

// A pitch raised by octaves to the bass's lowest note, if it is below.
const bassRange = (note: number) =>
  note < Chord.BASS_LOW ? note + 12 * Math.ceil((Chord.BASS_LOW - note) / 12) : note;

export class ScoreBand {
  /**
   * `bpm`: the song's tempo; `voicings`: how it voices chords; `rng`: for
   * the keyboard parts' varying velocities.
   */
  constructor(
    private readonly instruments: Instruments,
    readonly bpm: number,
    private readonly voicings: Voicings,
    private readonly rng: Rng,
  ) {}

  /** Hits on a drum of the song's kit (or several, together), each at its gain. */
  kit(drums: Percussion | readonly Percussion[], hits: readonly (Span & { gain: number })[]): Part {
    return Part.stack(
      ...[drums]
        .flat()
        .map(
          (drum) =>
            new Part(
              hits.map(({ time, dur, gain }) =>
                scoreNote({ time, dur, path: 'kit', program: 'drums', note: drum, gain }),
              ),
            ),
        ),
    );
  }

  /** A crash cymbal at a time. */
  crash(time = 0): Part {
    return this.kit(PERCUSSION.crash, [{ time, dur: 1, gain: 0.2 }]);
  }

  // A part's instrument on some notes at a level in the mix, trimmed for
  // the instrument picked.
  private play(path: SoundPath, specs: readonly NoteSpec[], { gain, room, pan, clip }: Level): Part {
    const program = this.instruments.sound(path);
    const postgain = this.instruments.trim(path);
    const controls = { ...(room === undefined ? {} : { room }), ...(pan === undefined ? {} : { pan }) };
    return new Part(
      specs.map(({ time, dur, note, slide }) =>
        scoreNote({
          time,
          dur,
          path,
          program,
          note,
          gain,
          postgain,
          clip: clip ?? 1,
          ...(slide ? { slide } : {}),
          controls,
        }),
      ),
    );
  }

  // Chords voiced on a part's sound (or one note of each voicing), at a
  // level in the mix, topping out at its anchor, each making room for the
  // melody over it (Changes.melodyOver).
  private chords(part: ChordPart, changes: Changes, hits: readonly ChordHit[], mix: MixName): Part {
    const level: Level = MIX[mix];
    const { anchor } = level;
    const style = SUSTAINED.has(part) ? this.voicings.sustain : this.voicings.comp;
    const specs = hits.flatMap(({ time, dur, chord, n }) => {
      const voicing = Voicing.of(chord, anchor, style, changes.melodyOver({ time, dur }));
      const notes = n === undefined ? voicing.notes : [voicing.note(n)];
      return notes.map((note) => ({ time, dur, note }));
    });
    return this.play(part, specs, level);
  }

  // The chords sounding at each of a rhythm's hits, played on them.
  private on(changes: Changes, rhythm: readonly Span[]): ChordHit[] {
    return rhythm.map((s) => ({ time: s.time, dur: s.dur, chord: changes.at(s.time) }));
  }

  // A figure on each chord's voicing: note `n` of the chord sounding at each hit.
  private figure(changes: Changes, figure: Figure<number>): ChordHit[] {
    return timed(figure, changes.bars).map((t) => ({ ...t, chord: changes.at(t.time), n: t.value }));
  }

  // Chords on the keys at one of their levels, on a rhythm, each at its own velocity.
  private keysAt(mix: 'keys' | 'keysUnder' | 'comp', changes: Changes, rhythm: readonly Span[]): Part {
    return this.chords('keys', changes, this.on(changes, rhythm), mix).velocity(this.varied(0.8, 1));
  }

  // A velocity between `lo` and `hi`, different for each note.
  private varied(lo: number, hi: number): () => number {
    return () => this.rng.range([lo, hi]);
  }

  keys(changes: Changes, rhythm: readonly Span[] = spans(COMP.main, changes.bars)): Part {
    return this.keysAt('keys', changes, rhythm);
  }
  /** Keys under a lead, a riff or a soloist. */
  keysUnder(changes: Changes, rhythm: readonly Span[] = spans(COMP.main, changes.bars)): Part {
    return this.keysAt('keysUnder', changes, rhythm);
  }
  /** Short chords on the keys, on a comping rhythm. */
  comp(changes: Changes, rhythm: readonly Span[]): Part {
    return this.keysAt('comp', changes, rhythm);
  }
  softKeys(changes: Changes): Part {
    return this.chords('keys', changes, changes.spans, 'softKeys');
  }
  softKeysUnder(changes: Changes): Part {
    return this.chords('keys', changes, changes.spans, 'softKeysUnder');
  }
  arp(changes: Changes): Part {
    return this.chords('keys', changes, this.figure(changes, FIGURES.arp), 'arp');
  }
  /** A sixteenth-note broken chord on the bells, doubled an octave up. */
  ostinato(changes: Changes): Part {
    const { anchor } = MIX.ostinato;
    const specs = this.figure(changes, FIGURES.ostinato).map(({ time, dur, chord, n = 0 }) => ({
      time,
      dur,
      note: Voicing.of(chord, anchor, 'close', changes.melodyOver({ time, dur })).note(n),
    }));
    return Part.stack(this.play('bell', specs, MIX.ostinato), this.double(specs, 12, 'bell', MIX.ostinatoDouble));
  }
  /** The final chord, held on the keys. */
  finaleKeys(changes: Changes): Part {
    return this.chords('keys', changes, changes.spans, 'finaleKeys');
  }
  /** A line on the keys' sound, for the finale's run. */
  keysRun(specs: readonly NoteSpec[]): Part {
    return this.play('keys', specs, MIX.keysRun);
  }
  clav(changes: Changes, figure: Figure<number>): Part {
    return this.chords('clav', changes, this.figure(changes, figure), 'clav').velocity(this.varied(0.7, 1));
  }
  scratch(changes: Changes): Part {
    return this.chords('guitar', changes, this.figure(changes, FIGURES.scratch), 'scratch').velocity(
      this.varied(0.7, 1),
    );
  }
  pad(changes: Changes): Part {
    return this.chords('pad', changes, changes.spans, 'pad');
  }
  strings(changes: Changes): Part {
    return this.chords('strings', changes, changes.spans, 'strings');
  }
  choir(changes: Changes): Part {
    return this.chords('choir', changes, changes.spans, 'choir');
  }
  stabs(changes: Changes, rhythm: readonly Span[] = spans(RHYTHMS.stab, changes.bars)): Part {
    return this.chords('stabs', changes, this.on(changes, rhythm), 'stabs');
  }
  /** A bass line, kept at or above the bass's lowest note. */
  bass(specs: readonly NoteSpec[]): Part {
    return this.play(
      'bass',
      specs.map((s) => ({ ...s, note: bassRange(s.note) })),
      MIX.bass,
    );
  }
  /** A line on a part's sound, at a gain. */
  voice({ path, gain }: LineVoice, specs: readonly NoteSpec[]): Part {
    return this.play(path, specs, { gain });
  }
  /** The lead; a synth lead or a sax scoops up into some of its long notes. */
  lead(specs: readonly NoteSpec[]): Part {
    if (!SCOOPERS.has(this.instruments.sound('lead'))) return this.play('lead', specs, MIX.lead);
    const rng = this.rng.fork('scoops');
    const scooped = specs.map((s) =>
      !s.slide && s.dur >= SCOOP.from && rng.chance(SCOOP.chance)
        ? { ...s, slide: { semis: -rng.pick(SCOOP.semis), seconds: SCOOP.seconds } }
        : s,
    );
    return this.play('lead', scooped, MIX.lead);
  }
  double(specs: readonly NoteSpec[], up = 12, path: SoundPath = 'double', level: Level = MIX.double): Part {
    return this.play(
      path,
      specs.map((s) => ({ ...s, note: s.note + up })),
      level,
    );
  }
  /** A line echoed `delay` bars later on the lead's sound. */
  echo(specs: readonly NoteSpec[], delay: number): Part {
    return this.play('echo', specs, MIX.echo)
      .late(delay)
      .map((n) => ({ ...n, delay }));
  }
  /** Whether two parts play on the same sound. */
  shares(a: SoundPath, b: SoundPath): boolean {
    return this.instruments.sound(a) === this.instruments.sound(b);
  }
  /** Whether one of the song's soloists plays chords. */
  chordal(index: number): boolean {
    return CHORDAL.has(this.instruments.sound(this.instruments.soloist(index)));
  }
  /** A line on one of the song's soloists, in the solo room. */
  soloist(index: number, specs: readonly NoteSpec[]): Part {
    return this.play(this.instruments.soloist(index), specs, MIX.soloist);
  }
  counter(specs: readonly NoteSpec[]): Part {
    return this.play('answer', specs, MIX.answer);
  }
  bell(specs: readonly NoteSpec[]): Part {
    return this.play('bell', specs, MIX.bell);
  }
  /** A lead doubled on the bell, an octave up. */
  bellDouble(specs: readonly NoteSpec[]): Part {
    return this.double(specs, 12, 'bell', MIX.bellDouble);
  }
  horns(specs: readonly NoteSpec[]): Part {
    return Part.stack(this.play('stabs', specs, MIX.horns), this.play('hornDouble', specs, MIX.hornDouble));
  }

  /** The voices that stack up the final chord in a cascade, each at its gain. */
  finaleVoices(): LineVoice[] {
    const { soloists } = this.instruments.sounds;
    return [
      { path: 'lead', gain: MIX.lead.gain * 0.6 },
      ...soloists.map((_, i) => ({ path: this.instruments.soloist(i), gain: MIX.soloist.gain })),
      { path: 'bell', gain: MIX.bell.gain },
      { path: 'double', gain: MIX.double.gain * 1.5 },
    ];
  }
}
