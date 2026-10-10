// Music theory constants, the city pop style, and tonalities. Subsystem
// constants (drums, bass, melody, form, harmony figures, titles) live in
// their own modules. Which sounds play which part is in instruments.ts.

import type {
  BassFeel,
  ChordClass,
  ChordDef,
  DrumEntry,
  DrumFeel,
  FinaleStyle,
  IntroTexture,
  LiftStyle,
  Mode,
  PaletteName,
  PreFlavour,
  PreFlavourDef,
  Range,
  Rhythm,
  SectionType,
  Tonality,
  Turnaround,
  Weighted,
} from './types';

// =====================================================================
// Theory
// =====================================================================

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Modes and chord-scales, named the way Strudel's scale() wants them.
export const MODES: Readonly<Record<string, readonly number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'melodic:minor': [0, 2, 3, 5, 7, 9, 11],
  'harmonic:minor': [0, 2, 3, 5, 7, 8, 11],
  'lydian:dominant': [0, 2, 4, 6, 7, 9, 10],
  'phrygian:dominant': [0, 1, 4, 5, 7, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
};

// Rotations of the major scale, in order.
export const CHURCH_MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];

// Major tonics spelled with flats (C counts as a flat key, so its
// chromatic chords read Bb and Eb rather than A# and D#). Other modes
// spell like their relative major.
export const FLAT_TONICS: ReadonlySet<number> = new Set([0, 5, 10, 3, 8, 1, 6]); // C F Bb Eb Ab Db Gb

// Spelling in a key: chromatic notes are flattened degrees, except the
// raised fourth. Index: semitones above the tonic -> letters above it.
export const DEGREE_OF_OFFSET = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
export const RARE_SPELLINGS = ['Cb', 'Fb', 'E#', 'B#'];

// Chord symbols from Strudel's default (iReal) voicing dictionary.
export const CHORDS: Readonly<Record<string, ChordDef>> = {
  '': { cls: 'maj', tones: [0, 4, 7] },
  add9: { cls: 'maj', tones: [0, 4, 7, 14] },
  '^7': { cls: 'maj', tones: [0, 4, 7, 11] },
  '^9': { cls: 'maj', tones: [0, 4, 7, 11, 14] },
  69: { cls: 'maj', tones: [0, 4, 7, 9, 14] },
  '^7#11': { cls: 'maj', tones: [0, 4, 7, 11, 18] },
  '^9#11': { cls: 'maj', tones: [0, 4, 7, 11, 14, 18] },
  m: { cls: 'min', tones: [0, 3, 7] },
  m7: { cls: 'min', tones: [0, 3, 7, 10] },
  madd9: { cls: 'min', tones: [0, 3, 7, 14] },
  m6: { cls: 'min', tones: [0, 3, 7, 9] },
  m69: { cls: 'min', tones: [0, 3, 7, 9, 14] },
  'm^7': { cls: 'min', tones: [0, 3, 7, 11] },
  'm^9': { cls: 'min', tones: [0, 3, 7, 11, 14] },
  m9: { cls: 'min', tones: [0, 3, 7, 10, 14] },
  m11: { cls: 'min', tones: [0, 3, 7, 10, 14, 17] },
  7: { cls: 'dom', tones: [0, 4, 7, 10] },
  9: { cls: 'dom', tones: [0, 4, 7, 10, 14] },
  13: { cls: 'dom', tones: [0, 4, 7, 10, 14, 21] },
  '7sus': { cls: 'dom', tones: [0, 5, 7, 10] },
  '9sus': { cls: 'dom', tones: [0, 5, 7, 10, 14] },
  '7b9sus': { cls: 'dom', tones: [0, 5, 7, 10, 13] }, // the phrygian chord
  '7b9': { cls: 'dom', tones: [0, 4, 7, 10, 13] },
  '13b9': { cls: 'dom', tones: [0, 4, 7, 10, 13, 21] },
  '7#9': { cls: 'dom', tones: [0, 4, 7, 10, 15] },
  '7alt': { cls: 'dom', tones: [0, 4, 10, 13, 15, 20] },
  '13#11': { cls: 'dom', tones: [0, 4, 7, 10, 18, 21] },
  m7b5: { cls: 'hdim', tones: [0, 3, 6, 10] },
  o7: { cls: 'dim', tones: [0, 3, 6, 9] },
  sus: { cls: 'sus', tones: [0, 5, 7] },
  5: { cls: 'power', tones: [0, 7] },
};

