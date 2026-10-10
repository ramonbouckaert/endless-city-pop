// The instruments, as a score plays them: a song's sounds on lines of
// pitches and on chords, each part at its level in the mix. A band plays
// one section, and notes which of its parts that section asks for
// (`uses`). The same parts as render/band.ts, which builds them as
// Strudel patterns.

import type { Rng } from '../lib/random';
import type { Instruments, PartPath, SoundPath } from '../model';
import { MAX_SHIFT, SOUND_TOPS } from '../style';
import { voice, voicingNote, type Chord } from '../theory';
import { COMP, type Figure, FIGURES, RHYTHMS, spans, timed } from './figures';
import { MIX, type Level, type MixName } from './mix';
import { Part, type Changes, type ScoreNote, type Slide, type Span } from './score';

/** A pitched note to play, in bars from the section's start. */
export interface NoteSpec extends Span {
  readonly note: number;
  readonly slide?: Slide;
}

/** A part that plays lines, at a gain (before its sound's trim). */
export interface Voice {
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

// Where each part's voicing tops out (MIDI): a4, d6, e5, g5.
const ANCHORS = { pad: 69, strings: 86, choir: 76, stabs: 79 };

export class ScoreBand {
  private readonly used = new Set<PartPath>();

  /** `rng`: for the keyboard parts' varying velocities. */
  constructor(
    private readonly instruments: Instruments,
    private readonly rng: Rng,
  ) {}

  /** The parts asked for so far, in the order they first were. */
  get uses(): ReadonlySet<PartPath> {
    return new Set(this.used);
  }

  /** Drums on this song's kit; sounds the kit lacks play from the default samples. */
  drum(part: Part): Part {
    this.used.add('kit');
    const { kit } = this.instruments;
    return part.map((n) => {
      const bank = kit.bankFor(n.sound);
      return bank ? { ...n, bank } : n;
    });
  }

  // A part's sound on some notes at a level in the mix, trimmed for the
  // sound picked; notes above the sound's top drop by octaves. Sections
  // shifted up a key transpose after this, so the top allows for the
  // highest lift.
  private play(path: SoundPath, specs: readonly NoteSpec[], { gain, room, pan, clip }: Level): Part {
    this.used.add(path);
    const sound = this.instruments.sound(path);
    const top = SOUND_TOPS[sound];
    const postgain = this.instruments.trim(path);
    const controls = { ...(room === undefined ? {} : { room }), ...(pan === undefined ? {} : { pan }) };
    return new Part(
      specs.map(({ time, dur, note, slide }): ScoreNote => {
        let pitch = note;
        while (top !== undefined && pitch > top - MAX_SHIFT) pitch -= 12;
        return {
          time,
          dur,
          path,
          sound,
          note: pitch,
          gain,
          velocity: 1,
          postgain,
          clip: clip ?? 1,
          ...(slide ? { slide } : {}),
          controls,
        };
      }),
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

  // A velocity between `lo` and `hi`, different for each note.
  private varied(lo: number, hi: number): () => number {
    return () => this.rng.range([lo, hi]);
  }

  keys(changes: Changes, rhythm: readonly Span[] = spans(COMP.main, changes.bars)): Part {
    return this.chords('keys', this.on(changes, rhythm), 'keys').velocity(this.varied(0.8, 1));
  }
  softKeys(changes: Changes): Part {
    return this.chords('keys', changes.spans, 'softKeys');
  }
  arp(changes: Changes): Part {
    return this.chords('keys', this.figure(changes, FIGURES.arp), 'arp').delay(0.2, 0.375);
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
  bass(specs: readonly NoteSpec[]): Part {
    return this.play('bass', specs, MIX.bass);
  }
  /** A line on a part's sound, at a gain. */
  voice({ path, gain }: Voice, specs: readonly NoteSpec[]): Part {
    return this.play(path, specs, { gain });
  }
  lead(specs: readonly NoteSpec[]): Part {
    return this.play('lead', specs, MIX.lead);
  }
  double(specs: readonly NoteSpec[], up = 12): Part {
    return this.play(
      'double',
      specs.map((s) => ({ ...s, note: s.note + up })),
      MIX.double,
    );
  }
  /** A line on one of the song's soloists, in the solo room. */
  soloist(index: number, specs: readonly NoteSpec[]): Part {
    return this.play(this.soloistPath(index), specs, MIX.soloist).delay(0.15, 0.27);
  }
  counter(specs: readonly NoteSpec[]): Part {
    return this.play('answer', specs, MIX.answer);
  }
  bell(specs: readonly NoteSpec[]): Part {
    return this.play('bell', specs, MIX.bell);
  }
  horns(specs: readonly NoteSpec[]): Part {
    return Part.stack(this.play('stabs', specs, MIX.horns), this.play('hornDouble', specs, MIX.hornDouble));
  }

  /** The voices that stack up the final chord in a cascade, each at its gain. */
  finaleVoices(): Voice[] {
    const { soloists } = this.instruments.sounds;
    return [
      { path: 'lead', gain: MIX.lead.gain * 0.6 },
      ...soloists.map((_, i) => ({ path: this.soloistPath(i), gain: MIX.soloist.gain })),
      { path: 'bell', gain: MIX.bell.gain },
      { path: 'double', gain: MIX.double.gain * 1.5 },
    ];
  }

  private soloistPath(index: number): SoundPath {
    return `soloists.${index % this.instruments.sounds.soloists.length}`;
  }
}
