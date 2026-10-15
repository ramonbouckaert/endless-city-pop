import type { TonalityDef } from './types';

// Bright funky minor (Just the Two of Us, Plastic Love, minor city pop):
// the royal road bVImaj7-bVII7-v7-i7, bVI-bVII-i, the dorian IV7 of
// minor funk, and iv7-bVII7 leading home in place of a dark V; the
// iv7-bVII7-v7-i7 loop (ii-V-iii-vi of the relative major: ANRI's, Plastic
// Love's), the line cliché down from the tonic (i, i/7, i/b7, i/6) and
// ANRI's chromatic bass down from it, maj7s planing down by semitones
// (Flyday Chinatown's, and its dorian riff), a sus4 tonic, a round trip
// through the relative major and its borrowed iv6 (Summer Suspicion's),
// Tokai's chain of ii-Vs (to bII, then V/iv), the tritone sub bII7 and a
// picardy I closing a chorus (Plastic Love's), I7sus, V+ as the dominant
// and an altered V held as a pedal. The iiø-V7alt of jazz minor turns
// up, but rarely. The tonic is a m9, m11 or m6/9.
export const MINOR: TonalityDef = {
  tonics: [2, 7, 0, 5, 9, 4, 6, 11], // D G C F A E F# B
  tonic: 'min',
  tonicPalette: 'minTonic',
  reharm: 0.6,
  finale: [
    ['m11', 'dorian'],
    ['m69', 'dorian'],
  ],
  approach: [['iv:m9|m11'], ['bVII:13|9']],
  templates: {
    // A verse's two-chord vamp (the approach home follows).
    // Chords held two bars, never coming home.
    verseLoop: ['iv7 iv7 i7 i7', 'bVImaj7 bVImaj7 i7 i7'],
    verseVamp: ['iv7 v7', 'bVImaj7 bVII7', 'i7 IV7', 'iv7 bVII7', 'i7 i/b7'],
    vamp: [
      'iv7 bVII7 v7 i7',
      'i i/b7',
      'i7 IV7',
      'i7 bVII7',
      'i7 [iv7 bVII7]',
      'iv7 bVII7',
      'i7 v7',
      'bVImaj7 bVII7',
      'i7 IV7sus',
      'i7 [bVImaj7 bVII7]',
      'i7 bVImaj7',
      'i7 i7 bVImaj7 bVImaj7',
      'i isus',
    ],
    verse: [
      'i i/7 i/b7 i/6 bVImaj7 bVII7 i7 i7',
      'iv7 bVII7 v7 i7 iv7 bVII7 v7 i7',
      'i i/7 i/b7 i/6 iv7 bVII7 bIIImaj7 V+',
      'i7 i7 iv7 iv7 bVII7 bVII7 I7sus I7sus',
      'i7 IV7 i7 IV7 bVImaj7 bVII7 i7 i7',
      'i7 iv7 bVII7 bIIImaj7 bVImaj7 bVII7 i7 i7',
      'i7 bVII7 bVImaj7 bVII7 i7 bVII7 iv7 bVII7',
      'bVImaj7 bVII7 v7 i7 bVImaj7 bVII7 i7 i7',
      'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 i7',
      'i7 I+ iv7 bVII7 bVImaj7 bVII7 i7 i7',
      // The tonic rocking to its sus4 (Summer Suspicion's).
      'i [i isus] I7sus bVImaj7 [bVImaj7 V+] i [i isus] bVImaj7',
      // The tritone sub into the tonic, and the dorian IV7 (Plastic Love's A′).
      'iv7 bII7 i7 [IV7 bIII6] iv7 bVII7 i7 i7',
    ],
    chorus: [
      'iv7 bVII7 v7 i7 iv7 bVII7 v7 i7',
      'i i/7 i/b7 i/6 iv7 bVII7 bIIImaj7 V+',
      'bVImaj7 bVII7 v7 i7 iv7 bVII7 I7sus I7sus',
      'bVImaj7 bVII7 i7 i7 bVImaj7 bVII7 i7 i7',
      'bVImaj7 bVII7 v7 i7 bVImaj7 bVII7 iv7 bVII7',
      'iv7 bVII7 bIIImaj7 bVImaj7 iv7 bVII7 i7 i7',
      'bVImaj7 V7 i7 [bvii7 bIII7]',
      'i7 IV7 i7 IV7 bVImaj7 bVII7 bVImaj7 bVII7',
      'iv7 v7 bVImaj7 bVII7 iv7 v7 i7 i7',
      // The bass falling by semitones from the tonic (ANRI's post-chorus).
      'i V7/3 bIII/5 IV7/3 bVImaj7 bIII/3 iv7 bVII7sus',
      // A chain of ii-Vs: to bII, to iv, and a tritone slide back round (Tokai's tune).
      'bVImaj7 V7 i7 [biii7 bVI7] bIImaj7 I7#5 iv7 [III7 bIII7sus]',
      // The line cliché, a ii-V-I in the relative major, and iiø-V7 home (Summer Suspicion's).
      'i i/7 i/b7 IV7/3 iv7 bVII7 bIIImaj7 [iiø V7]',
      // bVI-bVII-I7sus, and a picardy I to close (Plastic Love's).
      'bVImaj7 [bVII6 I7sus] bVImaj7 [bVII6 I7sus] [iiø V7] i7 [bVImaj7 bVII7] [v7 I]',
    ],
    tag: [
      'iv7 bVII7 v7 i7',
      'iv7 I7sus',
      'bVImaj7 bVII7',
      'iv7 bVII7',
      'bVImaj7 V7sus',
      'iv7 v7',
      'bIIImaj7 bVII7',
      'IV7 bVII7',
      'iv7 bVII7sus',
      'bVImaj7 bVII7 v7 i7',
      // The relative major's borrowed iv6 into it (Summer Suspicion's).
      'bvi6 bIIImaj7',
    ],
    bridge: [
      'iv7 bVII7 bIIImaj7 bVImaj7 ii7 V7sus',
      'i7 iv7 bVII7 bIIImaj7 bVImaj7 bVII7',
      'bVImaj7 bVII7 i7 i7 iv7 bVII7',
      'bIIImaj7 bVImaj7 iv7 bVII7 i7 i7',
      'IV7sus V7sus IV7sus V7sus bvi7 bII7',
      // Ten bars, for a long bridge: round the circle through the relative major, iiø-V home, and the
      // line down from the tonic onto bVI-bVII.
      'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 i/b7 bVImaj7 bVII7sus',
      // Ten bars: a ii-V into the neapolitan, held, then climbing iv-v-bVI to bVII (Tokai's chain).
      'i7 [iv7 bVII7] bIIImaj7 [biii7 bVI7] bIImaj7 bIImaj7 iv7 [v7 bVImaj7] bVII7sus bVII7',
      // Ten bars: the bass falling by semitones from the tonic (ANRI's), then bVI onto an altered V.
      'i V7/3 bIII/5 IV7/3 bVImaj7 bIII/3 iv7 bVII7 bVImaj7 V7alt',
    ],
    riff: [
      'iv7 bVII7 v7 i7',
      'i i/b7 i/6 bVImaj7',
      'i7 IV7',
      'i7 bVII7',
      'i7 v7',
      'bVImaj7 bVII7',
      'i7 i7 iv7 bVII7',
      'iv7 bVII7 i7 i7',
      'i7 IV7 bVImaj7 bVII7',
      'i7 [iv7 v7]',
      'i7 i7 bVImaj7 bVImaj7',
      // The dorian riff (Flyday Chinatown's).
      'i7 [v7 IV7]',
    ],
    intro: [
      'iv7 bVII7 v7 i7',
      'i i/7 i/b7 i/6',
      'i7 iv7',
      'i7 IV7',
      'i7 bVII7',
      'iv7 bVII7',
      'bVImaj7 bVII7 i7 i7',
      'bVImaj7 bVII7 v7 i7',
      'iv7 iv7 bVII7sus bVII7',
      'i7 IV7 bVImaj7 bVII7',
      'i isus i7 isus',
      // Maj7s planing down by semitones (Flyday Chinatown's).
      '[bVImaj7 V7] [bVmaj7 iv7] [bVII7sus bVII7] V7',
      'bVImaj7 iv7 V7alt V7alt',
      'i7 [v7 IV7]',
    ],
    // Cadences home looped as an outro: bVI-V+-i (Summer Suspicion's), bVI-bVII-i.
    outro: ['bVImaj7 bVImaj7 i7 i7 bVImaj7 V+ i7 i7', 'bVImaj7 bVII7 i7 i7'],
  },
  pre: {
    climb: [
      'iv7 v7 bVImaj7 V+',
      'iv7 v7 bVImaj7 bVII7',
      'bIIImaj7 iv7 v7 bVII7',
      'iv7 [v7 bVImaj7] bVII7sus bVII7',
      'ii7 bIIImaj7 iv7 bVII7',
      // Round the circle of fifths, a secondary dominant and a passing diminished (Flyday Chinatown's).
      'i7 iv7 bVII7 bIIImaj7 [II7sus V7] [I7sus bVII7] #vi° V7',
      // Up through V/iv to iv, the tonic, and V+ (Summer Suspicion's).
      'bVII6 [bVImaj7 bVII7sus] [bVImaj7 v7] I7 iv7 V7 [i i/7] V+',
    ],
    pedal: [
      'iv7 iv7 I7sus I7sus',
      'bVII7sus bVII7sus bVII7sus bVII7',
      'iv7 iv7 bVII7sus bVII7',
      'bVImaj7 bVImaj7 bVII7sus bVII7',
      'V7sus V7sus',
      'iv7 iv7 V7alt V7alt',
    ],
    drop: [
      'i i/7 i/b7 i/6',
      'i i/7 i/b7 i/6 bVImaj7 V7sus',
      'bVImaj7 bVII7 iv7 bVII7',
      'iv7 bVImaj7 ii7 V7sus',
      'iv7 bVII7 bIIImaj7 bVImaj7 iv7 bVII7',
      'i V7/3 bIII/5 IV7/3 bVImaj7 bIII/3 iv7 bVII7sus',
      '[bVImaj7 V7] [bVmaj7 iv7] [bVII7sus bVII7] V7',
    ],
    stops: ['iv7 bVII7 bVImaj7 bVII7', 'bVImaj7 bVII7 [i7 iv7] [v7 bVII7]', 'iv7 bVII7 i7 IV7 bVImaj7 bVII7'],
    borrowed: [
      'IV7 iv7 bVImaj7 bVII7',
      'bVImaj7 IV7 bVII7sus bVII7',
      'i7 IV7 bIIImaj7 IVmaj7 bVII7sus bVII7',
      'IV7 bVII7',
      // The tritone sub into the tonic (Plastic Love's B).
      'bVImaj7 bII7 i7 IV7 iv7 bVII7 i7 [i7 bIII6]',
    ],
  },
  bridgeKeys: [
    { offset: 3, weight: 3, adventurous: false },
    { offset: 8, weight: 3, adventurous: false },
    { offset: 5, weight: 2, adventurous: false, mode: 'minor' },
    { offset: 10, weight: 1, adventurous: true },
    { offset: 2, weight: 1, adventurous: true, mode: 'dorian' },
  ],
  solo: {
    pair: [['iv:m9|m11'], ['bVII:13|9']],
    shapes: [
      ['cycle', 2],
      ['home', 2],
      ['loop', 2],
      ['outside', 1],
      ['sidestep', 1],
    ],
  },
  turnarounds: {
    'bVI-bVII': { weight: 3, bars: [['bVI:^9|^7#11'], ['bVII:13|9']] },
    'iv-bVII': { weight: 3, bars: [['iv:m9|m11'], ['bVII:13|9']] },
    'royal road': { weight: 2, bars: [['bVI:^9|^7#11'], ['bVII:13|9'], ['v:m7', 'bVII:9sus']] },
    'ii-V': { weight: 1, bars: [['ii:m7b5'], ['V:7alt|7b9']] },
    tritone: { weight: 1, bars: [['ii:m9|m7'], ['bII:13#11']] },
    'sus pedal': { weight: 2, bars: [['iv:m9'], ['bVII:9sus']] },
    'truck driver': { weight: 1, bars: [['bVII:13|9']] },
    pivot: { weight: 1.5, bars: [['bVII:7sus|9sus']] },
    'long way': {
      weight: 1,
      bars: [
        ['iv:m9|m7', 'bVII:13'],
        ['bIII:^9', 'bVI:^7#11'],
        ['iv:m9', 'bVII:9sus'],
      ],
    },
  },
};