// The chord-scale a symbol implies regardless of context.
export const SYMBOL_SCALES: Readonly<Record<string, string>> = {
  '^7#11': 'lydian',
  '^9#11': 'lydian',
  '7b9': 'phrygian:dominant',
  '13b9': 'phrygian:dominant',
  '7alt': 'altered',
  '13#11': 'lydian:dominant',
  m7b5: 'locrian',
  o7: 'locrian',
  m6: 'dorian',
  m69: 'dorian',
  'm^7': 'melodic:minor', // the jazz minor tonic
  'm^9': 'melodic:minor',
  '7sus': 'mixolydian',
  '9sus': 'mixolydian',
  '7b9sus': 'phrygian',
  sus: 'mixolydian',
  '7#9': 'mixolydian',
};

// A chromatic chord's usual chord-scale, by family. A dominant
// resolving to a minor chord takes DOM_TO_MINOR_SCALE instead.
export const FAMILY_SCALES: Readonly<Record<ChordClass, string>> = {
  maj: 'lydian',
  min: 'dorian',
  dom: 'mixolydian',
  hdim: 'locrian',
  dim: 'locrian',
  sus: 'mixolydian',
  power: 'mixolydian',
};
export const DOM_TO_MINOR_SCALE = 'phrygian:dominant';

export const NUMERALS: Readonly<Record<string, number>> = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };

// =====================================================================
// Harmony
// =====================================================================

// Colours for each chord family; majLydian is a major chord away from
// the tonic, domToMinor a dominant resolving to a minor chord (or a
// minor key's V), susToMinor a minor key's sus V.
export const PALETTE: Readonly<Record<PaletteName, Weighted<string>>> = {
  maj: [['^9', 3], ['^7', 1], ['69', 1]],
  majLydian: [['^9#11', 2], ['^7#11', 2], ['^9', 1]],
  min: [['m9', 3], ['m11', 2], ['m7', 1]],
  dom: [['13', 3], ['9', 2], ['9sus', 1]],
  domToMinor: [['7alt', 3], ['7b9', 1], ['13b9', 1]],
  // A minor key's suspended V: phrygian, or the plain 9sus.
  susToMinor: [['7b9sus', 2], ['9sus', 1]],
  hdim: [['m7b5', 1]],
  dim: [['o7', 1]],
  sus: [['9sus', 2], ['13', 1]],
  power: [['9sus', 1]],
  // A minor key's tonic: aeolian m9, dorian m6/9, or the melodic-minor m(maj9).
  minTonic: [['m9', 3], ['m69', 2], ['m^9', 1], ['m11', 1]],
  // A mixolydian key's tonic: a dominant that doesn't resolve, sometimes the funk #9.
  domTonic: [['13', 3], ['9', 2], ['7#9', 1]],
};

// How the finale plays the last chord.
export const FINALE_STYLES: Weighted<FinaleStyle> = [['cascade', 3], ['hits', 2], ['slide', 2], ['run', 2]];

// How each lift is played (Lift); never the same way twice running.
export const LIFT_STYLES: Weighted<LiftStyle> = [['horns', 3], ['stops', 2], ['drop', 2], ['run', 2], ['drums', 1]];

