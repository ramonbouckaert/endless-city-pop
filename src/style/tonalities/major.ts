import type { TonalityDef, Turnaround } from './types';

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
  // A sus chord a whole step below the new tonic, pivoting up onto it (ANRI's +1).
  pivot: { weight: 1.5, bars: [['bVII:7sus|9sus']] },
  'long way': { weight: 1, bars: [['iii:m7'], ['VI:7alt|13b9'], ['ii:m9|m11'], ['V:7alt|13']] },
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

// Jazz-funk in a major key: ii-V-I, secondary dominants, borrowed iv
// (and iv6, the bVII7 backdoor and a minor i); slash chords (the
// Pachelbel bass line, IV over I's third, IV/V for a V11, II/I's lydian
// vamp); dominant chains round the circle, a ii-V to bII, maj7s planing
// down by semitones, passing #ivm7, #i° and III7#5, a deceptive VII7alt
// into I6, an altered V held as a pedal, and Sparkle's chromatic B (V/V
// over its third, a passing diminished, III7#5, iv6, #ivø).
export const MAJOR: TonalityDef = {
  tonics: [5, 10, 3, 0, 7, 2, 4, 9], // F Bb Eb C G D E A
  tonic: 'maj',
  reharm: 1,
  finale: [['^9', 'lydian']],
  approach: [['ii:m9|m11'], ['V:13|7alt|9sus']],
  templates: {
    // A verse's two-chord vamp (the approach home follows).
    // Chords held two bars, never coming home: IV to I/3 (Sparkle's A), II to I (Stay With Me's verse).
    verseLoop: ['IVmaj7 IVmaj7 I/3 I/3', 'II7 II7 Imaj7 Imaj7'],
    verseVamp: ['IVmaj7 V7sus', 'IVmaj7 I/3', 'II/I Imaj7', 'IVmaj7 iii7', 'ii7 IV/V', 'IVmaj7 IVmaj7 IV/V IV/V'],
    vamp: [
      'II/I Imaj7',
      'IVmaj7 I/3',
      'ii7 V7',
      'ii7 [ii7 V7]',
      'vi7 II7',
      'Imaj7 IVmaj7',
      'IVmaj7 iii7',
      'ii7 iii7',
      'IVmaj7 V7sus',
      'Imaj7 [vi7 II7]',
    ],
    verse: [
      'Imaj7 V/3 vi7 I/5 IVmaj7 I/3 ii7 IV/V',
      'Imaj7 VI7 II7 V7 Imaj7 VI7 II7 V7',
      'Imaj7 I7 IVmaj7 iv6 iii7 VI7 ii7 V7',
      'IVmaj7 I/3 ii7 IV/V IVmaj7 I/3 ii7 IV/V',
      'IVmaj7 #iv7 V7sus V7 iii7 VI7 ii7 V7',
      'vi7 II7 vi7 II7 IVmaj7 [iii7 bIII7] ii7 V7',
      'ii7 V7 iii7 VI7 ii7 V7 Imaj7 Imaj7',
      'Imaj7 vi7 ii7 V7 iii7 VI7 ii7 V7',
      'IVmaj7 iii7 ii7 Imaj7 IVmaj7 iii7 ii7 V7sus',
      'vi7 vi7 II7 II7 IVmaj7 iii7 ii7 V7',
      'Imaj7 iii7 IVmaj7 iv7 iii7 VI7 ii7 V7',
      'ii7 iii7 IVmaj7 V7 ii7 iii7 IVmaj7 V7sus',
      'IVmaj7 Imaj7 IVmaj7 Imaj7 vi7 iii7 ii7 V7sus',
      // The backdoor, a chain of dominants and a borrowed minor i (Last Summer Whisper's).
      'IVmaj7 bVII7 VI7 II7 ii7 V7 i7 [ii7 V7]',
      // V/iii's altered dominant resolving deceptively to I6, and iv to close (Sea Line's).
      'IVmaj7 [IVmaj7 VII7alt] I6 vi7 IVmaj7 iii7 IVmaj7 iv7',
    ],
    chorus: [
      'IVmaj7 I/3 ii7 IV/V IVmaj7 I/3 ii7 IV/V',
      'Imaj7 V/3 vi7 I/5 IVmaj7 I/3 ii7 V7sus',
      'IVmaj7 V7 iii7 vi7 ii7 [biii7 bVI7] bIImaj7 V7sus',
      'Imaj7 VI7 II7 V7 iii7 VI7 [ii7 V7] Imaj7',
      '[IVmaj7 IIImaj7] [bIIImaj7 IImaj7] Imaj7 VI7 ii7 V+ Imaj7 V7sus',
      'IVmaj7 III7#5 vi7 [v7 I7] IVmaj7 iv6 iii7 VI7sus',
      'IVmaj7 III7 vi7 [v7 I7] IVmaj7 III7 [vi7 II7] [ii7 V7]',
      'Imaj7 VI7 ii7 V7 iii7 VI7 ii7 V7',
      'IVmaj7 V7 iii7 vi7 ii7 V7 Imaj7 [ii7 V7]',
      'vi7 ii7 V7 Imaj7 IVmaj7 ii7 V7sus V7',
      'IVmaj7 V7 iii7 VI7 ii7 V7 Imaj7 Imaj7',
      'Imaj7 III7 IVmaj7 iv7 iii7 VI7 ii7 V7',
      'IVmaj7 iv7 iii7 vi7 ii7 bII7 Imaj7 V7sus',
      // The bass falling from the tonic through bVII (ANRI's chorus, in the relative major).
      'Imaj7 V/3 bVIImaj7 VI7 ii7 bVIImaj7 V7sus V7sus',
      // iii to III, and a line cliché under vi (Stay With Me's).
      'IVmaj7 IVmaj7 iii7 III7 [vi7 vi/7] [I/5 II7/3] ii7 V7sus',
      // V/iii into iii, and a tritone slide home (Tokai's tune).
      'Imaj7 VII7 iii7 [v7 I7] IVmaj7 III7 vi7 [bVI7 V7]',
    ],
    tag: [
      'IV/V IV/V',
      'VII7 bVII7',
      'ii7 IV/V',
      'bVImaj7 V7sus',
      'bVImaj7 bVII7',
      'IVmaj7 iv7',
      'ii7 bII7',
      'IVmaj7 V7sus',
      'iii7 VI7',
      'IVmaj7 [iii7 VI7]',
      'bVImaj7 bVII7 IVmaj7 V7sus',
    ],
    bridge: [
      'Imaj7 VI7 II7 V7 Imaj7 [biii7 bVI7]',
      'IVmaj7 bVIImaj7 ii7 V7 Imaj7 IVmaj7',
      'ii7 V7 Imaj7 vi7 ii7 V7',
      'Imaj7 vi7 IVmaj7 V7 iii7 vi7',
      'bVImaj7 bVII7 Imaj7 Imaj7 ii7 V7',
      'iii7 VI7 ii7 V7 IVmaj7 V7sus',
      'IV7sus V7sus IV7sus V7sus bvi7 bII7',
      // Ten bars, for a long bridge: a minor seventh a step below the tonic, slipping round to ii (Tokai's).
      'bvii7 bvii7 [bvii7 bVI7] VI7 ii7 V7sus Imaj7 [ii7 bIII7] ii7 bVII7',
      // Ten bars: the royal road IV-V-iii-vi, a ii-V-I, then the iii-VI-ii-V turnaround.
      'IVmaj7 V7 iii7 vi7 ii7 V7 Imaj7 [iii7 VI7] ii7 V7sus',
      // Ten bars: the bass walking down the scale from the tonic to ii, then round to V.
      'Imaj7 V/3 vi7 I/5 IVmaj7 I/3 ii7 [iii7 VI7] ii7 V7sus',
      // Ten bars: the borrowed iv, VI7 into ii and the tritone sub home, then bVII and bVI planing onto V.
      'IVmaj7 iv7 iii7 VI7 ii7 bII7 Imaj7 bVIImaj7 bVImaj7 V7sus',
    ],
    riff: [
      'IVmaj7 I/3',
      'Imaj7 I7 IVmaj7 iv6',
      'ii7 V7',
      'vi7 II7',
      'Imaj7 IV7',
      'ii7 V7sus',
      'Imaj7 bVII7',
      'ii7 [iii7 IVmaj7]',
      'IVmaj7 V7 iii7 vi7',
      'IVmaj7 iii7 ii7 V7sus',
    ],
    intro: [
      'IVmaj7 I/3 ii7 IV/V',
      'IVmaj7 IV/V',
      'Iadd9 Iadd9 IVadd9 IVadd9',
      'Imaj7 IVmaj7',
      'ii7 V7',
      'Imaj7 bVIImaj7',
      'Imaj7 vi7 ii7 V7',
      'iii7 VI7 ii7 V7',
      'V7sus V7sus V7sus V7',
      'bVImaj7 bVII7 Imaj7 [ii7 V7]',
      'IVmaj7 iii7 ii7 V7sus',
      'IVmaj7 V7sus',
      'ii7 bII7',
      'Imaj7 iii7 IVmaj7 V7sus',
      'IVmaj7 iv7 iii7 VI7',
      // An altered dominant held two bars before the song comes in (Tokai's).
      'IVmaj7 iv7 V7alt V7alt',
    ],
    // Cadences home looped as an outro.
    outro: ['IVmaj7 IVmaj7 Imaj7 Imaj7 IVmaj7 V7sus Imaj7 Imaj7', 'IVmaj7 V7sus Imaj7 vi7'],
  },
  pre: {
    climb: [
      'IVmaj7 [viiø III7#5] vi7 IV/V',
      'Imaj7 #i° ii7 V7sus',
      'ii7 iii7 IVmaj7 #iv7 IV/V',
      'ii7 iii7 IVmaj7 V7sus',
      'ii7 iii7 iv7 #iv° V7sus V7',
      'IVmaj7 #iv° V7sus V7',
      'ii7 [iii7 IVmaj7] V7sus V7',
      'Imaj7 ii7 iii7 IVmaj7 #iv° V7sus',
      // Secondary dominants into vi and back (Stay With Me's).
      '[ii7 III7] [vi7 V7] [IVmaj7 III7] [ii7 V7]',
      // The bass falling chromatically under inversions and borrowed chords (Sparkle's B).
      'II7/3 iv° III7#5 iv6 I/5 #ivø [ii7 IVmaj7] IV/V',
    ],
    pedal: [
      'IV/V IV/V IV/V V7',
      'VI7sus VI7sus II7sus V7sus',
      'V7sus V7sus V7sus V7',
      'IVmaj7 IVmaj7 V7sus V7sus',
      'ii7 ii7 V7sus V7sus',
      'V7sus V7',
      'bVImaj7 bVImaj7 bVII7 V7sus',
      'IVmaj7 IVmaj7 V7alt V7alt',
    ],
    drop: ['IVmaj7 iii7 ii7 V7sus', 'vi7 IVmaj7 ii7 V7sus', 'IVmaj7 V7 iii7 vi7 ii7 V7sus', 'IVmaj7 iv7 ii7 V7sus'],
    stops: [
      'IVmaj7 V+ iii7 vi7',
      'IVmaj7 V7 iii7 vi7',
      'IVmaj7 V7 [iii7 VI7] [ii7 V7sus]',
      'ii7 V7 iii7 VI7 ii7 V7sus',
      'IVmaj7 [iii7 VI7] ii7 bII7',
    ],
    borrowed: [
      'IVmaj7 iv6 Imaj7 bVII7',
      'IVmaj7 iv6 iii7 VI7 ii7 IV/V',
      'IVmaj7 iv7 iii7 VI7 ii7 V7sus',
      'bVImaj7 bVII7 IVmaj7 V7sus',
      'IVmaj7 iv7 iii7 bIIImaj7 ii7 V7sus',
      'ii7 bIIImaj7 IVmaj7 bVImaj7 bVII7 V7sus',
      'IVmaj7 iv7 bVII7 V7sus',
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
      ['loop', 1],
      ['outside', 1],
      ['sidestep', 1],
    ],
  },
  turnarounds: LIFT_TURNAROUNDS,
};
