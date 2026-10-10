import type { Tonality } from './types';
import { LIFT_TURNAROUNDS } from './major';

// Soul-jazz and funk on a dominant tonic (Cissy Strut, Watermelon Man):
// I7 against bVII and IV, blues changes, and the funk 7#9. It comes
// home from bVII, the mixolydian cadence.
export const MIXOLYDIAN: Tonality = {
  weight: 2,
  tonics: [7, 2, 0, 5, 9, 10], // G D C F A Bb
  tonic: 'dom',
  tonicPalette: 'domTonic',
  reharm: 0.6,
  finale: [
    ['13', 'mixolydian'],
    ['9sus', 'mixolydian'],
  ],
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
    intro: ['I7 I7', 'I7 bVIImaj7', 'I7 IV7', 'bVIImaj7 IVmaj7 I7 I7', 'v7 bVIImaj7 IVmaj7 I7'],
  },
  pre: {
    climb: ['IVmaj7 v7 vi7 bVIImaj7', 'IVmaj7 #iv° v7 bVIImaj7', 'ii7 [iiiø IVmaj7] v7 bVIImaj7', 'v7 bVIImaj7'],
    pedal: ['V7sus V7sus V7sus V7', 'IVmaj7 IVmaj7 bVIImaj7 bVIImaj7', 'V7sus V7'],
    drop: ['IVmaj7 v7 bVIImaj7 bVIImaj7', 'vi7 IVmaj7 bVIImaj7 V7sus', 'IVmaj7 I7 v7 vi7 bVIImaj7 IVmaj7'],
    stops: ['IVmaj7 bVIImaj7 v7 IVmaj7', 'IV7 [bIIImaj7 IV7] bVIImaj7 V7sus', 'v7 bVIImaj7 IVmaj7 I7 bVIImaj7 IVmaj7'],
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
    shapes: [
      ['cycle', 1],
      ['home', 1],
      ['vamp', 3],
    ],
  },
  turnarounds: {
    mixolydian: { weight: 3, bars: [['IV:^9|69'], ['bVII:^9|^7#11']] },
    'ii-V': LIFT_TURNAROUNDS['ii-V'],
    backdoor: LIFT_TURNAROUNDS.backdoor,
    tritone: LIFT_TURNAROUNDS.tritone,
    'sus pedal': LIFT_TURNAROUNDS['sus pedal'],
    'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
  },
};
