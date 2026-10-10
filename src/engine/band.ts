// The instruments, as a score plays them: a song's sounds on lines of
// pitches and on chords, each part at its level in the mix.

import type { Percussion } from '../lib/general-midi';
import type { Rng } from '../lib/random';
import { ANCHORS, COMP, FIGURES, MIX, RHYTHMS, type Figure, type Level, type MixName } from '../style';
import { BASS_LOW, voice, voicingNote, type Chord } from '../theory';
import { spans, timed } from './figures';
import type { Instruments, SoundPath } from './orchestration';
import { Part, scoreNote, type Changes, type NoteSpec, type Span } from './score';

/** A part that plays lines, at a gain (before its sound's trim). */
export interface LineVoice {
  path: SoundPath;
  gain: number;
}

// The parts that play chords.
type ChordPart = 'keys' | 'clav' | 'guitar' | 'pad' | 'strings' | 'choir' | 'stabs';

// A chord to play over a span: all of its voicing, or note `n` of it.
interface ChordHit extends Span {
  chord: Chord;
  n?: number;
}

// A pitch raised by octaves to the bass's lowest note, if it is below.
const bassRange = (note: number) => (note < BASS_LOW ? note + 12 * Math.ceil((BASS_LOW - note) / 12) : note);

export class ScoreBand {
  /** `rng`: for the keyboard parts' varying velocities. */
  constructor(
    private readonly instruments: Instruments,
    private readonly rng: Rng,
  ) {}

  /** Hits on a drum of the song's kit, each at its gain. */
  kit(drum: Percussion, hits: readonly (Span & { gain: number })[]): Part {
    return new Part(
      hits.map(({ time, dur, gain }) => scoreNote({ time, dur, path: 'kit', program: 'drums', note: drum, gain })),
    );
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

  // Chords voiced on a part's sound (or one note of each voicing), at a level in the mix.
  private chords(part: ChordPart, hits: readonly ChordHit[], mix: MixName, anchor?: number): Part {
    const specs = hits.flatMap(({ time, dur, chord, n }) => {
      const notes = n === undefined ? voice(chord, anchor) : [voicingNote(chord, n, anchor)];
      return notes.map((note) => ({ time, dur, note }));
    });
    return this.play(part, specs, MIX[mix]);
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
    return this.chords('keys', this.on(changes, rhythm), mix).velocity(this.varied(0.8, 1));
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
    return this.chords('keys', changes.spans, 'softKeys');
  }
  softKeysUnder(changes: Changes): Part {
    return this.chords('keys', changes.spans, 'softKeysUnder');
  }
  arp(changes: Changes): Part {
    return this.chords('keys', this.figure(changes, FIGURES.arp), 'arp');
  }
  /** The final chord, held on the keys. */
  finaleKeys(changes: Changes): Part {
    return this.chords('keys', changes.spans, 'finaleKeys');
  }
  /** A line on the keys' sound, for the finale's run. */
  keysRun(specs: readonly NoteSpec[]): Part {
    return this.play('keys', specs, MIX.keysRun);
  }
  clav(changes: Changes): Part {
    return this.chords('clav', this.figure(changes, FIGURES.clav), 'clav').velocity(this.varied(0.7, 1));
  }
  scratch(changes: Changes): Part {
    return this.chords('guitar', this.figure(changes, FIGURES.scratch), 'scratch').velocity(this.varied(0.7, 1));
  }
  pad(changes: Changes): Part {
    return this.chords('pad', changes.spans, 'pad', ANCHORS.pad);
  }
  strings(changes: Changes): Part {
    return this.chords('strings', changes.spans, 'strings', ANCHORS.strings);
  }
  choir(changes: Changes): Part {
    return this.chords('choir', changes.spans, 'choir', ANCHORS.choir);
  }
  stabs(changes: Changes, rhythm: readonly Span[] = spans(RHYTHMS.stab, changes.bars)): Part {
    return this.chords('stabs', this.on(changes, rhythm), 'stabs', ANCHORS.stabs);
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
  lead(specs: readonly NoteSpec[]): Part {
    return this.play('lead', specs, MIX.lead);
  }
  double(specs: readonly NoteSpec[], up = 12, path: SoundPath = 'double', level: Level = MIX.double): Part {
    return this.play(
      path,
      specs.map((s) => ({ ...s, note: s.note + up })),
      level,
    );
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
