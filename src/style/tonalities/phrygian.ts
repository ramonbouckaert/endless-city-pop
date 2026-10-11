import type { TonalityDef } from './types';

// Phrygian fusion (J-Cycle, Casiopea's and T-Square's darker vamps): a
// minor tonic with a sus colour (m7 add11, no 9th: it would be off the
// key) rocking against the bIImaj7 a semitone up, with the bVI, iv and
// bvii of the parent major. It cadences by the phrygian bII-i, never a
// dominant (its v is diminished), and it is rarely reharmonised.
export const PHRYGIAN: TonalityDef = {
  tonics: [4, 9, 11, 2, 6], // E A B D F#
  tonic: 'min',
  tonicPalette: 'minPhrygianTonic',
  reharm: 0.3,
  voicings: { comp: { close: 1, quartal: 2 }, sustain: { close: 1, spread: 1 } },
  finale: [
    ['m7add11', 'phrygian'],
    ['m7', 'phrygian'],
  ],
  approach: [['bVII:m9|m7'], ['bII:^7#11|^9#11']],
  // A bare major bIII would take a #11 off the key, so it is always a bIII7.
  templates: {
    // A verse's two-chord vamp (the approach home follows).
    verseVamp: ['i7 bIImaj7', 'bIImaj7 i7', 'iv7 bIImaj7'],
    vamp: [
      'i7 bIImaj7',
      'i7 i7 bIImaj7 bIImaj7',
      'i7 [bIImaj7 i7]',
      'i7 bvii7',
      'i7 bVImaj7',
      'i7 iv7',
      'i7 [bvii7 bIImaj7]',
      'i7 i7 bVImaj7 bIImaj7',
    ],
    verse: [
      'i7 bIImaj7 i7 bIImaj7 bVImaj7 bvii7 i7 bIImaj7',
      'i7 i7 bIImaj7 bIImaj7 iv7 iv7 bIImaj7 bIImaj7',
      'i7 bvii7 bVImaj7 bIImaj7 i7 bvii7 bVImaj7 bIImaj7',
      'i7 iv7 bvii7 bIII7 bVImaj7 iv7 bIImaj7 i7',
      'i7 i7 bvii7 bvii7 bVImaj7 bVImaj7 bIImaj7 bIImaj7',
    ],
    chorus: [
      'bVImaj7 bvii7 i7 i7 bVImaj7 bvii7 bIImaj7 i7',
      'iv7 bVImaj7 bIImaj7 i7 iv7 bVImaj7 bIImaj7 bIImaj7',
      'bIII7 bVImaj7 bvii7 i7 bIII7 bVImaj7 bIImaj7 i7',
      'bIImaj7 bIImaj7 i7 i7 bVImaj7 bvii7 bIImaj7 bIImaj7',
      'i7 bVImaj7 bvii7 bIImaj7 i7 bVImaj7 iv7 bIImaj7',
    ],
    tag: ['bvii7 bIImaj7', 'bVImaj7 bIImaj7', 'iv7 bIImaj7', 'bIImaj7 bIImaj7'],
    riff: [
      'i7 bIImaj7',
      'i7 bvii7',
      'i7 [bvii7 bIImaj7]',
      'i7 i7 bIImaj7 i7',
      'i7 iv7 bIImaj7 i7',
      'i7 bVImaj7 bvii7 bIImaj7',
    ],
    // Modal: the vamp moved to another key, with few changes.
    bridge: [
      'i7 i7 bIImaj7 bIImaj7 i7 i7',
      'i7 bvii7 i7 bvii7 bVImaj7 bIImaj7',
      'i7 i7 iv7 iv7 bIImaj7 bIImaj7',
      'bVImaj7 bvii7 i7 i7 bIImaj7 bIImaj7',
    ],
    intro: [
      'i7 bIImaj7',
      'i7 i7 i7 bIImaj7',
      'i7 i7 bIImaj7 bIImaj7',
      'bVImaj7 bvii7 i7 i7',
      'i7 bvii7 bVImaj7 bIImaj7',
      'iv7 iv7 bIImaj7 bIImaj7',
    ],
  },
  pre: {
    climb: ['iv7 bVImaj7 bvii7 bIImaj7', 'bVImaj7 bvii7', 'iv7 bvii7 bVImaj7 bvii7 bIII7 bIImaj7'],
    pedal: ['bIImaj7 bIImaj7 bIImaj7 bIImaj7', 'bvii7 bvii7 bIImaj7 bIImaj7', 'bIImaj7 bIImaj7'],
    drop: ['bVImaj7 bvii7 bIImaj7 bIImaj7', 'iv7 bVImaj7 bvii7 bIImaj7', 'i7 bvii7 bVImaj7 bvii7 bIImaj7 bIImaj7'],
    stops: ['bVImaj7 bvii7 bIImaj7 bvii7', 'bVImaj7 bIImaj7', 'iv7 [bVImaj7 bvii7] bIImaj7 bIImaj7'],
    borrowed: ['bVImaj7 bIII7 bvii7 bIImaj7', 'iv7 bIII7', 'bIII7 bVImaj7 bvii7 bIImaj7'],
  },
  bridgeKeys: [
    { offset: 8, weight: 3, adventurous: false },
    { offset: 3, weight: 2, adventurous: false },
    { offset: 5, weight: 2, adventurous: true, mode: 'dorian' },
    { offset: 1, weight: 1, adventurous: true },
    { offset: 6, weight: 1, adventurous: true, mode: 'phrygian' },
  ],
  solo: {
    pair: [['i:m7add11|m7'], ['bII:^7#11|^9#11']],
    steps: [
      [1, 2],
      [-1, 2],
      [3, 1],
    ],
    shapes: [
      ['cycle', 1],
      ['home', 1],
      ['loop', 3],
      ['outside', 2],
    ],
  },
  turnarounds: {
    phrygian: { weight: 3, bars: [['bVII:m9|m7'], ['bII:^7#11|^9#11']] },
    'bVI-bVII': { weight: 2, bars: [['bVI:^9|69'], ['bVII:m9|m11']] },
    'iv-bII': { weight: 2, bars: [['iv:m9|m7'], ['bII:^9#11|^7#11']] },
    'truck driver': { weight: 1, bars: [['bII:^9#11|^7#11']] },
  },
};