// Turnarounds into a lifted major key, relative to that key. Each
// tonality has its own (TONALITIES); these are the major key's.
export const LIFT_TURNAROUNDS: Readonly<Record<string, Turnaround>> = {
  'bVI-V': { weight: 2, bars: [['bVI:^7#11|^9#11'], ['V:7alt|13b9']] },
  'ii-V': { weight: 3, bars: [['ii:m9|m11'], ['V:7alt|13']] },
  tritone: { weight: 2, bars: [['ii:m9|m11'], ['bII:13#11']] },
  backdoor: { weight: 2, bars: [['iv:m9|m7'], ['bVII:13|9']] },
  'V of V': { weight: 2, bars: [['II:9|13'], ['V:7alt|13b9']] },
  turnaround: {
    weight: 2,
    bars: [
      ['iii:m7', 'VI:7alt'],
      ['ii:m9', 'V:13|7alt'],
    ],
  },
  // The ii-V a half step up, slipping down into the real one.
  'side-slip': {
    weight: 1,
    bars: [
      ['#ii:m9', '#V:13'],
      ['ii:m9', 'V:7alt'],
    ],
  },
  'sus pedal': { weight: 2, bars: [['V:9sus'], ['V:7alt|13b9']] },
  'truck driver': { weight: 1, bars: [['V:7alt|13']] },
  'long way': { weight: 1, bars: [['iii:m7|m9'], ['VI:7alt|13b9'], ['ii:m9|m11'], ['V:7alt|13']] },
  // Coltrane changes: major thirds round to the new tonic.
  coltrane: {
    weight: 1,
    bars: [
      ['ii:m7', 'bIII:7'],
      ['bVI:^7', 'VII:7'],
      ['III:^7', 'V:7'],
    ],
  },
};

// =====================================================================
// Style: city pop
// =====================================================================

export const STYLE = {
  reharm: 0.5,
  adventurous: 0.8,
  tempo: [92, 124] as Range, // BPM: city pop's easy end to its brisker one
  swing: [0.06, 0.12] as Range,
  approachChromatic: 0.75,
  // How an intro gets its harmony: the chorus's first four bars (with
  // the hook as a teaser), planing add9 chords, or an intro template.
  introHarmony: [
    ['chorus', 3],
    ['planing', 2],
    ['template', 6],
  ] as Weighted<'chorus' | 'planing' | 'template'>,
  introMelodyChance: 0.5,
  // How the drums start the opening vamp: in after two bars, kick and
  // hats alone for two bars, or the whole kit from the first.
  vampEntry: [
    ['late', 5],
    ['light', 3],
    ['full', 2],
  ] as Weighted<DrumEntry>,
  // Drums and bass per section: the drum feels it may take, how likely
  // it starts with a crash and ends with a fill, and the bass feels it
  // may take (none for a drum break, which has no bass line).
  rhythm: {
    vamp: { drums: { feels: ['funk'], crash: 0, fill: 1 }, bass: ['funk', 'funk', 'disco'] },
    verse: {
      drums: { feels: ['funk', 'funk', 'halfTime', 'disco'], crash: 0.3, fill: 0.7 },
      bass: ['funk', 'funk', 'drive', 'halfTime'],
    },
    chorus: {
      drums: { feels: ['disco', 'disco', 'funk'], crash: 1, fill: 0.9 },
      bass: ['disco', 'disco', 'funk', 'drive'],
    },
    bridge: {
      drums: { feels: ['halfTime', 'halfTime', 'bossa', 'introRide'], crash: 0.3, fill: 0.5 },
      bass: ['halfTime', 'halfTime', 'pedal', 'bossa'],
    },
    solo: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 0.9 }, bass: ['funk', 'drive', 'disco'] },
    solo2: {
      drums: { feels: ['bossa', 'bossa', 'halfTime'], crash: 0.7, fill: 0.8 },
      bass: ['bossa', 'bossa', 'halfTime'],
    },
    riff: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 }, bass: ['funk', 'disco'] },
    breakdown: { drums: { feels: ['claps', 'halfTime'], crash: 0, fill: 1 }, bass: ['disco', 'halfTime', 'pedal'] },
    lift: { drums: { feels: ['build'], crash: 1, fill: 0 }, bass: ['disco', 'drive'] },
    outro: { drums: { feels: ['introRide', 'halfTime'], crash: 1, fill: 0 }, bass: ['pedal'] },
    drumBreak: { drums: { feels: ['break'], crash: 0, fill: 1 }, bass: [] },
  } as Partial<Record<SectionType, Rhythm>>,
  // Bass feels that sit with a quieter drum feel.
  bassWith: {
    bossa: ['bossa', 'halfTime', 'pedal'],
    halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
    introRide: ['pedal', 'halfTime', 'funk'],
  } as Partial<Record<DrumFeel, BassFeel[]>>,
  // The trade outro's backing, pared back under the soloists: ride or
  // half-time drums and a bass to match.
  tradeOutro: {
    bass: ['halfTime', 'pedal', 'bossa'],
    drums: { feels: ['introRide', 'halfTime', 'bossa'], crash: 0, fill: 1 },
  } as Rhythm,
  // Intro arrangements, with the bass feels each may take and their drums.
  introTextures: {
    pads: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } },
    keys: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } },
    groove: { bass: ['funk', 'funk', 'disco'], drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 } },
    bassFirst: { bass: ['funk', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
    arp: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
    drumsFirst: { bass: ['funk', 'disco'], drums: { feels: ['break', 'funk', 'disco'], crash: 0, fill: 1 } },
    fanfare: { bass: ['drive', 'disco'], drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 } },
  } as Record<IntroTexture, Rhythm>,
  comp: { main: '~ [~ x] ~ [~ ~ x ~]', chorus: '[~ x]*4', bossa: '[x ~ ~ x] [~ ~ x ~] [~ x ~ ~] [x ~ ~ ~]' },
};

