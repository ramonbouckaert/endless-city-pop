// The band's mix: how loud each way of playing a part sits, with its
// reverb, panning and note length. Gains are set for the part's sound in
// BAND (the melody voices: for the alto sax); a song's own pick plays
// louder or quieter by its level (Instruments.trim, as postgain), so a
// recipe's own gain for a part still holds.

export interface Level {
  gain: number;
  room?: number;
  pan?: number;
  clip?: number; // a share of each note's length
}

export const MIX = {
  keys: { gain: 0.34, room: 0.2 },
  // Keys under a lead, a riff or a soloist.
  keysUnder: { gain: 0.27, room: 0.2 },
  // Short chords on a comping rhythm.
  comp: { gain: 0.28, room: 0.2, clip: 0.5 },
  softKeys: { gain: 0.32, room: 0.35 },
  softKeysUnder: { gain: 0.25, room: 0.35 },
  arp: { gain: 0.24, room: 0.4 },
  finaleKeys: { gain: 0.4, room: 0.5 },
  keysRun: { gain: 0.32, room: 0.5 },
  clav: { gain: 0.19, pan: 0.28 },
  scratch: { gain: 0.28, pan: 0.72, clip: 0.5 },
  pad: { gain: 0.14, room: 0.4 },
  strings: { gain: 0.11, room: 0.45 },
  choir: { gain: 0.09, room: 0.45 },
  stabs: { gain: 0.22, clip: 0.3 },
  bass: { gain: 0.75, clip: 0.8 },
  // The bass held back, under a sparser texture.
  bassUnder: { gain: 0.62 },
  lead: { gain: 0.5, room: 0.25 },
  double: { gain: 0.13, room: 0.35 },
  soloist: { gain: 0.4, room: 0.3 },
  answer: { gain: 0.3, pan: 0.62, room: 0.25 },
  bell: { gain: 0.3, room: 0.4 },
  // The bell doubling a lead an octave up.
  bellDouble: { gain: 0.15, room: 0.4 },
  horns: { gain: 0.3, room: 0.25 },
  hornDouble: { gain: 0.18, room: 0.25 },
} as const satisfies Readonly<Record<string, Level>>;

export type MixName = keyof typeof MIX;

// Where each sustained part's voicing tops out (MIDI): a4, d6, e5, g5.
export const ANCHORS = { pad: 69, strings: 86, choir: 76, stabs: 79 };
