// Plain data shapes. The model's behaviour lives in classes (music.ts,
// form.ts, melody.ts, song.ts); these are the records they pass around.

import type { Chord, Key } from './music';
import type { Melody, Solo } from './melody';

export type Bar = Chord[];

// The modes a song can be in. Each has a tonality (TONALITIES) with its
// own progressions; all are church modes, named as Strudel's scale() wants.
export type Mode = 'major' | 'minor' | 'dorian' | 'mixolydian';

export type ChordClass = 'maj' | 'min' | 'dom' | 'hdim' | 'dim' | 'sus' | 'power';
export interface ChordDef {
  cls: ChordClass;
  tones: readonly number[]; // semitones above the root
}

export type Weighted<T> = readonly (readonly [T, number])[];
export type Range = readonly [number, number];

// ---- Form -----------------------------------------------------------

export type SectionType =
  | 'intro'
  | 'vamp'
  | 'verse'
  | 'pre'
  | 'chorus'
  | 'riff'
  | 'bridge'
  | 'solo'
  | 'solo2'
  | 'breakdown'
  | 'drumBreak'
  | 'lift'
  | 'outro'
  | 'finale';

// What a repeat of a section changes. shift: semitones up, after a
// final-chorus key change; liftTo: the shift a lift leads into, by way
// of `turnaround` (a name in LIFT_TURNAROUNDS).
export interface SectionOpts {
  second?: boolean;
  answer?: boolean;
  big?: boolean;
  shift?: number;
  soloist?: number;
  liftTo?: number;
  turnaround?: string;
}

// ---- Lines ----------------------------------------------------------

export interface Note {
  start: number;
  len: number;
}
export interface MelodyNote extends Note {
  semis: number; // above the key's tonic
}
export interface SoloNote extends Note {
  degree: number; // chord-scale degree
}
export type MelodyKind = 'verse' | 'pre' | 'chorus' | 'bridge' | 'riff';
// How a pre-chorus melody unfolds: climbing a step each repeat, call and
// response, or long held notes.
export type PreMelody = 'climb' | 'question' | 'hold';
export type MotifLetter = 'A' | 'B' | 'C' | 'D' | 'E';

// ---- Drums and bass -------------------------------------------------

export type DrumFeel = 'funk' | 'disco' | 'halfTime' | 'bossa' | 'introRide' | 'claps' | 'build' | 'break';
export type DrumRole = 'kick' | 'snare' | 'ghost' | 'hat' | 'perc';
export type StepGains = number[]; // 16 sixteenths, 0 = silent

export interface DrumVoice {
  sound: string;
  role: DrumRole;
  bars: StepGains[]; // choices; a recipe picks one
}

// One step of a drum feel's recipe, run in order.
export type DrumStep =
  | { op: 'kicks'; required: readonly number[]; optional: Weighted<number>; gain: number }
  | {
      op: 'backbeat';
      steps: readonly number[];
      gain: number;
      // Keep `steps` with probability `keep`, else play `steps` from here.
      orElse?: { keep: number; steps: readonly number[] };
    }
  | { op: 'ghosts'; density: Range; avoid: readonly number[] }
  | { op: 'cymbal'; sixteenths: number; ride: number; loud: number }
  // Open hats on the offbeats if the cymbal is a hi-hat; else one on four.
  | { op: 'openHats'; chance: number }
  // One of `voices` (perhaps), playing one of its bars.
  | { op: 'voice'; chance?: number; voices: readonly DrumVoice[] };

export interface DrumRecipe {
  steps: readonly DrumStep[];
  openOnFour?: boolean; // an open hat may close the phrase
  steady?: boolean; // no variation in bar four
  quiet?: boolean; // softer fills
}

export interface DrumPart {
  sound: string;
  role: DrumRole;
  bars: StepGains[]; // four bars, the fourth a variation
}
export interface DrumHit {
  step: number;
  sound: string;
  gain: number;
}
export interface DrumFill {
  start: number;
  stop: boolean;
  hits: DrumHit[];
}
export interface Drums {
  feel: DrumFeel;
  parts: DrumPart[];
  fills: DrumFill[];
  crash: boolean;
  fill: boolean;
}

