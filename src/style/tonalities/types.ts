import type { Weighted } from '../../lib/random';
import type { ChordClass, ChordSpec, Mode } from '../../theory';
import type { PaletteName } from '../harmony';
import type { PreFlavour } from '../variants';

// A turnaround's chords relative to the key it leads into, one array per bar.
export interface Turnaround {
  weight: number;
  bars: readonly (readonly ChordSpec[])[];
}

// Each section's progressions (a tag's: the bars a chorus runs over by);
// a bridge's only where the mode has its own.
export interface Templates {
  vamp: readonly string[];
  verse: readonly string[];
  chorus: readonly string[];
  tag: readonly string[];
  riff: readonly string[];
  intro: readonly string[];
  bridge?: readonly string[];
}

// A key a bridge may move to: semitones above home, and its mode.
export interface BridgeKey {
  offset: number;
  weight: number;
  adventurous: boolean;
  mode?: Mode; // default major
}

// How a mode's solos are built, eight bars at a time, each eight ending
// with its cadence home (`approach`): `pair` is two bars in a key, played
// in keys a step apart (`steps`, else SOLO_CHANGES.steps); a shape picks
// what leads up to the cadence.
export interface SoloChanges {
  pair: readonly (readonly ChordSpec[])[];
  steps?: Weighted<number>;
  shapes: Weighted<SoloShape>;
}
// cycle: three pairs moving through keys. home: two bars on the home
// tonic, then two pairs. loop: six bars of one of the mode's vamps.
export type SoloShape = 'cycle' | 'home' | 'loop';

// How a mode sounds as a key: its progressions, where it cadences, what
// its tonic chord is, and how it moves away and comes home. Templates are
// roman numerals relative to the tonic, one token per bar ("[ii7 V7]"
// puts two chords in a bar); a template's length is its natural phrase,
// repeated to fill the section.
export interface TonalityDef {
  weight: number; // how often a seed picks this mode
  tonics: readonly number[]; // pitch classes a seed may pick
  tonic: ChordClass; // the tonic chord's family
  tonicPalette?: PaletteName; // its colours, if not the family's own
  reharm: number; // times the style's reharm amount
  finale: readonly (readonly [symbol: string, scale: string])[];
  approach: readonly (readonly ChordSpec[])[]; // two bars into the tonic
  templates: Readonly<Templates>;
  pre: Readonly<Record<PreFlavour, readonly string[]>>;
  bridgeKeys: readonly BridgeKey[];
  turnarounds: Readonly<Record<string, Turnaround>>;
  solo: SoloChanges;
}
