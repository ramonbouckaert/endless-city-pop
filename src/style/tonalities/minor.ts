import type { TonalityDef } from './types';

// Bright funky minor (Just the Two of Us, Plastic Love, minor city pop):
// the royal road bVImaj7-bVII7-v7-i7, bVI-bVII-i, the dorian IV7 of
// minor funk, and iv7-bVII7 leading home in place of a dark V. The
// iiø-V7alt of jazz minor turns up, but rarely. The tonic is a m9, m11
// or m6/9.
export const MINOR: TonalityDef = {
  weight: 1,
  tonics: [2, 7, 0, 5, 9, 4], // D G C F A E
  tonic: 'min',
  tonicPalette: 'minTonic',
  reharm: 0.6,
  finale: [
    ['m11', 'dorian'],
    ['m69', 'dorian'],
  ],
  approach: [['iv:m9|m11'], ['bVII:13|9']],
  templates: {
    vamp: [
      'i7 IV7',
      'i7 bVII7',
      'i7 [iv7 bVII7]',
      'iv7 bVII7',
      'i7 v7',
      'bVImaj7 bVII7',
      'i7 IV7sus',
      'i7 [bVImaj7 bVII7]',
    ],
    verse: [
      'i7 IV7 i7 IV7 bVImaj7 bVII7 i7 i7',
      'i7 iv7 bVII7 bIIImaj7 bVImaj7 bVII7 i7 i7',
      'i7 bVII7 bVImaj7 bVII7 i7 bVII7 iv7 bVII7',
      'bVImaj7 bVII7 v7 i7 bVImaj7 bVII7 i7 i7',
      'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 i7',
    ],
    chorus: [
      'bVImaj7 bVII7 i7 i7 bVImaj7 bVII7 i7 i7',
      'bVImaj7 bVII7 v7 i7 bVImaj7 bVII7 iv7 bVII7',
      'iv7 bVII7 bIIImaj7 bVImaj7 iv7 bVII7 i7 i7',
      'bVImaj7 V7 i7 [bvii7 bIII7]',
      'i7 IV7 i7 IV7 bVImaj7 bVII7 bVImaj7 bVII7',
      'iv7 v7 bVImaj7 bVII7 iv7 v7 i7 i7',
    ],
    tag: [
      'bVImaj7 bVII7',
      'iv7 bVII7',
      'bVImaj7 V7sus',
      'iv7 v7',
      'bIIImaj7 bVII7',
      'IV7 bVII7',
      'iv7 bVII7sus',
      'bVImaj7 bVII7 v7 i7',
    ],
    bridge: [
      'iv7 bVII7 bIIImaj7 bVImaj7 ii7 V7sus',
      'i7 iv7 bVII7 bIIImaj7 bVImaj7 bVII7',
      'bVImaj7 bVII7 i7 i7 iv7 bVII7',
      'bIIImaj7 bVImaj7 iv7 bVII7 i7 i7',
    ],
    riff: [
      'i7 IV7',
      'i7 bVII7',
      'i7 v7',
      'bVImaj7 bVII7',
      'i7 i7 iv7 bVII7',
      'iv7 bVII7 i7 i7',
      'i7 IV7 bVImaj7 bVII7',
      'i7 [iv7 v7]',
    ],
    intro: [
      'i7 iv7',
      'i7 IV7',
      'i7 bVII7',
      'iv7 bVII7',
      'bVImaj7 bVII7 i7 i7',
      'bVImaj7 bVII7 v7 i7',
      'iv7 iv7 bVII7sus bVII7',
      'i7 IV7 bVImaj7 bVII7',
    ],
  },
  pre: {
    climb: [
      'iv7 v7 bVImaj7 bVII7',
      'bIIImaj7 iv7 v7 bVII7',
      'iv7 [v7 bVImaj7] bVII7sus bVII7',
      'ii7 bIIImaj7 iv7 bVII7',
    ],
    pedal: [
      'bVII7sus bVII7sus bVII7sus bVII7',
      'iv7 iv7 bVII7sus bVII7',
      'bVImaj7 bVImaj7 bVII7sus bVII7',
      'V7sus V7sus',
    ],
    drop: ['bVImaj7 bVII7 iv7 bVII7', 'iv7 bVImaj7 ii7 V7sus', 'iv7 bVII7 bIIImaj7 bVImaj7 iv7 bVII7'],
    stops: ['iv7 bVII7 bVImaj7 bVII7', 'bVImaj7 bVII7 [i7 iv7] [v7 bVII7]', 'iv7 bVII7 i7 IV7 bVImaj7 bVII7'],
    borrowed: [
      'IV7 iv7 bVImaj7 bVII7',
      'bVImaj7 IV7 bVII7sus bVII7',
      'i7 IV7 bIIImaj7 IVmaj7 bVII7sus bVII7',
      'IV7 bVII7',
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
