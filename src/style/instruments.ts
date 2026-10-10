// Which Strudel sounds play which part: the band's default sounds, the
// sounds each song picks from for a part, the melody voices' pool, the
// drum kits, and the facts about sounds those choices rely on (how loud
// each plays, how high it goes, which share a recording, and its General
// MIDI program for the MIDI export).
//
// Strudel's loaded samples are drums and effects, so pitched parts use
// its General MIDI soundfonts and synths.

import type { Weighted } from '../lib/random';
import type { DrumSound } from './drums';

// The band's parts, besides the melody voices.
export type BandPart =
  | 'keys'
  | 'clav'
  | 'guitar'
  | 'pad'
  | 'strings'
  | 'choir'
  | 'answer' // phrases answering the hook
  | 'bell' // the intro teaser and bridge melody, high up
  | 'stabs' // horn stabs
  | 'hornDouble' // the horn line's second voice
  | 'bass';
// Band parts a song picks a sound for, from PICKS.
export type PickedPart = Exclude<BandPart, 'clav'>;
// The parts with a sound of their own: the band, the lead and its octave
// double (the soloists are numbered).
export type LabelledPart = BandPart | 'lead' | 'double';

// Each part's name on the page, in the order the debug panel lists them.
export const PART_LABELS: Readonly<Record<LabelledPart, string>> = {
  keys: 'Keys',
  clav: 'Clavinet',
  guitar: 'Rhythm guitar',
  bass: 'Bass',
  pad: 'Pad',
  strings: 'Strings',
  choir: 'Choir',
  lead: 'Lead',
  double: 'Melody double',
  answer: 'Answer',
  bell: 'Bell',
  stabs: 'Horn stabs',
  hornDouble: 'Horn double',
};

// ---- The band ---------------------------------------------------------

// Each part's default sound: the one its levels in render/mix.ts were
// set for. A picked part plays louder or quieter by its sound's level
// over this one's.
export const BAND: Readonly<Record<BandPart, string>> = {
  keys: 'gm_epiano1',
  clav: 'gm_clavinet',
  guitar: 'gm_electric_guitar_muted',
  pad: 'gm_voice_oohs',
  strings: 'gm_string_ensemble_1',
  choir: 'gm_choir_aahs',
  answer: 'gm_trumpet',
  bell: 'gm_vibraphone',
  stabs: 'gm_brass_section',
  hornDouble: 'gm_alto_sax',
  bass: 'gm_electric_bass_finger',
};

// The sounds each song picks from for a part, in the order parts are
// picked (their order here). A part never takes a sound another part already plays (melody
// voices first), where its list allows.
export const PICKS: Readonly<Record<PickedPart, readonly string[]>> = {
  // Electric pianos and clavinet; acoustic piano and organs.
  keys: ['gm_epiano1', 'gm_epiano2', 'gm_clavinet', 'gm_piano', 'gm_percussive_organ', 'gm_rock_organ'],
  // Funk scratching on any electric; nylon for a bossa feel.
  guitar: [
    'gm_electric_guitar_muted',
    'gm_electric_guitar_jazz',
    'gm_electric_guitar_clean',
    'gm_acoustic_guitar_nylon',
  ],
  pad: ['gm_pad_warm', 'gm_pad_poly', 'gm_pad_choir', 'gm_pad_metallic', 'gm_pad_halo', 'gm_pad_sweep'],
  // (String ensemble 2 is the same recording as 1; synth strings 1 won't load.)
  strings: ['gm_string_ensemble_1', 'gm_synth_strings_2'],
  choir: ['gm_choir_aahs', 'gm_voice_oohs', 'gm_synth_choir'],
  // The phrases answering the hook: brass, or a flute.
  answer: ['gm_trumpet', 'gm_muted_trumpet', 'gm_trombone', 'gm_flute'],
  // The intro teaser and bridge melody, high up: mallets and bells.
  bell: ['gm_vibraphone', 'gm_marimba', 'gm_xylophone', 'gm_celesta', 'gm_music_box', 'gm_kalimba', 'gm_glockenspiel'],
  stabs: ['gm_brass_section', 'gm_synth_brass_1', 'gm_synth_brass_2'],
  hornDouble: ['gm_alto_sax', 'gm_tenor_sax', 'gm_baritone_sax', 'gm_trombone'],
  // Electric, upright and synth basses.
  bass: [
    'gm_electric_bass_pick',
    'gm_electric_bass_finger',
    'gm_slap_bass_1',
    'gm_slap_bass_2',
    'gm_fretless_bass',
    'gm_acoustic_bass',
    'gm_synth_bass_1',
    'gm_synth_bass_2',
  ],
};

