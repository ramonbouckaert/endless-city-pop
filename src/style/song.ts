// Song-wide choices: tempo and swing, how its chords are voiced, and
// where an intro gets its harmony. The ways each section can be played
// are in variants.ts.

import { along } from '../lib/math';
import type { Odds, Range, Weighted } from '../lib/random';
import type { ChordSpec, VoicingStyle } from '../theory';
import type { Colour } from './harmony';

// How a song voices its chords: the keys, clav and stabs (`comp`) close
// or in fourths, the pad, strings and choir (`sustain`) close or spread.
export interface Voicings {
  comp: Extract<VoicingStyle, 'close' | 'quartal'>;
  sustain: Extract<VoicingStyle, 'close' | 'spread'>;
}
export interface VoicingOdds {
  comp: Odds<Voicings['comp']>;
  sustain: Odds<Voicings['sustain']>;
}

// How long a melody note holds (in bars) for every chord under it to make
// room for it: a quarter note or longer. (A chord struck with a shorter
// note makes room for that one.)
export const MELODY_HELD = 1 / 4;

// A fermata: its bar played at this share of the song's tempo. The
// finale's holds long, at half the tempo; a moment held mid-song only
// leans back, the song moving on.
export const FERMATA = { ending: 0.5, midSong: 0.9 };

export const SONG = {
  // BPM: now and then a slow one (BALLAD.tempo), mostly city pop's easy
  // end to its uptempo disco.
  tempo: [
    [[70, 98], 1],
    [[92, 134], 5],
  ] as Weighted<Range>,
  // The tempos that pace a song's form and bass: from here to there a
  // song gets busier sixteen-bar sections and a calmer line, and no more
  // beyond.
  pace: [92, 124] as Range,
  // How late an eighth's second sixteenth lands, in sixteenths: from a
  // slight lean (0.06, 53:47) to a clear sixteenth shuffle (0.22, 61:39).
  swing: [0.06, 0.22] as Range,
  // A tonality may have its own (TonalityDef.voicings).
  voicings: { comp: { close: 4, quartal: 1 }, sustain: { close: 3, spread: 1 } } as VoicingOdds,
  // How lush its chords are (COLOURS).
  colour: { lush: 3, plain: 1, triadic: 1 } as Odds<Colour>,
  // How often its kick follows its bass line (Plastic Love's), and then
  // how often that bass plays one riff all through the song; and how
  // often a guitar figure of its own runs through it (GUITAR_OSTINATOS).
  lock: 0.2,
  riff: 0.5,
  ostinato: 0.2,
};

// How an intro gets its harmony: the hook's chords, the chorus's first
// four bars (with the hook as a teaser), planing add9 chords, or an
// intro template (perhaps with a riff of its own, `melodyChance`). A
// quiet intro (pads, rubato) has waves on the shore under it this often
// (`seashoreChance`: Sea Line's).
export type IntroHarmony = 'hook' | 'planing' | 'template';
export const INTRO = {
  harmony: { hook: 3, planing: 2, template: 6 } as Odds<IntroHarmony>,
  melodyChance: 0.5,
  seashoreChance: 0.25,
};

// How a sixteen-bar theme (a theme song's chorus) gets its harmony: the
// vamp three times and a four-bar tag (J-Cycle's way), or the chorus's
// changes twice, the second time to its cadence. A long verse's melody is
// in four-bar phrases this often (`longVerse`).
export type ThemeHarmony = 'vamp' | 'changes';
export const THEME = {
  harmony: { vamp: 2, changes: 1 } as Odds<ThemeHarmony>,
  longVerse: 0.5,
};

// Where a verse gets its harmony: a verse template of its own, the
// chorus's first eight bars (a verse and chorus sharing their changes:
// Flyday Chinatown's, Tokai's; in a song with a chorus), or a two-chord
// vamp (IV-V, IV-I/3) with the approach home at its end.
export type VerseHarmony = 'template' | 'chorus' | 'vamp';
export const VERSE = {
  harmony: { template: 6, chorus: 1.5, vamp: 2 } as Odds<VerseHarmony>,
};

// How often a minor or dorian song's chorus is in its relative major (a
// theme's never is).
export const CHORUS = { relativeMajor: 0.25 };

// How a bridge comes home: through the key's own approach (ii-V), or
// this often through `sus`, V/V suspended then V suspended (Sea Line's).
export const BRIDGE = {
  susExit: 0.3,
  sus: [['II:9sus'], ['V:9sus']] as readonly (readonly ChordSpec[])[],
};

// How a song leans towards a ballad (Last Summer Whisper's, Oh No, Oh
// Yes!'s), the slower it is: from not at all at `tempo`'s top to fully
// at its bottom. Each thing a ballad does is rolled on its own, likelier
// the further it leans: swung in eighths rather than sixteenths (by
// `swing`, in eighths: from a lilt, 0.15 or 57:43, to a triplet's, 1/3
// or 2:1, and never past it), its grooves eased into a ballad's
// (BALLAD_FEELS), on brushes (BALLAD_KITS), easing back on the last beat
// of each four-bar phrase (to `ritard` of its tempo, fully leaning; never leaning
// less than `ritardFrom`, too slight to hear), its verses and choruses
// moving two chords a bar (`paired`, fully leaning), its kick never
// following its bass, fewer rounds and solos and no drum break
// (FORM.ballad), its melodies in longer notes (a rhythm cell's weight
// divided by its notes to the power `melody`, fully leaning), and its
// verses now and then the keys alone under the lead (Oh No, Oh Yes!'s
// piano: VERSE_TEXTURES.alone).
export const BALLAD = {
  tempo: [80, 98] as Range,
  swing: [0.15, 1 / 3] as Range,
  paired: 0.5,
  ritard: 0.94,
  ritardFrom: 0.3,
  melody: 3,
};

/** How far a song at `bpm` leans towards a ballad: 0 (not at all) to 1 (fully), through BALLAD.tempo. */
export function balladLean(bpm: number): number {
  return 1 - along(bpm, BALLAD.tempo);
}
