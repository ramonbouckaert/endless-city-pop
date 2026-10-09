// Drum grooves, as Strudel code. Each is emitted once as a `let` and
// shared by every section that uses it.

export const GROOVES = {
  funkDrums: `stack(
  s("[bd ~ ~ bd] [~ ~ ~ ~] [bd ~ bd ~] [~ ~ ~ ~]").gain(.75),
  s("~ sd ~ sd").gain(.52),
  s("[~ ~ ~ ~] [~ ~ ~ sd] [~ sd ~ ~] [~ ~ ~ sd]").gain(.07),
  s("hh*16").gain("[.22 .06 .12 .06]*4")
)`,
  discoDrums: `stack(
  s("bd*4").gain(.78),
  s("~ [sd,cp] ~ [sd,cp]").gain(.48),
  s("[~ oh]*4").gain(.14),
  s("hh*16").gain("[.14 .05 .09 .05]*4")
)`,
  halfTime: `stack(
  s("bd ~ ~ ~ ~ ~ [~ bd] ~").gain(.6),
  s("~ ~ sd ~").gain(.45),
  s("[~ rim]*2").gain(.08),
  s("hh*8").gain("[.12 .06]*4")
)`,
  bossaDrums: `stack(
  s("bd ~ ~ bd bd ~ ~ bd").gain(.55),
  s("<[rim ~ ~ rim ~ ~ rim ~] [~ ~ rim ~ ~ rim ~ ~]>").gain(.2),
  s("~ hh ~ hh").gain(.1),
  s("rd*8").gain("[.1 .06]*4")
)`,
  swingDrums: `stack(
  s("rd [rd rd] rd [rd rd]").gain("[.16 [.1 .12]]*2"),
  s("~ hh ~ hh").gain(.14),
  s("bd*4").gain(.12),
  s("[~ ~ ~ ~] [~ ~ ~ sd] [~ ~ ~ ~] [~ sd ~ ~]").gain(.06)
)`,
  popDrums: `stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(.75),
  s("~ sd ~ sd").gain(.5),
  s("hh*8").gain("[.18 .08]*4")
)`,
  popSoft: `stack(
  s("bd ~ ~ ~ ~ ~ ~ ~").gain(.5),
  s("~ rim ~ rim").gain(.12),
  s("hh*8").gain("[.1 .05]*4")
)`,
  popBuild: `stack(
  s("bd*4").gain(.7),
  s("~ sd ~ sd").gain(.45),
  s("hh*16").gain("[.14 .05 .09 .05]*4")
)`,
  fourFloor: `stack(
  s("bd*4").gain(.8),
  s("~ [sd,cp] ~ [sd,cp]").gain(.5),
  s("[~ oh]*4").gain(.12),
  s("hh*16").gain("[.12 .05 .08 .05]*4")
)`,
  rockDrums: `stack(
  s("bd ~ ~ ~ bd bd ~ ~").gain(.8),
  s("~ sd ~ sd").gain(.6),
  s("hh*8").gain("[.22 .12]*4")
)`,
  rockDrive: `stack(
  s("bd ~ bd ~ bd ~ [bd bd] ~").gain(.82),
  s("~ sd ~ sd").gain(.62),
  s("rd*8").gain("[.16 .1]*4"),
  s("[~ oh]*2").gain(.08)
)`,
  introRide: `stack(
  s("~ ~ ~ rim").gain(.1),
  s("rd*8").gain("[.065 .035]*4")
)`,
  claps: `stack(
  s("bd*4").gain(.55),
  s("~ cp ~ cp").gain(.45)
)`,
  build: `stack(
  s("bd*4").gain(.7),
  s("<[sd*4] [sd*8]>").gain(.32).velocity(saw.slow(2).range(.4, 1))
)`,
};

// Section feel name -> groove variable.
export const FEEL_TO_GROOVE = {
  funk: 'funkDrums',
  disco: 'discoDrums',
  halfTime: 'halfTime',
  bossa: 'bossaDrums',
  swing: 'swingDrums',
  pop: 'popDrums',
  popSoft: 'popSoft',
  popBuild: 'popBuild',
  fourFloor: 'fourFloor',
  rock: 'rockDrums',
  rockDrive: 'rockDrive',
  introRide: 'introRide',
  claps: 'claps',
  build: 'build',
};

// Crash on the first bar and a crescendo snare fill on the last bar of
// an n-bar section. The mini-notation is built at evaluation time, so it
// uses single-quoted strings (which Strudel leaves as plain JavaScript)
// passed through mini() by hand.
export const HELPERS = `// Crash on the first bar of an n-bar section
let crashFirst = bars => s(mini('<cr ' + '~ '.repeat(bars - 1) + '>')).gain(.2)

// Crescendo snare fill in the last bar of an n-bar section
let fillLast = bars => s(mini('<' + '~ '.repeat(bars - 1) + '[~ [~ sd] [sd sd] [sd sd sd sd]]>'))
  .gain(.32)
  .velocity(saw.range(.4, 1))`;

// Two bars of drums alone (the section adds a bass pickup).
export const DRUM_BREAK_PARTS = [
  `s("<[[bd ~ ~ bd] [~ ~ bd ~] [~ bd ~ ~] [bd ~ ~ ~]] [[bd ~ ~ bd] [~ bd ~ ~] [bd ~ ~ ~] ~]>").gain(.75)`,
  `s("<[~ [sd ~ ~ sd] [~ ~ sd ~] [~ sd ~ sd]] [[~ sd ~ sd] [sd ~ sd sd] [~ sd sd ~] [sd sd sd sd]]>")
    .gain(.45)
    .velocity(saw.range(.5, 1))`,
  `s("hh*16").gain("[.2 .06 .12 .06]*4")`,
  `s("<~ [~ ~ ~ oh]>").gain(.15)`,
];
