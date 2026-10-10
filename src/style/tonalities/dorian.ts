import type { TonalityDef } from './types';

// Modal jazz-funk (So What, Chameleon, Oye Como Va): long stretches of
// a dorian m7, its bright IV7, and the bIII and bVII of the parent
// major. Few cadences, so less reharmonisation; it comes home by the
// plagal IV7-i, not V-i.
export const DORIAN: TonalityDef = {
  weight: 3,
  tonics: [2, 7, 0, 9, 4, 5], // D G C A E F
  tonic: 'min',
  reharm: 0.5,
  finale: [
    ['m11', 'dorian'],
    ['m69', 'dorian'],
  ],
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
    intro: ['i7 IV7', 'i7 i7 i7 IV7', 'i7 bIIImaj7 IV7 i7', 'i7 bVIImaj7', 'IV7 IV7 i7 i7'],
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
    steps: [
      [1, 3],
      [3, 2],
      [-2, 1],
    ],
    shapes: [
      ['cycle', 1],
      ['home', 1],
      ['vamp', 3],
    ],
  },
  turnarounds: {
    plagal: { weight: 3, bars: [['bVII:^9|69'], ['IV:13|9']] },
    'ii-V': { weight: 2, bars: [['ii:m9|m11'], ['V:7alt|7b9']] },
    'side-slip': { weight: 2, bars: [['#i:m11|m9'], ['#i:m11|m9']] },
    aeolian: { weight: 2, bars: [['bVI:^9|^7#11'], ['bVII:^9|69']] },
    'sus pedal': { weight: 1, bars: [['IV:9sus'], ['IV:13|9']] },
    'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
  },
};