// ---- Melody voices ----------------------------------------------------

// Each song picks its lead, the lead's octave double and its soloists
// from `pool`, none twice. Their levels in render/mix.ts are set for the
// alto sax (level 1).
export const VOICES = {
  pool: [
    // Reeds and brass
    'gm_soprano_sax',
    'gm_alto_sax',
    'gm_tenor_sax',
    'gm_clarinet',
    'gm_flute',
    'gm_harmonica',
    'gm_trumpet',
    'gm_muted_trumpet',
    'gm_trombone',
    'gm_french_horn',
    'gm_brass_section',
    'gm_synth_brass_1',
    'gm_synth_brass_2',
    // Guitars, keys and mallets
    'gm_electric_guitar_jazz',
    'gm_overdriven_guitar',
    'gm_piano',
    'gm_drawbar_organ',
    'gm_reed_organ',
    'gm_glockenspiel',
    'gm_vibraphone',
    // Pads, effects and voices
    'gm_fx_crystal',
    'gm_fx_atmosphere',
    'gm_pad_warm',
    'gm_pad_poly',
    'gm_pad_choir',
    'gm_pad_metallic',
    'gm_pad_halo',
    'gm_pad_sweep',
    'gm_voice_oohs',
  ],
  soloists: 4,
};

// ---- Drum kits --------------------------------------------------------

// The default samples (null) or a drum machine, by Strudel bank name.
export const KITS: Weighted<string | null> = [
  [null, 6],
  ['LinnDrum', 1],
  ['LinnLM2', 1],
  ['RolandTR626', 1],
  ['RolandR8', 1],
  ['RolandMT32', 1],
  ['BossDR550', 1],
  ['AkaiXR10', 1],
  ['YamahaRY30', 1],
  ['RolandTR808', 1],
  ['RolandTR909', 1],
  ['OberheimDMX', 1],
  ['LinnLM1', 1],
  ['EmuSP12', 1],
  ['AkaiMPC60', 1],
  ['EmuDrumulator', 1],
  ['SequentialCircuitsDrumtracks', 1],
];

// Drum sounds a kit lacks, which play from the default samples instead.
export const KIT_GAPS: Readonly<Record<string, readonly DrumSound[]>> = {
  RolandTR808: ['rd', 'tb'],
  RolandTR909: ['sh', 'tb', 'cb'],
  OberheimDMX: ['cb'],
  LinnLM1: ['rd', 'cr', 'mt'],
  EmuSP12: ['sh', 'tb'],
  AkaiMPC60: ['sh', 'tb', 'cb'],
  EmuDrumulator: ['rd', 'sh', 'tb'],
  SequentialCircuitsDrumtracks: ['lt', 'mt'],
};

// ---- Facts about sounds -----------------------------------------------

// How loud to play each sound, so any can take a part: the alto sax's
// loudness over its own, playing the same phrase at the same gain (RMS of
// Strudel's offline render, basses two octaves down), kept within 0.5 to
// 2 (the glockenspiel measured 2.7, the rock organ 2.3). Only ratios
// between sounds that share a part matter.
export const SOUND_LEVELS: Readonly<Record<string, number>> = {
  gm_soprano_sax: 0.72,
  gm_alto_sax: 1,
  gm_tenor_sax: 1.05,
  gm_baritone_sax: 0.89,
  gm_clarinet: 0.71,
  gm_flute: 1.06,
  gm_harmonica: 1.03,
  gm_trumpet: 1.37,
  gm_muted_trumpet: 0.8,
  gm_trombone: 0.94,
  gm_french_horn: 1.54,
  gm_brass_section: 1.36,
  gm_synth_brass_1: 1.03,
  gm_synth_brass_2: 0.97,
  gm_electric_guitar_jazz: 0.98,
  gm_electric_guitar_clean: 0.63,
  gm_electric_guitar_muted: 1.94,
  gm_overdriven_guitar: 0.88,
  gm_acoustic_guitar_nylon: 0.79,
  gm_piano: 0.8,
  gm_epiano1: 0.84,
  gm_epiano2: 1.43,
  gm_clavinet: 0.75,
  gm_drawbar_organ: 1.24,
  gm_percussive_organ: 1.2,
  gm_rock_organ: 2,
  gm_reed_organ: 0.83,
  gm_vibraphone: 0.67,
  gm_marimba: 1.47,
  gm_xylophone: 1.84,
  gm_celesta: 0.67,
  gm_music_box: 0.71,
  gm_kalimba: 1.47,
  gm_glockenspiel: 2,
  gm_fx_crystal: 1.03,
  gm_fx_atmosphere: 0.97,
  gm_pad_warm: 0.97,
  gm_pad_poly: 0.97,
  gm_pad_choir: 2,
  gm_pad_metallic: 1.03,
  gm_pad_halo: 0.61,
  gm_pad_sweep: 1.03,
  gm_string_ensemble_1: 1.03,
  gm_synth_strings_2: 0.59,
  gm_choir_aahs: 1.29,
  gm_voice_oohs: 0.58,
  gm_synth_choir: 0.61,
  pulse: 1.11,
  sawtooth: 0.83,
  sine: 0.57,
  supersaw: 0.99,
  triangle: 0.7,
  gm_electric_bass_finger: 1.04,
  gm_electric_bass_pick: 1.06,
  gm_slap_bass_1: 1.06,
  gm_slap_bass_2: 0.95,
  gm_fretless_bass: 0.58,
  gm_acoustic_bass: 0.7,
  gm_synth_bass_1: 0.59,
  gm_synth_bass_2: 0.53,
};

