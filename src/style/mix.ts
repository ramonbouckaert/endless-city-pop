// The band's mix: how loud each way of playing a part sits, with its
// reverb, panning and note length (and for a sustained part, where its
// voicing tops out). Gains are set for the part's sound in
// BAND (the melody voices: for the alto sax); a song's own pick plays
// louder or quieter by its level (Instruments.trim, as postgain), so a
// recipe's own gain for a part still holds.

export interface Level {
  gain: number;
  room?: number;
  pan?: number;
  clip?: number; // a share of each note's length
  anchor?: number; // MIDI: a chord's voicing tops out at or below it
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
  // Voicings topping out at a4, d6, e5 and g5.
  pad: { gain: 0.14, room: 0.4, anchor: 69 },
  strings: { gain: 0.11, room: 0.45, anchor: 86 },
  choir: { gain: 0.09, room: 0.45, anchor: 76 },
  stabs: { gain: 0.22, clip: 0.3, anchor: 79 },
  bass: { gain: 0.75, clip: 0.8 },
  // The bass held back, under a sparser texture.
  bassUnder: { gain: 0.62 },
  lead: { gain: 0.5, room: 0.25 },
  double: { gain: 0.13, room: 0.35 },
  // The lead's echo: quieter, wetter, off to one side.
  echo: { gain: 0.17, room: 0.75, pan: 0.32 },
  soloist: { gain: 0.4, room: 0.3 },
  answer: { gain: 0.3, pan: 0.62, room: 0.25 },
  bell: { gain: 0.3, room: 0.4 },
  // The bells' sixteenth-note ostinato, round a voicing topping out at a5,
  // and an octave up.
  ostinato: { gain: 0.16, room: 0.5, clip: 0.5, anchor: 81 },
  ostinatoDouble: { gain: 0.07, room: 0.5, clip: 0.5 },
  // The bell doubling a lead an octave up.
  bellDouble: { gain: 0.15, room: 0.4 },
  horns: { gain: 0.3, room: 0.25 },
  hornDouble: { gain: 0.18, room: 0.25 },
} as const satisfies Readonly<Record<string, Level>>;

export type MixName = keyof typeof MIX;
