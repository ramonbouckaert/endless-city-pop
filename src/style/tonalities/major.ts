import type { Tonality, Turnaround } from './types';

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

// Jazz-funk in a major key: ii-V-I, secondary dominants, borrowed iv.
export const MAJOR: Tonality = {
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
    shapes: [
      ['cycle', 3],
      ['home', 2],
      ['vamp', 1],
    ],
  },
  turnarounds: LIFT_TURNAROUNDS,
};
