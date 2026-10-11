// Song form: which sections a song may have, how long, and how often.
// Every song has an intro, a chorus and a final chord; the rest is
// optional, so songs range from a short verse-chorus-solo tune to a long
// one with several rounds, two soloists, a bridge, a breakdown and a key
// change, or (fusion's way, J-Cycle's) an intro and a vamp into a
// sixteen-bar theme with no verses, a solo, and the theme again. (What
// each section is, its name and whether it hands over to anything, is on
// its class, in engine/sections/.)

import type { Odds, Weighted } from '../lib/random';

export type SongEnding = 'finale' | 'fade';
// A song's shape: rounds of verse, pre-chorus and chorus (`song`); one
// eight-bar tune played again and again, with a bridge as its B and a
// fade (`tune`: Tokai's); or J-pop's A A B C D, two verses, a
// pre-chorus, the chorus and a post-chorus tag (`jpop`).
export type FormShape = 'song' | 'tune' | 'jpop';

export const FORM = {
  // The song's shape (FormShape).
  shape: { song: 6, tune: 1, jpop: 1.5 } as Odds<FormShape>,
  // How often a song has verses (and pre-choruses) before its choruses.
  verseChance: 0.85,
  // How often a song's verses are all seven bars (an eight-bar verse with
  // its first bar dropped: Sea Line's), and how often each round sings
  // its verse twice (A A, as J-pop does: always, in a J-pop form).
  shortVerse: 0.12,
  verseTwice: 0.15,
  // 0: no pre-chorus
  preBars: [
    [0, 1],
    [2, 1],
    [4, 2],
    [6, 1],
    [7, 0.4],
    [8, 1],
  ] as Weighted<number>,
  // A chorus: eight bars; ten, twelve or fourteen, with a tag; sixteen, a
  // theme in four-bar phrases; or twenty, a theme with a tag.
  chorusBars: [
    [8, 5],
    [10, 4],
    [12, 1.5],
    [14, 0.7],
    [16, 2],
    [20, 0.5],
  ] as Weighted<number>,
  // The faster the song, the likelier its sixteen-bar sections (choruses,
  // verses and solos): at the fastest tempo a sixteen's weight is this
  // many times its own, sliding to just its own at the slowest.
  sixteenAtSpeed: 3,
  rounds: [
    [1, 2],
    [2, 5],
    [3, 2],
  ] as Weighted<number>,
  riffChance: [0, 0.4, 0.7],
  // How often a riff is played again a semitone up, straight after.
  riffSideStep: 0.3,
  // What rounds after the first may leave out: the pre-chorus, the verse
  // (into the pre-chorus), or the chorus's first half.
  later: { dropPre: 0.25, dropVerse: 0.15, halfChorus: 0.2 },
  // How often a song has a link (a bar or two of planing chords) before
  // every verse after the first, and how long.
  link: { chance: 0.2, bars: [1, 2] },
  // How often a song stops dead in the last bar of its later choruses (a
  // band hit, then silence under the lead, and a drum pickup).
  stopChance: 0.25,
  introBars: [
    [4, 2],
    [8, 1],
  ] as Weighted<number>,
  vamp: {
    chance: 0.6,
    bars: [4, 8],
    returns: 0.45,
    returnsAgain: 0.3, // and, having come back, comes back once more
  },
  verseBars: [
    [8, 2],
    [16, 1],
  ] as Weighted<number>,
  bridgeChance: 0.65,
  soloists: [0, 1, 2, 3],
  soloCount: [
    [0, 1],
    [1, 4],
    [2, 3],
  ] as Weighted<number>,
  soloBars: [
    [8, 2],
    [16, 1],
  ] as Weighted<number>,
  breakdown: { chance: 0.45, bars: [4, 8] },
  drumBreakChance: 0.7,
  lift: {
    first: 0.55,
    again: 0.3,
    steps: [
      [1, 2],
      [2, 3],
      [3, 1],
    ] as Weighted<number>,
  },
  finalChoruses: [
    [1, 2],
    [2, 4],
    [3, 1],
  ] as Weighted<number>,
  outroChance: 0.75, // its style and length are in variants.ts
  // How a song ends: on its final chord (the finale), or fading out over
  // its last choruses (or an outro) played again and again.
  ending: { finale: 1, fade: 1 } as Odds<SongEnding>,
  // A fading song's last choruses, and how often an outro (one that
  // fades, OUTRO_STYLES) takes over from them.
  fade: {
    choruses: [
      [2, 2],
      [3, 3],
      [4, 2],
    ] as Weighted<number>,
    outroChance: 0.45,
  },
  // How often a song holds one moment of tension mid-song on a fermata:
  // the last bar of a pre-chorus, bridge, breakdown or lift, slowed and
  // held (FERMATA).
  fermataChance: 0.4,
};

// The furthest the last choruses lift the key, in semitones. Instruments
// keep this much room below their top note.
export const MAX_SHIFT = 4;
