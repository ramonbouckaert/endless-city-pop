// Song form: which sections a song may have, how long, and how often.
// Nearly every song has an intro and a chorus, and it ends on a final
// chord or fades; the rest is optional, so songs range from a short
// verse-chorus-solo tune to a long one with several rounds, two
// soloists, a bridge, a breakdown and a key change, or (fusion's way,
// J-Cycle's) an intro and a vamp into a sixteen-bar theme with no
// verses, a solo, and the theme again; or (Sparkle's) verses and their
// B with no chorus at all. (What each section is, its name and whether
// it hands over to anything, is on its class, in engine/sections/.)

import type { Odds, Weighted } from '../lib/random';

export type SongEnding = 'finale' | 'fade';
// A song's shape: rounds of verse, pre-chorus and chorus (`song`); one
// eight-bar tune played again and again, with a bridge as its B and a
// fade (`tune`: Tokai's); J-pop's A A B C D, two verses, a pre-chorus,
// the chorus and a post-chorus tag (`jpop`); or rounds of a verse and its
// B (a pre-chorus) with no chorus, the B played once more at the end
// before a coda or the final chord (`ab`: Sparkle's).
export type FormShape = 'song' | 'tune' | 'jpop' | 'ab';

export const FORM = {
  // The song's shape (FormShape).
  shape: { song: 6, tune: 1, jpop: 1.5, ab: 0.6 } as Odds<FormShape>,
  // How often a song has verses (and pre-choruses) before its choruses.
  verseChance: 0.85,
  // How often a song's verses are all seven bars (an eight-bar verse with
  // its first bar dropped: Sea Line's), and how often each round sings
  // its verse twice (A A, as J-pop does: always, in a J-pop form).
  shortVerse: 0.12,
  verseTwice: 0.15,
  // 0: no pre-chorus; sixteen, two eights (Summer Suspicion's).
  preBars: [
    [0, 1],
    [2, 1],
    [4, 2],
    [6, 1],
    [7, 0.4],
    [8, 1],
    [16, 0.25],
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
  // (into the pre-chorus), or the chorus's first half. And how often the
  // last round plays its chorus twice in a row (Summer Suspicion's), and
  // then how often a turnaround re-enters it from another chord.
  later: { dropPre: 0.25, dropVerse: 0.15, halfChorus: 0.2, again: 0.12, reentry: 0.5 },
  // How often a song has a link (a bar to three of planing chords) before
  // every verse after the first, and how long.
  link: { chance: 0.2, bars: [1, 2, 3] },
  // Short bars: how often a song breaks for a 2/4 bar before each chorus
  // that follows its verse or pre-chorus, and how often it starts its
  // first section after the intro with a 1/4 pickup.
  shortBars: { beforeChorus: 0.15, pickup: 0.12 },
  // How often a song stops dead in the last bar of its later choruses (a
  // band hit, then silence under the lead, and a drum pickup).
  stopChance: 0.25,
  // An intro of five or nine bars has a bar on the dominant after its
  // phrases (ANRI's band intro, Sparkle's).
  introBars: [
    [4, 2],
    [8, 1],
    [5, 0.3],
    [9, 0.3],
  ] as Weighted<number>,
  // How often a song has an intro at all (one without starts on its first
  // verse or chorus), how often it opens with a free intro (out of tempo:
  // INTRO_TEXTURES' rubato) before its intro in time, and how often
  // (without one) with strings swelling on a held chord (J-Cycle's).
  introChance: 0.9,
  freeIntro: { chance: 0.12, bars: [2, 4] },
  swell: { chance: 0.08, bars: 2 },
  vamp: {
    chance: 0.6,
    bars: [4, 8],
    returns: 0.45,
    returnsAgain: 0.3, // and, having come back, comes back once more
    // How often an opening vamp leads on into the riff (Sparkle's intro in three stages).
    riffAfter: 0.15,
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
    // How often a lift bends the chorus's own last two bars onto the new
    // key's V (Tokai's) instead of taking one of the tonality's turnarounds.
    own: 0.2,
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
  // How often a song ending on its finale plays its riff three times in
  // place of an outro, into a bare tonic (Flyday Chinatown's).
  riffEnding: 0.12,
  // How a song ends: on its final chord (the finale), or fading out over
  // its last choruses (or an outro) played again and again.
  ending: { finale: 1, fade: 1 } as Odds<SongEnding>,
  // How often a fading song with verses ends on them instead, lifted a
  // key (ANRI's): a lift, then its verse again and again (as many bars as
  // a fade's choruses of eight, at least two verses); and how often the
  // band drops out under the keys and the lead for the first two bars
  // after the lift.
  verseEnding: { chance: 0.15, bare: 0.5 },
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
  // A ballad's rounds and solos: fewer, a song's odds moving towards
  // these the further it leans towards a ballad (BALLAD), and its drum
  // break's chance away (to none, fully leaning).
  ballad: {
    rounds: [
      [1, 1],
      [2, 3],
    ] as Weighted<number>,
    soloCount: [
      [0, 2],
      [1, 2],
    ] as Weighted<number>,
  },
  // How often a song holds one moment of tension mid-song on a fermata:
  // the last bar of a pre-chorus, bridge, breakdown, lift, vamp or link,
  // slowed and held (FERMATA).
  fermataChance: 0.4,
};

// The furthest the last choruses lift the key, in semitones. Instruments
// keep this much room below their top note.
export const MAX_SHIFT = 4;
