// Which instruments play which part: the band's defaults, the ones each
// song picks from for a part, the melody voices' pool, the drum kits, and
// how loud each instrument plays. Instruments are General MIDI programs
// (GM, lib/general-midi.ts); the app plays them from GeneralUser GS,
// trimmed to SOUNDFONT_PROGRAMS and SOUNDFONT_KITS by `npm run soundfont`.

import { GM, type Program } from '../lib/general-midi';
import type { Weighted } from '../lib/random';

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
// ---- The band ---------------------------------------------------------

// Each part's default sound: the one its levels in score/mix.ts were
// set for. A picked part plays louder or quieter by its sound's level
// over this one's.
export const BAND: Readonly<Record<BandPart, Program>> = {
  keys: GM.electricPiano1,
  clav: GM.clavinet,
  guitar: GM.electricGuitarMuted,
  pad: GM.voiceOohs,
  strings: GM.stringEnsemble1,
  choir: GM.choirAahs,
  answer: GM.trumpet,
  bell: GM.vibraphone,
  stabs: GM.brassSection,
  hornDouble: GM.altoSax,
  bass: GM.electricBassFinger,
};

// The sounds each song picks from for a part, in the order parts are
// picked (their order here). A part never takes a sound another part already plays (melody
// voices first), where its list allows.
export const PICKS: Readonly<Record<PickedPart, readonly Program[]>> = {
  // Electric pianos and clavinet; acoustic piano and organs.
  keys: [GM.electricPiano1, GM.electricPiano2, GM.clavinet, GM.acousticGrandPiano, GM.percussiveOrgan, GM.rockOrgan],
  // Funk scratching on any electric; nylon for a bossa feel.
  guitar: [GM.electricGuitarMuted, GM.electricGuitarJazz, GM.electricGuitarClean, GM.acousticGuitarNylon],
  pad: [GM.warmPad, GM.polysynthPad, GM.choirPad, GM.metallicPad, GM.haloPad, GM.sweepPad],
  strings: [GM.stringEnsemble1, GM.stringEnsemble2, GM.synthStrings1, GM.synthStrings2],
  choir: [GM.choirAahs, GM.voiceOohs, GM.synthVoice],
  // The phrases answering the hook: brass, or a flute.
  answer: [GM.trumpet, GM.mutedTrumpet, GM.trombone, GM.flute],
  // The intro teaser and bridge melody, high up: mallets and bells.
  bell: [GM.vibraphone, GM.marimba, GM.xylophone, GM.celesta, GM.musicBox, GM.kalimba, GM.glockenspiel],
  stabs: [GM.brassSection, GM.synthBrass1, GM.synthBrass2],
  hornDouble: [GM.altoSax, GM.tenorSax, GM.baritoneSax, GM.trombone],
  // Electric, upright and synth basses.
  bass: [
    GM.electricBassPick,
    GM.electricBassFinger,
    GM.slapBass1,
    GM.slapBass2,
    GM.fretlessBass,
    GM.acousticBass,
    GM.synthBass1,
    GM.synthBass2,
  ],
};

// ---- Melody voices ----------------------------------------------------

// Each song picks its lead, the lead's octave double and its soloists
// from `pool`, none twice. Their levels in score/mix.ts are set for the
// alto sax (level 1).
export const VOICES: { readonly pool: readonly Program[]; readonly soloists: number } = {
  pool: [
    // Reeds and brass
    GM.sopranoSax,
    GM.altoSax,
    GM.tenorSax,
    GM.clarinet,
    GM.flute,
    GM.harmonica,
    GM.trumpet,
    GM.mutedTrumpet,
    GM.trombone,
    GM.frenchHorn,
    GM.brassSection,
    GM.synthBrass1,
    GM.synthBrass2,
    // Guitars, keys and mallets
    GM.electricGuitarJazz,
    GM.overdrivenGuitar,
    GM.acousticGrandPiano,
    GM.drawbarOrgan,
    GM.reedOrgan,
    GM.glockenspiel,
    GM.vibraphone,
    // Pads, effects and voices
    GM.crystal,
    GM.atmosphere,
    GM.warmPad,
    GM.polysynthPad,
    GM.choirPad,
    GM.metallicPad,
    GM.haloPad,
    GM.sweepPad,
    GM.voiceOohs,
  ],
  soloists: 4,
};

// ---- Effects ----------------------------------------------------------

// The riser into a pre-chorus's chorus or a lift's: a reverse cymbal.
export const RISER: Program = GM.reverseCymbal;

// ---- Drum kits --------------------------------------------------------