// =====================================================================
// Pre-chorus flavours
// =====================================================================

// Each song's pre-chorus takes one flavour: its progressions (fitted to
// end on their cadence into the chorus), melody, drums and bass. The
// arranger gives each its own texture.
export const PRE_FLAVOURS: Readonly<Record<PreFlavour, PreFlavourDef>> = {
  // A stepwise rise to the dominant, the band opening up.
  climb: {
    weight: 3,
    melody: 'climb',
    drums: { feels: ['build', 'funk', 'disco'], crash: 0.2, fill: 1 },
    bass: ['drive', 'funk', 'disco'],
  },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: {
    weight: 2,
    melody: 'hold',
    drums: { feels: ['halfTime', 'introRide'], crash: 0, fill: 1 },
    bass: ['pedal', 'halfTime'],
  },
  // The drums drop out and come back halfway.
  drop: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 },
    bass: ['halfTime', 'pedal', 'funk'],
  },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0.5, fill: 1 },
    bass: ['drive', 'disco'],
  },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: {
    weight: 2,
    melody: 'climb',
    drums: { feels: ['halfTime', 'build'], crash: 0.3, fill: 1 },
    bass: ['halfTime', 'drive'],
  },
};

// =====================================================================
// Tonalities: the modes a song can be in
// =====================================================================

