import type { TonalityDef } from './types';

// Jazz minor (Autumn Leaves, Blue Bossa, Summertime): the minor ii-V-i
// of a half-diminished ii and an altered or b9 dominant, the aeolian
// cycle iv-bVII-bIII-bVI, the Andalusian fall i-bVII-bVI-V, and the
// dorian IV7 of minor funk. The tonic is a m9, m6/9 or m(maj9).
export const MINOR: TonalityDef = {
  weight: 1,
  tonics: [2, 7, 0, 5, 9, 4], // D G C F A E
  tonic: 'min',
  tonicPalette: 'minTonic',
  reharm: 0.9,
  finale: [
    ['m69', 'dorian'],
    ['m^9', 'melodic:minor'],
  ],
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
    shapes: [
      ['cycle', 3],
      ['home', 2],
      ['vamp', 1],
    ],
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
};
