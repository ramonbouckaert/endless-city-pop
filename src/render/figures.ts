// Fixed figures the arrangement plays, in mini-notation, and the
// renderer's other constants.

export const FIGURES = {
  arp: '[0 1 2 3]*2',
  clav: '[~ 0 ~ 2] [~ ~ 1 ~] [~ 0 ~ 2] [~ 3 ~ ~]',
  scratch: '[0 ~ 0 2] [~ 1 ~ 0] [~ 0 2 ~] [1 ~ 0 ~]',
  stab: 'x ~ ~ ~',
  stops: '[x ~ ~ x ~ ~ x ~]',
  liftLine: '<[0 [~ 1] 2 [~ 3]] [4 [~ 4] 5 ~]>',
  liftHold: '[4@6 ~@2]',
  liftRun: '[~ ~ ~ ~ 0 1 2 3 4 5 6 7 8 9 10 11]',
  liftPickup: '[~ ~ ~ [-2 -1]]',
  pickup: '<~ [~ ~ ~ [-2 -1]]>',
  finaleDegrees: [4, 9, 13, 15, 17, 19],
  // Two bars as one: the band's pushed hits, then a last stab.
  finaleHits: '<[x ~ ~ x ~ ~ x ~] [x ~ ~ ~]>',
  // Up the chord in sixteenths (chord-scale degrees), then held.
  finaleRun: '[0 2 4 6 7 9 11 13 14@24]',
};

// Keyboard comping rhythms.
export const COMP = {
  main: '~ [~ x] ~ [~ ~ x ~]',
  chorus: '[~ x]*4',
  bossa: '[x ~ ~ x] [~ ~ x ~] [~ x ~ ~] [x ~ ~ ~]',
};

// The highest MIDI note a melody may be doubled up to.
export const DOUBLE_TOP = 100;

// Seconds of silence after the final chord, before the song loops.
export const TAIL_SECONDS = 1;

// Seconds a slurred note takes to slide into its pitch (Strudel's pattack).
export const SLIDE_SECONDS = 0.05;