export type BassFeel = 'pedal' | 'funk' | 'drive' | 'disco' | 'halfTime' | 'bossa';
export type BassToken = 'R' | 'T' | 'F' | 'S' | 'O' | 'two' | 'four' | 'six' | 'below';
export interface BassFeelDef {
  grid: 8 | 16; // eighth- or sixteenth-note lines
  density: Range;
  sync: Range;
  octave: Range;
  legato: Range;
  approach: number;
  anchors?: Readonly<Record<number, BassToken>>; // steps that always sound
}
export interface Bass {
  feel: BassFeel;
  pattern: string; // mini-notation degrees for n()
  scales: string; // the chord-scales they play against
}

// ---- Song -----------------------------------------------------------

export type IntroHarmony = 'chorus' | 'planing' | 'template';
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst';
export type PreFlavour = 'climb' | 'pedal' | 'drop' | 'stops' | 'borrowed';
export interface DrumPlan {
  feels: DrumFeel[];
  crash: number; // chance of a crash on the first bar
  fill: number; // chance of a fill at the end
}
export interface PreFlavourDef {
  weight: number;
  melody: PreMelody;
  drums: DrumPlan;
  bass: BassFeel[];
}

export interface Material {
  type: SectionType;
  key: Key;
  bars?: Bar[];
  melody?: Melody;
  answer?: Melody;
  solo?: Solo;
  harmony?: IntroHarmony;
  texture?: IntroTexture;
  flavour?: PreFlavour; // pre-chorus only
  lifts?: Lift[]; // lift only: one per lift in the form, in order
  drums?: Drums;
  bass?: Bass;
  // drumBreak: the chord, section and shift it hands over to.
  pickupInto?: Chord;
  pickupFrom?: SectionType;
  pickupShift?: number;
}
export type Materials = Partial<Record<SectionType, Material>>;

// One lift: a turnaround into a new key, and the bass under it.
export interface Lift {
  turnaround: string;
  key: Key;
  bars: Bar[];
  bass?: Bass;
}

// A turnaround's chords relative to the key it leads into, one array per
// bar of ChordSpecs.
export interface Turnaround {
  weight: number;
  bars: readonly (readonly ChordSpec[])[];
}

// A chord as "numeral:symbol", with alternative symbols split by "|".
export type ChordSpec = string;

export type TemplateKind = 'vamp' | 'verse' | 'chorus' | 'tag' | 'riff' | 'intro';

// A key a bridge may move to: semitones above home, and its mode.
export interface BridgeKey {
  offset: number;
  weight: number;
  adventurous: boolean;
  mode?: Mode; // default major
}

// How a mode sounds as a key: its progressions, where it cadences, what
// its tonic chord is, and how it moves away and comes home. Templates are
// roman numerals relative to the tonic, so they are written per mode.
export interface Tonality {
  weight: number; // how often a seed picks this mode
  tonics: readonly number[]; // pitch classes a seed may pick
  tonic: ChordClass; // the tonic chord's family
  tonicPalette?: PaletteName; // its colours, if not the family's own
  reharm: number; // times the style's reharm amount
  finale: readonly (readonly [symbol: string, scale: string])[];
  approach: readonly (readonly ChordSpec[])[]; // two bars into the tonic
  templates: Readonly<Record<TemplateKind, readonly string[]>> & { bridge?: readonly string[] };
  pre: Readonly<Record<PreFlavour, readonly string[]>>;
  bridgeKeys: readonly BridgeKey[];
  turnarounds: Readonly<Record<string, Turnaround>>;
}
export type PaletteName = ChordClass | 'majLydian' | 'domToMinor' | 'susToMinor' | 'minTonic' | 'domTonic';

// Unset (or undefined) options are chosen from the seed.
export interface SongOptions {
  seed?: string | number | undefined;
  key?: number | null | undefined;
  mode?: Mode | null | undefined;
  bpm?: number | undefined;
}
