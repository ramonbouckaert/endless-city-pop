// Plain data shapes. The model's behaviour lives in classes (music.ts,
// form.ts, melody.ts, song.ts); these are the records they pass around.

import type { Chord, Key } from './music';
import type { Melody, Solo } from './melody';

export type Bar = readonly Chord[];

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
  outro?: OutroStyle;
}
// How the song winds down before the finale: the intro's chords again,
// quietly, or the band vamping while two soloists trade lines.
export type OutroStyle = 'reprise' | 'trade';

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
  grace?: Grace;
}
// A grace note into a note from above (1) or below (-1): a semitone
// away if chromatic, else the next degree. Flicked as a note of its own,
// or slurred: the note starts at its pitch and slides.
export interface Grace {
  from: 1 | -1;
  chromatic: boolean;
  semis: number; // the grace note's pitch, from the note's
  slur: boolean;
}
export type MelodyKind = 'verse' | 'pre' | 'chorus' | 'bridge' | 'riff';
// How a pre-chorus melody unfolds: climbing a step each repeat, call and
// response, or long held notes.
export type PreMelody = 'climb' | 'question' | 'hold';
export type MotifLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
// How a verse, chorus or bridge melody lays its motifs over eight bars.
export type PhraseForm = 'period' | 'pairs' | 'sentence' | 'aaba' | 'callResponse';

// ---- Drums and bass -------------------------------------------------

export type DrumFeel = 'funk' | 'disco' | 'halfTime' | 'bossa' | 'introRide' | 'claps' | 'build' | 'break';
export type DrumRole = 'kick' | 'snare' | 'ghost' | 'hat' | 'perc';
export type StepGains = readonly number[]; // 16 sixteenths, 0 = silent

export interface DrumVoice {
  sound: string;
  role: DrumRole;
  bars: readonly StepGains[]; // choices; a recipe picks one
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
  bars: readonly StepGains[]; // four bars, the fourth a variation
}
export interface DrumHit {
  step: number;
  sound: string;
  gain: number;
}
export interface DrumFill {
  start: number;
  stop: boolean;
  hits: readonly DrumHit[];
}
export interface Drums {
  feel: DrumFeel;
  parts: readonly DrumPart[];
  fills: readonly DrumFill[];
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
// How the drums start the opening vamp: after two bars, with kick and
// hats for two bars, or the whole kit from the first.
export type DrumEntry = 'late' | 'light' | 'full';
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst' | 'arp' | 'drumsFirst' | 'fanfare';
export type PreFlavour = 'climb' | 'pedal' | 'drop' | 'stops' | 'borrowed';
export interface DrumPlan {
  feels: DrumFeel[];
  crash: number; // chance of a crash on the first bar
  fill: number; // chance of a fill at the end
}
// A section's drums, and the bass feels that go with them.
export interface Rhythm {
  drums: DrumPlan;
  bass: BassFeel[];
}
export interface PreFlavourDef extends Rhythm {
  weight: number;
  melody: PreMelody;
}

// What a section plays. Every type has its own shape (MaterialOf), so
// the arranger can rely on what's there: a section with a band has its
// chords, drums and bass; the rest is per type.
interface MaterialBase<T extends SectionType> {
  type: T;
  key: Key;
}
// A section the band plays through: its chords, groove and bass line.
type Played<T extends SectionType> = MaterialBase<T> & { bars: Bar[]; drums: Drums; bass: Bass };

// What each band section has besides.
interface PlayedFields {
  intro: { harmony: IntroHarmony; texture: IntroTexture; melody?: Melody };
  vamp: { entry: DrumEntry }; // how the drums start the opening vamp
  verse: { melody: Melody };
  pre: { flavour: PreFlavour; melody: Melody };
  chorus: { melody: Melody; answer: Melody };
  riff: { melody: Melody };
  bridge: { melody: Melody };
  breakdown: { melody: Melody };
  solo: { solo: Solo };
  solo2: { solo: Solo };
  // A reprise plays the intro's chords; a trade, soloists over a vamp.
  outro: { outro: 'reprise' } | { outro: 'trade'; solo: Solo };
}

// One lift for each in the form, in order; each brings its own chords and bass.
export type LiftMaterial = MaterialBase<'lift'> & { drums: Drums; lifts: Lift[] };
// Drums alone, then a bass pickup into `into`, the next section's first
// chord (in `key`, that section's key, shifted up `shift`).
export type DrumBreakMaterial = MaterialBase<'drumBreak'> & {
  drums: Drums;
  pickup: { into: Chord; key: Key; shift: number };
};
// The last chord, alone in its bar.
export type FinaleMaterial = MaterialBase<'finale'> & { bars: Bar[]; ending: FinaleStyle };

export type MaterialOf<T extends SectionType> = T extends keyof PlayedFields
  ? Played<T> & PlayedFields[T]
  : T extends 'lift'
    ? LiftMaterial
    : T extends 'drumBreak'
      ? DrumBreakMaterial
      : FinaleMaterial;
export type Material = MaterialOf<SectionType>;
export type Materials = { [T in SectionType]?: MaterialOf<T> };
// How the last chord rings out: voices stacking up it one by one, band
// hits, a slide down from a semitone above, or a run up it.
export type FinaleStyle = 'cascade' | 'hits' | 'slide' | 'run';

// One lift: a turnaround into a new key, and the bass under it.
export interface Lift {
  turnaround: string;
  key: Key;
  bars: Bar[];
  style: LiftStyle;
  bass: Bass;
}
// How a lift is played: a rising horn line, band hits, the drums
// dropping out, a run up into the chorus, or the drums alone.
export type LiftStyle = 'horns' | 'stops' | 'drop' | 'run' | 'drums';

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
  solo: SoloChanges;
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
// tonic, then two pairs. vamp: six bars of one of the mode's vamps.
export type SoloShape = 'cycle' | 'home' | 'vamp';
export type PaletteName = ChordClass | 'majLydian' | 'domToMinor' | 'susToMinor' | 'minTonic' | 'domTonic';

// ---- Arrangement ----------------------------------------------------

// A sound and its level.
export type Voice = [sound: string, gain: number];

// The band's instruments, as Strudel sound names: BAND (instruments.ts),
// with the parts each song picks.
export interface Sounds {
  keys: string;
  clav: string;
  guitar: string;
  pad: string;
  strings: string;
  choir: string;
  answer: Voice;
  bell: Voice;
  stabs: string; // horn stabs
  hornDouble: string; // the horn line's second voice
  bass: string;
  lead: Voice;
  double: Voice; // the lead an octave up
  soloists: Voice[];
}

// The melody voices, picked from VOICES.pool; the rest of the band.
export type VoiceRole = 'lead' | 'double' | 'soloists';
export type BandSounds = Omit<Sounds, VoiceRole>;
// Band parts a song picks a sound for, from PICKS.
export type PickedPart =
  | 'keys'
  | 'guitar'
  | 'pad'
  | 'strings'
  | 'choir'
  | 'answer'
  | 'bell'
  | 'stabs'
  | 'hornDouble'
  | 'bass';

// ---- Titles -------------------------------------------------------

// A title word in English, Japanese and katakana English (TITLE_WORDS).
export interface TitleWord {
  en: string;
  ja: string;
  kana?: string;
  adj?: boolean;
  romaji?: string; // the reading of `ja`, unless it is katakana
}

// A title's two halves (one Japanese, one English or romaji), how they
// join, and whether the English is romaji.
export interface TitleParts {
  title: string;
  aside: string;
  join: 'brackets' | 'dash' | 'space';
  romanised: boolean;
}
