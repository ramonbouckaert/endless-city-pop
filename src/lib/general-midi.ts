// General MIDI: its 128 instruments by program number (counting from 0),
// and the percussion keys the band's drums play on the drum channel. Every
// sound in a song is one of these, from the style's tables to the MIDI
// file the app plays.

export const GM = {
  // Piano
  acousticGrandPiano: 0,
  brightAcousticPiano: 1,
  electricGrandPiano: 2,
  honkyTonkPiano: 3,
  electricPiano1: 4,
  electricPiano2: 5,
  harpsichord: 6,
  clavinet: 7,
  // Chromatic percussion
  celesta: 8,
  glockenspiel: 9,
  musicBox: 10,
  vibraphone: 11,
  marimba: 12,
  xylophone: 13,
  tubularBells: 14,
  dulcimer: 15,
  // Organ
  drawbarOrgan: 16,
  percussiveOrgan: 17,
  rockOrgan: 18,
  churchOrgan: 19,
  reedOrgan: 20,
  accordion: 21,
  harmonica: 22,
  tangoAccordion: 23,
  // Guitar
  acousticGuitarNylon: 24,
  acousticGuitarSteel: 25,
  electricGuitarJazz: 26,
  electricGuitarClean: 27,
  electricGuitarMuted: 28,
  overdrivenGuitar: 29,
  distortionGuitar: 30,
  guitarHarmonics: 31,
  // Bass
  acousticBass: 32,
  electricBassFinger: 33,
  electricBassPick: 34,
  fretlessBass: 35,
  slapBass1: 36,
  slapBass2: 37,
  synthBass1: 38,
  synthBass2: 39,
  // Strings
  violin: 40,
  viola: 41,
  cello: 42,
  contrabass: 43,
  tremoloStrings: 44,
  pizzicatoStrings: 45,
  orchestralHarp: 46,
  timpani: 47,
  // Ensemble
  stringEnsemble1: 48,
  stringEnsemble2: 49,
  synthStrings1: 50,
  synthStrings2: 51,
  choirAahs: 52,
  voiceOohs: 53,
  synthVoice: 54,
  orchestraHit: 55,
  // Brass
  trumpet: 56,
  trombone: 57,
  tuba: 58,
  mutedTrumpet: 59,
  frenchHorn: 60,
  brassSection: 61,
  synthBrass1: 62,
  synthBrass2: 63,
  // Reed
  sopranoSax: 64,
  altoSax: 65,
  tenorSax: 66,
  baritoneSax: 67,
  oboe: 68,
  englishHorn: 69,
  bassoon: 70,
  clarinet: 71,
  // Pipe
  piccolo: 72,
  flute: 73,
  recorder: 74,
  panFlute: 75,
  blownBottle: 76,
  shakuhachi: 77,
  whistle: 78,
  ocarina: 79,
  // Synth lead
  squareLead: 80,
  sawtoothLead: 81,
  calliopeLead: 82,
  chiffLead: 83,
  charangLead: 84,
  voiceLead: 85,
  fifthsLead: 86,
  bassAndLead: 87,
  // Synth pad
  newAgePad: 88,
  warmPad: 89,
  polysynthPad: 90,
  choirPad: 91,
  bowedPad: 92,
  metallicPad: 93,
  haloPad: 94,
  sweepPad: 95,
  // Synth effects
  rain: 96,
  soundtrack: 97,
  crystal: 98,
  atmosphere: 99,
  brightness: 100,
  goblins: 101,
  echoes: 102,
  sciFi: 103,
  // Ethnic
  sitar: 104,
  banjo: 105,
  shamisen: 106,
  koto: 107,
  kalimba: 108,
  bagpipe: 109,
  fiddle: 110,
  shanai: 111,
  // Percussive
  tinkleBell: 112,
  agogo: 113,
  steelDrums: 114,
  woodblock: 115,
  taikoDrum: 116,
  melodicTom: 117,
  synthDrum: 118,
  reverseCymbal: 119,
  // Sound effects
  guitarFretNoise: 120,
  breathNoise: 121,
  seashore: 122,
  birdTweet: 123,
  telephoneRing: 124,
  helicopter: 125,
  applause: 126,
  gunshot: 127,
} as const;

/** A General MIDI instrument, by its program number. */
export type Program = (typeof GM)[keyof typeof GM];

const KEYS = new Map<number, string>(Object.entries(GM).map(([key, program]) => [program, key]));

/** An instrument's key in GM: "electricPiano1". */
export const programKey = (program: Program): string => KEYS.get(program) ?? `program${program}`;

/** An instrument's name, for a MIDI track: "Electric Piano 1". */
export const programName = (program: Program): string =>
  programKey(program)
    .replace(/(?<=[a-z])(?=[A-Z0-9])/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** The percussion keys the band plays (General MIDI, but the shaker: GS and GM2's). */
export const PERCUSSION = {
  kick: 36,
  sideStick: 37,
  snare: 38,
  clap: 39,
  closedHat: 42,
  lowTom: 45,
  openHat: 46,
  midTom: 47,
  crash: 49,
  highTom: 50,
  ride: 51,
  tambourine: 54,
  cowbell: 56,
  shaker: 82,
} as const;

/** A drum, by its key on the drum channel. */
export type Percussion = (typeof PERCUSSION)[keyof typeof PERCUSSION];
