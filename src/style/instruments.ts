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

// Each part's default sound: the one its levels in style/mix.ts were
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
// from `pool`, none twice; the lead and soloists never one that swells
// in too slowly to carry a melody (`slow`: over 100 ms to half its level on the
// soundfont, which CC73 can't shorten). Their levels in style/mix.ts are
// set for the alto sax (level 1).
export const VOICES: {
  readonly pool: readonly Program[];
  readonly slow: ReadonlySet<Program>;
  readonly soloists: number;
} = {
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
    GM.rockOrgan,
    GM.reedOrgan,
    GM.glockenspiel,
    GM.vibraphone,
    // Synth leads
    GM.squareLead,
    GM.sawtoothLead,
    GM.calliopeLead,
    GM.bassAndLead,
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
  slow: new Set([GM.warmPad, GM.sweepPad, GM.metallicPad, GM.haloPad, GM.synthBrass2]),
  soloists: 4,
};

// The melody voices that scoop into long notes when they lead (SCOOP).
export const SCOOPERS: ReadonlySet<Program> = new Set([
  GM.sopranoSax,
  GM.altoSax,
  GM.tenorSax,
  GM.squareLead,
  GM.sawtoothLead,
  GM.calliopeLead,
  GM.bassAndLead,
]);

// The melody voices that play chords as soloists (SOLO.moves' stabs).
export const CHORDAL: ReadonlySet<Program> = new Set([
  GM.acousticGrandPiano,
  GM.drawbarOrgan,
  GM.rockOrgan,
  GM.reedOrgan,
  GM.vibraphone,
  GM.electricGuitarJazz,
  GM.overdrivenGuitar,
]);

// A solo or bridge may hand its keys part to another sound for its
// length (J-Cycle's B section, on clavinet): this often, and to one of these.
export const SWAP = { chance: 0.3, keys: [GM.clavinet, GM.rockOrgan] as readonly Program[] };

// A walking bass line's sound, whatever the song's bass: the upright.
export const WALKING_BASS: Program = GM.acousticBass;

// ---- Effects ----------------------------------------------------------

// The riser into a pre-chorus's chorus or a lift's: a reverse cymbal.
export const RISER: Program = GM.reverseCymbal;
// How long its sample swells before it stops (on the app's soundfont, at
// any tempo): it starts this long before the downbeat, to peak on it.
export const RISER_SECONDS = 1.4;

// ---- Drum kits --------------------------------------------------------

/** A drum kit: its program on the drum channel, and its name in the soundfont. */
export interface Kit {
  program: number;
  name: string;
}

// GeneralUser GS's drum kits that suit the style (not its brushes,
// orchestral or effects kits), mostly the standard ones.
export const KITS: Weighted<Kit> = [
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
// loudness over its own on GeneralUser GS, playing the same phrase at full
// velocity, as a song's MIDI plays it (K-weighted RMS of a dry offline
// render; basses two octaves down, in short notes), kept within 0.5 to 2. Measured by `npm run levels`; run it again after
// changing the soundfont or the instruments a song picks from.
// Only ratios between sounds that share a part matter.
export const SOUND_LEVELS: Readonly<Partial<Record<Program, number>>> = {
  [GM.acousticGrandPiano]: 1.37,
  [GM.electricPiano1]: 1,
  [GM.electricPiano2]: 1.71,
  [GM.clavinet]: 1.41,
  [GM.celesta]: 0.99,
  [GM.glockenspiel]: 1.48,
  [GM.musicBox]: 2, // measured 2.10
  [GM.vibraphone]: 0.72,
  [GM.marimba]: 1.24,
  [GM.xylophone]: 2, // measured 2.15
  [GM.drawbarOrgan]: 1.14,
  [GM.percussiveOrgan]: 1.09,
  [GM.rockOrgan]: 1.09,
  [GM.reedOrgan]: 0.99,
  [GM.harmonica]: 1.29,
  [GM.acousticGuitarNylon]: 1.27,
  [GM.electricGuitarJazz]: 1.3,
  [GM.electricGuitarClean]: 1.18,
  [GM.electricGuitarMuted]: 2, // measured 2.51
  [GM.overdrivenGuitar]: 0.84,
  [GM.acousticBass]: 0.92,
  [GM.electricBassFinger]: 1.15,
  [GM.electricBassPick]: 1.32,
  [GM.fretlessBass]: 0.97,
  [GM.slapBass1]: 1.29,
  [GM.slapBass2]: 1.45,
  [GM.synthBass1]: 1.16,
  [GM.synthBass2]: 1.15,
  [GM.stringEnsemble1]: 1.11,
  [GM.stringEnsemble2]: 1.22,
  [GM.synthStrings1]: 1.02,
  [GM.synthStrings2]: 1.82,
  [GM.choirAahs]: 1.2,
  [GM.voiceOohs]: 0.93,
  [GM.synthVoice]: 1.44,
  [GM.trumpet]: 0.96,
  [GM.trombone]: 1.04,
  [GM.mutedTrumpet]: 1.44,
  [GM.frenchHorn]: 0.69,
  [GM.brassSection]: 1.01,
  [GM.synthBrass1]: 1.11,
  [GM.synthBrass2]: 0.99,
  [GM.sopranoSax]: 0.99,
  [GM.altoSax]: 1,
  [GM.tenorSax]: 0.81,
  [GM.baritoneSax]: 0.9,
  [GM.clarinet]: 0.77,
  [GM.flute]: 0.87,
  [GM.squareLead]: 1.06,
  [GM.sawtoothLead]: 0.92,
  [GM.calliopeLead]: 0.51,
  [GM.bassAndLead]: 0.8,
  [GM.warmPad]: 1.55,
  [GM.polysynthPad]: 1.24,
  [GM.choirPad]: 1.11,
  [GM.metallicPad]: 1.17,
  [GM.haloPad]: 1.16,
  [GM.sweepPad]: 1.14,
  [GM.crystal]: 1.07,
  [GM.atmosphere]: 0.84,
  [GM.kalimba]: 1.29,
};