/** A drum kit: its program on the drum channel, and its name in the soundfont. */
export interface KitDef {
  program: number;
  name: string;
}

// GeneralUser GS's drum kits that suit the style (not its brushes,
// orchestral or effects kits), mostly the standard ones.
export const KITS: Weighted<KitDef> = [
  [{ program: 0, name: 'Standard 1' }, 4],
  [{ program: 1, name: 'Standard 2' }, 1],
  [{ program: 2, name: 'Standard 3' }, 1],
  [{ program: 8, name: 'Room' }, 2],
  [{ program: 16, name: 'Power' }, 1],
  [{ program: 24, name: 'Electronic' }, 1],
  [{ program: 25, name: '808/909' }, 1],
  [{ program: 26, name: 'Dance' }, 1],
  [{ program: 32, name: 'Jazz' }, 1],
];

// ---- Everything a song can play -----------------------------------------

/**
 * Every instrument a song can play, and every drum kit: what
 * scripts/build-soundfont.ts keeps of GeneralUser GS for the app.
 */
export const SOUNDFONT_PROGRAMS: ReadonlySet<Program> = new Set([
  ...Object.values(BAND),
  ...Object.values(PICKS).flat(),
  ...VOICES.pool,
  RISER,
]);
export const SOUNDFONT_KITS: ReadonlySet<number> = new Set(KITS.map(([kit]) => kit.program));

// ---- Facts about sounds -----------------------------------------------

// How loud to play each instrument, so any can take a part: the alto sax's
// loudness over its own on GeneralUser GS, playing the same phrase at the
// same velocity (RMS of a dry offline render, basses two octaves down),
// kept within 0.5 to 2. Measured by `npm run levels`; run it again after
// changing the soundfont or the instruments a song picks from.
// Only ratios between sounds that share a part matter.
export const SOUND_LEVELS: Readonly<Partial<Record<Program, number>>> = {
  [GM.acousticGrandPiano]: 1.07,
  [GM.electricPiano1]: 0.9,
  [GM.electricPiano2]: 1.32,
  [GM.clavinet]: 1.34,
  [GM.celesta]: 0.86,
  [GM.glockenspiel]: 1.62,
  [GM.musicBox]: 1.85,
  [GM.vibraphone]: 0.65,
  [GM.marimba]: 1.02,
  [GM.xylophone]: 2, // measured 2.00
  [GM.drawbarOrgan]: 0.97,
  [GM.percussiveOrgan]: 0.98,
  [GM.rockOrgan]: 0.97,
  [GM.reedOrgan]: 0.92,
  [GM.harmonica]: 1.22,
  [GM.acousticGuitarNylon]: 1.13,
  [GM.electricGuitarJazz]: 1.17,
  [GM.electricGuitarClean]: 1.3,
  [GM.electricGuitarMuted]: 2, // measured 2.61
  [GM.overdrivenGuitar]: 0.83,
  [GM.acousticBass]: 0.67,
  [GM.electricBassFinger]: 0.7,
  [GM.electricBassPick]: 0.89,
  [GM.fretlessBass]: 0.5, // measured 0.48
  [GM.slapBass1]: 0.76,
  [GM.slapBass2]: 1.42,
  [GM.synthBass1]: 0.62,
  [GM.synthBass2]: 0.72,
  [GM.stringEnsemble1]: 0.96,
  [GM.stringEnsemble2]: 1.05,
  [GM.synthStrings1]: 0.93,
  [GM.synthStrings2]: 1.66,
  [GM.choirAahs]: 1.12,
  [GM.voiceOohs]: 0.82,
  [GM.synthVoice]: 1.31,
  [GM.trumpet]: 1.01,
  [GM.trombone]: 0.94,
  [GM.mutedTrumpet]: 1.74,
  [GM.frenchHorn]: 0.52,
  [GM.brassSection]: 1.03,
  [GM.synthBrass1]: 1.05,
  [GM.synthBrass2]: 0.93,
  [GM.sopranoSax]: 0.91,
  [GM.altoSax]: 1,
  [GM.tenorSax]: 0.99,
  [GM.baritoneSax]: 0.97,
  [GM.clarinet]: 0.74,
  [GM.flute]: 0.79,
  [GM.warmPad]: 1.42,
  [GM.polysynthPad]: 1.21,
  [GM.choirPad]: 1.08,
  [GM.metallicPad]: 1.22,
  [GM.haloPad]: 1.07,
  [GM.sweepPad]: 1.06,
  [GM.crystal]: 1,
  [GM.atmosphere]: 0.76,
  [GM.kalimba]: 1.14,
};