// Each mode's progressions, as roman numerals relative to its tonic, one
// token per bar; "[ii7 V7]" puts two chords in a bar. A template's
// length is its natural phrase; it is repeated to fill the section.
// Chord-scales follow from the key: a diatonic chord takes its mode in
// the key (so iv in a minor key plays dorian, bVI lydian), a chromatic
// one its family's usual scale.
export const TONALITIES: Readonly<Record<Mode, Tonality>> = {
  // Jazz-funk in a major key: ii-V-I, secondary dominants, borrowed iv.
  major: {
    weight: 4,
    tonics: [5, 10, 3, 0, 7, 2],
    tonic: 'maj',
    reharm: 1,
    finale: [['^9', 'lydian']],
    approach: [['ii:m9|m11'], ['V:13|7alt|9sus']],
    templates: {
      vamp: ['ii7 V7', 'ii7 [ii7 V7]', 'vi7 II7'],
      verse: [
        'vi7 II7 vi7 II7 IVmaj7 [iii7 bIII7] ii7 V7',
        'ii7 V7 iii7 VI7 ii7 V7 Imaj7 Imaj7',
        'Imaj7 vi7 ii7 V7 iii7 VI7 ii7 V7',
        'IVmaj7 iii7 ii7 Imaj7 IVmaj7 iii7 ii7 V7sus',
        'vi7 vi7 II7 II7 IVmaj7 iii7 ii7 V7',
      ],
      chorus: [
        'IVmaj7 III7 vi7 [v7 I7] IVmaj7 III7 [vi7 II7] [ii7 V7]',
        'Imaj7 VI7 ii7 V7 iii7 VI7 ii7 V7',
        'IVmaj7 V7 iii7 vi7 ii7 V7 Imaj7 [ii7 V7]',
        'vi7 ii7 V7 Imaj7 IVmaj7 ii7 V7sus V7',
      ],
      tag: ['bVImaj7 V7sus', 'bVImaj7 bVII7'],
      bridge: ['IVmaj7 bVIImaj7 ii7 V7 Imaj7 IVmaj7', 'ii7 V7 Imaj7 vi7 ii7 V7', 'Imaj7 vi7 IVmaj7 V7 iii7 vi7'],
      riff: ['ii7 V7', 'vi7 II7'],
      intro: [
        'Imaj7 IVmaj7',
        'ii7 V7',
        'Imaj7 bVIImaj7',
        'Imaj7 vi7 ii7 V7',
        'iii7 VI7 ii7 V7',
        'V7sus V7sus V7sus V7',
        'bVImaj7 bVII7 Imaj7 [ii7 V7]',
        'IVmaj7 iii7 ii7 V7sus',
      ],
    },
    pre: {
      climb: [
        'ii7 iii7 IVmaj7 V7sus',
        'ii7 iii7 iv7 #iv° V7sus V7',
        'IVmaj7 #iv° V7sus V7',
        'ii7 [iii7 IVmaj7] V7sus V7',
      ],
      pedal: ['V7sus V7sus V7sus V7', 'IVmaj7 IVmaj7 V7sus V7sus', 'ii7 ii7 V7sus V7sus', 'V7sus V7'],
      drop: ['IVmaj7 iii7 ii7 V7sus', 'vi7 IVmaj7 ii7 V7sus', 'IVmaj7 V7 iii7 vi7 ii7 V7sus'],
      stops: ['IVmaj7 V7 iii7 vi7', 'IVmaj7 V7 [iii7 VI7] [ii7 V7sus]', 'ii7 V7 iii7 VI7 ii7 V7sus'],
      borrowed: [
        'IVmaj7 iv7 iii7 VI7 ii7 V7sus',
        'bVImaj7 bVII7 IVmaj7 V7sus',
        'IVmaj7 iv7 iii7 bIIImaj7 ii7 V7sus',
        'ii7 bIIImaj7 IVmaj7 bVImaj7 bVII7 V7sus',
      ],
    },
    bridgeKeys: [
      { offset: 5, weight: 3, adventurous: false },
      { offset: 7, weight: 2, adventurous: false },
      { offset: 3, weight: 3, adventurous: true },
      { offset: 8, weight: 3, adventurous: true },
      { offset: 2, weight: 1, adventurous: true },
    ],
    solo: {
      pair: [['ii:m9|m11|m7'], ['V:13|9']],
      shapes: [['cycle', 3], ['home', 2], ['vamp', 1]],
    },
    turnarounds: LIFT_TURNAROUNDS,
  },

  // Jazz minor (Autumn Leaves, Blue Bossa, Summertime): the minor ii-V-i
  // of a half-diminished ii and an altered or b9 dominant, the aeolian
  // cycle iv-bVII-bIII-bVI, the Andalusian fall i-bVII-bVI-V, and the
  // dorian IV7 of minor funk. The tonic is a m9, m6/9 or m(maj9).
  minor: {
    weight: 1,
    tonics: [2, 7, 0, 5, 9, 4], // D G C F A E
    tonic: 'min',
    tonicPalette: 'minTonic',
    reharm: 0.9,
    finale: [['m69', 'dorian'], ['m^9', 'melodic:minor']],
    approach: [['ii:m7b5'], ['V:7alt|7b9|13b9']],
    templates: {
      vamp: ['i7 IV7', 'iiø V7', 'i7 bVII7', 'i7 [iv7 bVII7]'],
      verse: [
        'i7 i7 iv7 iv7 iiø V7 i7 V7',
        'i7 iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7',
        'i7 IV7 i7 IV7 bVImaj7 bVII7 iiø V7',
        'i7 bVImaj7 iiø V7 i7 bVImaj7 iiø V7',
        'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 i7',
      ],
      chorus: [
        'bVImaj7 bVII7 i7 i7 bVImaj7 bVII7 iiø V7',
        'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 [iiø V7]',
        'i7 bIIImaj7 bVImaj7 bII7 i7 bIIImaj7 iiø V7',
        'i7 i7 bVII7 bVII7 bVImaj7 V7 i7 V7',
      ],
      tag: ['bVImaj7 V7', 'bII7 V7'],
      bridge: ['iv7 bVII7 bIIImaj7 bVImaj7 iiø V7', 'i7 iv7 bVII7 bIIImaj7 iiø V7', 'bVImaj7 bVII7 i7 i7 iiø V7'],
      riff: ['i7 IV7', 'i7 bVII7'],
      intro: [
        'i7 iv7',
        'iiø V7',
        'i7 IV7',
        'i7 bVII7 bVImaj7 V7',
        'i7 bVImaj7 iiø V7',
        'V7sus V7sus V7sus V7',
        'bVImaj7 bVII7 i7 [iiø V7]',
      ],
    },
    pre: {
      climb: ['iiø bIIImaj7 iv7 V7', 'bIIImaj7 iv7 #iv° V7', 'iv7 #iv° V7sus V7', 'iiø [bIIImaj7 iv7] V7sus V7'],
      pedal: ['V7sus V7sus V7sus V7', 'iv7 iv7 V7sus V7', 'bVImaj7 bVImaj7 V7sus V7sus', 'V7sus V7'],
      drop: ['bVImaj7 bVII7 iiø V7', 'iv7 bVImaj7 iiø V7sus', 'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7'],
      stops: ['iv7 bVII7 bVImaj7 V7', 'bVImaj7 bVII7 [i7 iv7] [iiø V7]', 'iiø V7 i7 iv7 bII7 V7'],
      borrowed: ['IV7 iv7 bIImaj7 V7', 'bVImaj7 bIImaj7 V7sus V7', 'i7 IV7 bVImaj7 bIImaj7 V7sus V7', 'bIImaj7 V7'],
    },
    bridgeKeys: [
      { offset: 3, weight: 3, adventurous: false },
      { offset: 8, weight: 3, adventurous: false },
      { offset: 5, weight: 2, adventurous: false, mode: 'minor' },
      { offset: 10, weight: 1, adventurous: true },
      { offset: 1, weight: 1, adventurous: true },
    ],
    solo: {
      pair: [['ii:m7b5'], ['V:7alt|7b9|13b9']],
      shapes: [['cycle', 3], ['home', 2], ['vamp', 1]],
    },
    turnarounds: {
      'ii-V': { weight: 3, bars: [['ii:m7b5'], ['V:7alt|7b9']] },
      'bVI-V': { weight: 2, bars: [['bVI:^7#11|^9#11'], ['V:7alt|13b9']] },
      tritone: { weight: 2, bars: [['ii:m7b5'], ['bII:13#11']] },
      Neapolitan: { weight: 1, bars: [['bII:^7#11|^9#11'], ['V:7alt|7b9']] },
      Andalusian: { weight: 2, bars: [['bVII:13|9'], ['bVI:^7#11|^9'], ['V:7alt|7b9']] },
      'sus pedal': { weight: 2, bars: [['V:9sus'], ['V:7alt|13b9']] },
      'truck driver': { weight: 1, bars: [['V:7alt|7b9']] },
      'long way': {
        weight: 1,
        bars: [
          ['iv:m9|m7', 'bVII:13'],
          ['bIII:^9', 'bVI:^7#11'],
          ['ii:m7b5', 'V:7alt'],
        ],
      },
    },
  },

  // Modal jazz-funk (So What, Chameleon, Oye Como Va): long stretches of
  // a dorian m7, its bright IV7, and the bIII and bVII of the parent
  // major. Few cadences, so less reharmonisation; it comes home by the
  // plagal IV7-i, not V-i.
  dorian: {
    weight: 3,
    tonics: [2, 7, 0, 9, 4, 5], // D G C A E F
    tonic: 'min',
    reharm: 0.5,
    finale: [['m11', 'dorian'], ['m69', 'dorian']],
    approach: [['bVII:^9|69'], ['IV:13|9']],
    templates: {
      vamp: ['i7 IV7', 'i7 i7', 'i7 bVIImaj7', 'i7 [v7 IV7]'],
      verse: [
        'i7 i7 IV7 IV7 i7 i7 IV7 IV7',
        'i7 IV7 v7 i7 bIIImaj7 IV7 i7 IV7',
        'i7 bVIImaj7 i7 bVIImaj7 bIIImaj7 IV7 v7 i7',
        'i7 i7 i7 i7 bIIImaj7 bIIImaj7 IV7 IV7',
      ],
      chorus: [
        'bIIImaj7 IV7 i7 i7 bIIImaj7 IV7 v7 i7',
        'bVIImaj7 bIIImaj7 IV7 i7 bVIImaj7 bIIImaj7 IV7 [v7 IV7]',
        'i7 bVIImaj7 bVImaj7 bVIImaj7 i7 bVIImaj7 IV7 IV7',
        'IV7 IV7 i7 i7 bVIImaj7 bIIImaj7 IV7 IV7',
      ],
      tag: ['bVIImaj7 IV7', 'bIIImaj7 IV7'],
      riff: ['i7 IV7', 'i7 bVIImaj7'],
      intro: [
        'i7 IV7',
        'i7 i7 i7 IV7',
        'i7 bIIImaj7 IV7 i7',
        'i7 bVIImaj7',
        'IV7 IV7 i7 i7',
      ],
    },
    pre: {
      climb: ['i7 ii7 bIIImaj7 IV7', 'ii7 bIIImaj7 IV7 v7', 'bIIImaj7 IV7', 'i7 ii7 bIIImaj7 IV7 v7 IV7'],
      pedal: ['IV7sus IV7sus IV7sus IV7', 'bVIImaj7 bVIImaj7 IV7sus IV7', 'IV7sus IV7'],
      drop: ['bVIImaj7 bIIImaj7 IV7 IV7', 'v7 bVIImaj7 bIIImaj7 IV7', 'i7 bVIImaj7 bVImaj7 bVIImaj7 IV7 IV7'],
      stops: ['bIIImaj7 IV7 v7 IV7', 'bVIImaj7 IV7', 'i7 bIIImaj7 IV7 v7 bVIImaj7 IV7'],
      borrowed: [
        'bVImaj7 bVIImaj7 IV7 IV7',
        'bIImaj7 bIImaj7 bVIImaj7 IV7',
        'bVImaj7 bIImaj7',
        'i7 bVImaj7 bVIImaj7 bIImaj7 bVImaj7 IV7',
      ],
    },
    bridgeKeys: [
      { offset: 10, weight: 3, adventurous: false },
      { offset: 3, weight: 2, adventurous: false },
      { offset: 5, weight: 2, adventurous: true },
      { offset: 8, weight: 2, adventurous: true },
      { offset: 1, weight: 1, adventurous: true, mode: 'minor' },
    ],
    solo: {
      pair: [['i:m11|m9'], ['IV:13|9']],
      steps: [[1, 3], [3, 2], [-2, 1]],
      shapes: [['cycle', 1], ['home', 1], ['vamp', 3]],
    },
    turnarounds: {
      plagal: { weight: 3, bars: [['bVII:^9|69'], ['IV:13|9']] },
      'ii-V': { weight: 2, bars: [['ii:m9|m11'], ['V:7alt|7b9']] },
      'side-slip': { weight: 2, bars: [['#i:m11|m9'], ['#i:m11|m9']] },
      aeolian: { weight: 2, bars: [['bVI:^9|^7#11'], ['bVII:^9|69']] },
      'sus pedal': { weight: 1, bars: [['IV:9sus'], ['IV:13|9']] },
      'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
    },
  },

  // Soul-jazz and funk on a dominant tonic (Cissy Strut, Watermelon Man):
  // I7 against bVII and IV, blues changes, and the funk 7#9. It comes
  // home from bVII, the mixolydian cadence.
  mixolydian: {
    weight: 2,
    tonics: [7, 2, 0, 5, 9, 10], // G D C F A Bb
    tonic: 'dom',
    tonicPalette: 'domTonic',
    reharm: 0.6,
    finale: [['13', 'mixolydian'], ['9sus', 'mixolydian']],
    approach: [['IV:^9|69'], ['bVII:^9|^7#11|69']],
    templates: {
      vamp: ['I7 bVIImaj7', 'I7 IV7', 'I7 I7', 'I7 [v7 I7]'],
      verse: [
        'I7 IV7 I7 I7 IV7 IV7 I7 [ii7 V7]',
        'I7 bVIImaj7 I7 bVIImaj7 IVmaj7 IVmaj7 v7 bVIImaj7',
        'I7 I7 bVIImaj7 IVmaj7 I7 I7 bVIImaj7 IVmaj7',
        'I7 v7 bVIImaj7 IVmaj7 I7 v7 bVIImaj7 I7',
      ],
      chorus: [
        'IVmaj7 bVIImaj7 I7 I7 IVmaj7 bVIImaj7 v7 I7',
        'I7 bIIImaj7 IVmaj7 I7 I7 bIIImaj7 IVmaj7 bVIImaj7',
        'IV7 IV7 I7 I7 V7 IV7 I7 V7',
        'bVIImaj7 IVmaj7 I7 I7 bVIImaj7 IVmaj7 I7 [v7 I7]',
      ],
      tag: ['bVIImaj7 IVmaj7', 'bIIImaj7 IV7'],
      riff: ['I7 bVIImaj7', 'I7 IV7'],
      intro: [
        'I7 I7',
        'I7 bVIImaj7',
        'I7 IV7',
        'bVIImaj7 IVmaj7 I7 I7',
        'v7 bVIImaj7 IVmaj7 I7',
      ],
    },
    pre: {
      climb: ['IVmaj7 v7 vi7 bVIImaj7', 'IVmaj7 #iv° v7 bVIImaj7', 'ii7 [iiiø IVmaj7] v7 bVIImaj7', 'v7 bVIImaj7'],
      pedal: ['V7sus V7sus V7sus V7', 'IVmaj7 IVmaj7 bVIImaj7 bVIImaj7', 'V7sus V7'],
      drop: ['IVmaj7 v7 bVIImaj7 bVIImaj7', 'vi7 IVmaj7 bVIImaj7 V7sus', 'IVmaj7 I7 v7 vi7 bVIImaj7 IVmaj7'],
      stops: [
        'IVmaj7 bVIImaj7 v7 IVmaj7',
        'IV7 [bIIImaj7 IV7] bVIImaj7 V7sus',
        'v7 bVIImaj7 IVmaj7 I7 bVIImaj7 IVmaj7',
      ],
      borrowed: [
        'bVImaj7 bVIImaj7 IVmaj7 IVmaj7',
        'IVmaj7 iv7 bIIImaj7 bVIImaj7',
        'bIIImaj7 bVImaj7 bVIImaj7 V7sus',
        'IVmaj7 iv7 bIIImaj7 bVImaj7 bVIImaj7 V7sus',
      ],
    },
    bridgeKeys: [
      { offset: 5, weight: 3, adventurous: false },
      { offset: 10, weight: 2, adventurous: false },
      { offset: 3, weight: 2, adventurous: true },
      { offset: 8, weight: 2, adventurous: true },
      { offset: 9, weight: 1, adventurous: true, mode: 'minor' },
    ],
    solo: {
      pair: [['I:13|9|7#9'], ['bVII:^9|69']],
      shapes: [['cycle', 1], ['home', 1], ['vamp', 3]],
    },
    turnarounds: {
      mixolydian: { weight: 3, bars: [['IV:^9|69'], ['bVII:^9|^7#11']] },
      'ii-V': LIFT_TURNAROUNDS['ii-V'],
      backdoor: LIFT_TURNAROUNDS.backdoor,
      tritone: LIFT_TURNAROUNDS.tritone,
      'sus pedal': LIFT_TURNAROUNDS['sus pedal'],
      'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
    },
  },
};