// The highest MIDI note a soundfont plays: above it, its samples won't
// decode or are silent. Higher notes drop by octaves.
export const SOUND_TOPS: Readonly<Record<string, number>> = {
  gm_vibraphone: 85,
  gm_clarinet: 85,
  gm_baritone_sax: 90,
  gm_acoustic_guitar_nylon: 92,
  gm_fx_crystal: 94,
};

// Soundfonts that are another's recording under a different name (they
// render identically), so a song doesn't play one sound in two parts.
export const SAME_SOUND: Readonly<Record<string, string>> = {
  gm_pad_metallic: 'gm_string_ensemble_1',
  gm_pad_sweep: 'gm_string_ensemble_1',
  gm_string_ensemble_2: 'gm_string_ensemble_1',
  gm_fx_atmosphere: 'gm_pad_warm',
  gm_synth_choir: 'gm_pad_halo',
};

// General MIDI programs (counting from 0) for the MIDI export. Strudel's
// synths take the nearest General MIDI sound: the synth leads, and an
// ocarina's near-pure tone for the sine.
export const GM_PROGRAMS: Readonly<Record<string, number>> = {
  gm_piano: 0,
  gm_epiano1: 4,
  gm_epiano2: 5,
  gm_clavinet: 7,
  gm_celesta: 8,
  gm_glockenspiel: 9,
  gm_music_box: 10,
  gm_vibraphone: 11,
  gm_marimba: 12,
  gm_xylophone: 13,
  gm_drawbar_organ: 16,
  gm_percussive_organ: 17,
  gm_rock_organ: 18,
  gm_reed_organ: 20,
  gm_harmonica: 22,
  gm_acoustic_guitar_nylon: 24,
  gm_electric_guitar_jazz: 26,
  gm_electric_guitar_clean: 27,
  gm_electric_guitar_muted: 28,
  gm_overdriven_guitar: 29,
  gm_acoustic_bass: 32,
  gm_electric_bass_finger: 33,
  gm_electric_bass_pick: 34,
  gm_fretless_bass: 35,
  gm_slap_bass_1: 36,
  gm_slap_bass_2: 37,
  gm_synth_bass_1: 38,
  gm_synth_bass_2: 39,
  gm_string_ensemble_1: 48,
  gm_synth_strings_2: 51,
  gm_choir_aahs: 52,
  gm_voice_oohs: 53,
  gm_synth_choir: 54,
  gm_trumpet: 56,
  gm_trombone: 57,
  gm_muted_trumpet: 59,
  gm_french_horn: 60,
  gm_brass_section: 61,
  gm_synth_brass_1: 62,
  gm_synth_brass_2: 63,
  gm_soprano_sax: 64,
  gm_alto_sax: 65,
  gm_tenor_sax: 66,
  gm_baritone_sax: 67,
  gm_clarinet: 71,
  gm_flute: 73,
  sine: 79,
  pulse: 80,
  sawtooth: 81,
  supersaw: 81,
  triangle: 82,
  gm_pad_warm: 89,
  gm_pad_poly: 90,
  gm_pad_choir: 91,
  gm_pad_metallic: 93,
  gm_pad_halo: 94,
  gm_pad_sweep: 95,
  gm_fx_crystal: 98,
  gm_fx_atmosphere: 99,
  gm_kalimba: 108,
};
