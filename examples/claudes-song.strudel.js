setCpm(110/4)

const SWING = .1

// ==========================================================
// HARMONY: chord symbols + matching chord-scales
// ==========================================================

// Intro: add9 chords planing down in whole steps
// (the scales put the third in the bass: Ab/C, Gb/Bb ...)
let introChords = chord("<Abadd9 Gbadd9 Eadd9 [Dadd9 G9sus]>")
let introScales = "<Ab1:major Gb1:major E1:major [D1:major G1:mixolydian]>"

// D dorian vamp
let vampChords = chord("<Dm11 G13>")
let vampScales = "<D2:dorian G1:mixolydian>"

let verseChords = chord(`<
  Dm11 G13 Dm11 [G13b9 B13#11]
  Bb^9#11 [Am11 Ab13] Gm9 [C11 C7#9]
>`)
let verseScales = `<
  D2:dorian G1:mixolydian D2:dorian [G1:mixolydian B1:lydian:dominant]
  Bb1:lydian [A1:dorian Ab1:lydian:dominant] G1:dorian C2:mixolydian
>`

// Six bars, bass climbing G A Bb B C
let preChords = chord("<Gm9 Am11 Bbm9 Bo7 C11 C7#9#5>")
let preScales = "<G1:dorian A1:dorian Bb1:dorian B1:locrian C2:mixolydian C2:altered>"

// Ten bars: eight of chorus, two of tag
let chorusChords = chord(`<
  Bb^9 A7alt Dm9 [Cm9 F13]
  Bb^9 A7alt [Dm9 G13] [Gm9 C7alt]
  Db^7#11 C11
>`)
let chorusScales = `<
  Bb1:lydian A1:phrygian:dominant D2:dorian [C2:dorian F1:mixolydian]
  Bb1:lydian A1:phrygian:dominant [D2:dorian G1:mixolydian] [G1:dorian C2:altered]
  Db2:lydian C2:mixolydian
>`

let soliChords = chord("<Db^9 C7alt Fm9 Bb13 Eb^9 Ab^7#11 Em7b5 A7alt>")
let soliScales = `<
  Db2:lydian C2:altered F1:dorian Bb1:mixolydian
  Eb2:lydian Ab1:lydian E2:locrian A1:altered
>`

let bridgeChords = chord("<Db^9 Gb^7#11 Bbm9 Eb13 Ab^9 Db^7#11 Gm7b5 C7alt>")
let bridgeScales = `<
  Db2:lydian Gb1:lydian Bb1:dorian Eb2:mixolydian
  Ab1:lydian Db2:lydian G1:locrian C2:altered
>`

// Guitar solo: ii-V pairs a minor third apart
let soloChords = chord("<Dm9 G13 Fm9 Bb13 Abm9 Db13 [Bm9 E13] [C9sus C7alt]>")
let soloScales = `<
  D2:dorian G1:mixolydian F1:dorian Bb1:mixolydian
  Ab1:dorian Db2:mixolydian [B1:dorian E2:mixolydian] [C2:mixolydian C2:altered]
>`

let liftChords = chord("<Eb^7#11 D7alt>")
let liftScales = "<Eb2:lydian D2:altered>"

// Vibes solo: ii-Vs falling in whole steps (D, C, Bb),
// then Eb lydian and a turnaround back to Bb
let vibesChords = chord("<Em9 A13 Dm9 G13 Cm9 F13 Eb^7#11 [Gm9 C7alt]>")
let vibesScales = `<
  E1:dorian A1:mixolydian D2:dorian G1:mixolydian
  C2:dorian F1:mixolydian Eb2:lydian [G1:dorian C2:altered]
>`

// Ending, all in G.
// Trades: the chorus-tag chords as a vamp
let tradeChords = chord("<Eb^7#11 D9sus>")
let tradeScales = "<Eb2:lydian D2:mixolydian>"

// Bookend: the intro's planing add9 chords, now falling
// from Eb to A so the last step lands on G
let bookendChords = chord("<Ebadd9 Dbadd9 Badd9 Aadd9>")
let bookendScales = "<Eb2:major Db2:major B1:major A1:major>"

// ==========================================================
// DRUMS
// ==========================================================

let funkDrums = stack(
  s("[bd ~ ~ bd] [~ ~ ~ ~] [bd ~ bd ~] [~ ~ ~ ~]").gain(.75),
  s("~ sd ~ sd").gain(.52),
  s("[~ ~ ~ ~] [~ ~ ~ sd] [~ sd ~ ~] [~ ~ ~ sd]").gain(.07),
  s("hh*16").gain("[.22 .06 .12 .06]*4")
)

let discoDrums = stack(
  s("bd*4").gain(.78),
  s("~ [sd,cp] ~ [sd,cp]").gain(.48),
  s("[~ oh]*4").gain(.14),
  s("hh*16").gain("[.14 .05 .09 .05]*4")
)

let halfTime = stack(
  s("bd ~ ~ ~ ~ ~ [~ bd] ~").gain(.6),
  s("~ ~ sd ~").gain(.45),
  s("[~ rim]*2").gain(.08),
  s("hh*8").gain("[.12 .06]*4")
)

let ride = s("rd*8").gain("[.13 .07]*4")

// Crash on the first bar of an n-bar section
let crashes = {
  2: s("<cr ~>"),
  4: s("<cr ~ ~ ~>"),
  6: s("<cr ~ ~ ~ ~ ~>"),
  8: s("<cr ~ ~ ~ ~ ~ ~ ~>"),
  10: s("<cr ~ ~ ~ ~ ~ ~ ~ ~ ~>")
}
let crashFirst = bars => crashes[bars].gain(.2)

// Crescendo snare fill in the last bar of an n-bar section
let fills = {
  4: s("<~ ~ ~ [~ [~ sd] [sd sd] [sd sd sd sd]]>"),
  6: s("<~ ~ ~ ~ ~ [~ [~ sd] [sd sd] [sd sd sd sd]]>"),
  8: s("<~ ~ ~ ~ ~ ~ ~ [~ [~ sd] [sd sd] [sd sd sd sd]]>"),
  10: s("<~ ~ ~ ~ ~ ~ ~ ~ ~ [~ [~ sd] [sd sd] [sd sd sd sd]]>")
}
let fillLast = bars => fills[bars]
  .gain(.32)
  .velocity(saw.range(.4, 1))

// ==========================================================
// INSTRUMENTS
// Harmony parts take a chord pattern; n() picks voicing notes
// ==========================================================

let keys = (c, rhythm = "~ [~ x] ~ [~ ~ x ~]") =>
  c.struct(rhythm)
    .voicing()
    .sound("gm_epiano1")
    .gain(.36)
    .velocity(rand.range(.8, 1))
    .room(.2)

let rhodesArp = c =>
  n("[0 1 2 3]*2")
    .set(c)
    .voicing()
    .sound("gm_epiano1")
    .gain(.24)
    .room(.4)
    .delay(.2)
    .delaytime(.375)

let clav = c =>
  n("[~ 0 ~ 2] [~ ~ 1 ~] [~ 0 ~ 2] [~ 3 ~ ~]")
    .set(c)
    .voicing()
    .sound("gm_clavinet")
    .gain(.19)
    .velocity(rand.range(.7, 1))
    .pan(.28)

let scratch = c =>
  n("[0 ~ 0 2] [~ 1 ~ 0] [~ 0 2 ~] [1 ~ 0 ~]")
    .set(c)
    .voicing()
    .sound("gm_electric_guitar_muted")
    .clip(.5)
    .gain(.28)
    .velocity(rand.range(.7, 1))
    .pan(.72)

let vibesCounter = c =>
  n("[~ ~ [~ 2] 3] ~ [~ 1 ~ ~] [~ ~ [3 2] ~]")
    .set(c)
    .anchor("c6")
    .voicing()
    .sound("gm_vibraphone")
    .gain(.15)
    .room(.35)
    .pan(.6)

let oohs = c => c.anchor("a4").voicing().sound("gm_voice_oohs").gain(.14).room(.4)
let aahs = c => c.anchor("e5").voicing().sound("gm_choir_aahs").gain(.09).room(.45)
let strings = c => c.anchor("d6").voicing().sound("gm_string_ensemble_1").gain(.11).room(.45)

let stabs = c =>
  c.struct("x ~ ~ ~")
    .anchor("g5")
    .voicing()
    .sound("gm_brass_section")
    .clip(.3)
    .gain(.22)

// Bass: scale degrees against a chord-scale pattern
let bass = (degrees, scales) =>
  n(degrees)
    .scale(scales)
    .sound("gm_electric_bass_finger")
    .clip(.8)
    .gain(.75)

// Melodic parts: degrees against a key or chord-scale,
// optionally shifted up from the bass register
let line = (degrees, scales, up = 0) => n(degrees).scale(scales).transpose(up)

// Diatonic harmony: the line plus copies a third / fifth below
let harmonize = (p, ...steps) => stack(p, ...steps.map(st => p.sub(st)))

let sax = p => p.sound("gm_alto_sax").gain(.5).room(.25)
let flute = p => p.transpose(12).sound("gm_flute").gain(.13).room(.35)

let hornSection = p => stack(
  p.sound("gm_brass_section").gain(.3),
  p.sound("gm_alto_sax").gain(.18)
).room(.25)

// Bass lines below share a few rhythm templates. Each has a
// <...> slot: the approach note into the next bar's chord,
// one entry per bar.

// ==========================================================
// MELODIES (all degrees)
// ==========================================================

// Intro: one cell, planed down with the chords
// (chord-scale degrees, three octaves above the bass roots)
let introMel = "<[[~ 4] [2 1] 0@2]!3 [[~ 4] [2 1] [~ 3] [5 ~]]>"

// Hook teaser, in D dorian
let teaserMel = "<[[~ 2] [4 6] 8@2] ~ [[~ 2] [4 6] 8@2] [~ ~ [~ 7] [5 ~]]>"

// Verse, in F major
let verseMel = `<
  [~ [-2 0] [~ 2] [1 ~]]
  [[~ 0] -1 [-2 -4#] ~]
  [~ [-2 0] [~ 2] [4 ~]]
  [[~ 0] [1# 3#] [5# ~] [~ 4#]]
  [5@2 [4 2] [~ -1]]
  [[~ 1] [2 4] [6b ~] [~ 7]]
  [5 [~ 3] [2 0] ~]
  [[~ 0] [1 2] [3 ~] [5# ~]]
>`

// Pre: the same figure sequenced one step higher each bar
let preMel = `<
  [[~ 5] [~ 5] [4 3] 2]
  [[~ 6] [~ 6] [5 4] 3#]
  [[~ 7] [~ 7] [6b 5b] 4]
  [[~ 9b] [~ 9b] [7 5] 3#]
  [8@2 [~ 7] [8 ~]]
  [[9b ~] [~ 6b] [6 ~] ~]
>`

// THE HOOK, in F major: the [~ 0] [2 4] pickup lands on
// a different note each time; the tag repeats its rhythm
let chorusMel = `<
  [[~ 0] [2 4] 5@2]
  [4# ~ [~ 3] 2]
  [[~ 0] [2 4] 6@2]
  [5 [4 3] [~ 2] [1 ~]]
  [[~ 0] [2 4] 5@2]
  [4# [6 8] [~ 7] 6]
  [7@2 [6 5] [~ 3#]]
  [3 [2 1] [-1 ~] ~]
  [[~ 4] [6b 7] 8@2]
  [[~ 3] [4 5] 7@2]
>`

let chorusAnswer = `<
  [~ ~ [~ 9] [11 ~]] ~
  [~ ~ [~ 9] [11 ~]] ~
  [~ ~ [~ 9] [11 ~]] ~
  [[~ 9] [11 ~] ~ ~] [~ ~ ~ [12b 10]]
  ~ ~
>`

// Horn soli lead, in chord-scale degrees two octaves above
// the bass; harmonize() adds the lower two voices
let soliLead = `<
  [[~ 6] [8 9] [~ 11] [10 ~]]
  [[12 ~] [~ 9] [10 ~] [~ 8]]
  [[~ 11] [13 15] [~ 16] [14 ~]]
  [[12 ~] [~ 9] [11 13] [~ 12]]
  [[~ 4] [6 8] [~ 9] [11 ~]]
  [[17 ~] [~ 16] [13 11] [~ 9]]
  [[11 ~] [~ 9] [7 6] [~ 4]]
  [[10 ~] [~ 12] [15 13] [~ 10]]
>`

// Horn riff lead, in D dorian (harmonised a third below)
let riffLead = `<
  [9 [~ 9] [~ 8] [7 ~]]
  [[~ 4] [5 7] [~ 8] ~]
  [9 [~ 9] [~ 8] [7 ~]]
  [[~ 4] [5 7] [9 8] [7 ~]]
>`

// Bridge, in Ab major
let bridgeMel = `<
  [5@3 [4 2]]
  [3@2 [~ 1] 2]
  [3@3 [2 0]]
  [-1@2 [~ 1] [2 3]]
  [4@3 [2 1]]
  [5@2 [6 ~] [7 ~]]
  [8@2 [~ 5] [3 ~]]
  [[4# ~] [~ 3] [4 ~] [~ 1]]
>`

// Guitar solo, in chord-scale degrees two octaves above
// the bass, chasing the changes through D, F, Ab and B
let soloMel = `<
  [[~ 4] [6 7] [9 ~ 8 ~] [7 6 4 ~]]
  [[9 ~] [11 12] [13 15] [14 ~ 12 ~]]
  [[13 ~ 11 ~] [9 11] [13 15] [~ 16]]
  [[12 11 9 ~] 13 [12 ~ 11 9] [8 ~]]
  [[~ 11] [13 15] [16 ~ 15 ~] [13 11]]
  [[9 ~] [~ 11] [13 12] [11 ~ 9 ~]]
  [[9 11] [13 15] [13 ~ 12 ~] [9 ~]]
  [[11 ~] [10 8] [10 ~ 8 ~] [6 ~]]
>`

// Lift, in Eb lydian
let liftMel = "<[0 [~ 1] 2 [~ 3]] [4 [~ 4] 5 ~]>"

// Vibes solo, in chord-scale degrees two octaves above
// the bass: bebop-ish runs, then a climb through Eb lydian
let vibesSoloMel = `<
  [[~ 11] [13 14] [15 ~ 16 ~] [18 17 15 13]]
  [[9 ~] [11 13] [12 11 9 7] [~ 11]]
  [[9 ~] [11 13] [12 ~ 11 ~] [9 8]]
  [[11 ~ 9 ~] [~ 13] [15 14] [12 ~]]
  [[9 ~] [11 13] [15 ~ 14 ~] [13 11]]
  [[16 ~ 14 ~] [12 ~] [13 12 11 9] [~ 11]]
  [[6 ~] [~ 8] [9 10] [11 ~ 13 ~]]
  [[17 ~ 16 ~] [15 14] [12 ~ 10 ~] [8 ~]]
>`

// Trading ones: each soloist gets one bar in turn
// (tenor, vibes, guitar, trumpet, tenor, vibes, guitar),
// then the horns play bar 8 together while the band stops
let tenorTrades = `<
  [[~ 4] [6 7] [9 ~ 10 ~] [9 7]] ~ ~ ~
  [[~ 2] [4 6] [8 ~ 7 ~] [6 4]] ~ ~ ~
>`
let vibesTrades = `<
  ~ [[11 ~] [10 8] [7 ~ 6 ~] [4 ~]] ~ ~
  ~ [[7 8 10 11] [13 11 10 8] [7 ~] [~ 4]] ~ ~
>`
let guitarTrades = `<
  ~ ~ [[~ 9] [10 11] [13 ~ 12 ~] [10 ~]] ~
  ~ ~ [[10 ~ 9 ~] [10 11] [13 ~] [~ 14]] ~
>`
let trumpetTrades = "<~ ~ ~ [[10 ~ 11 ~] [13 ~] [11 10] [8 ~]] ~ ~ ~ ~>"
let tuttiBreak = "<~ ~ ~ ~ ~ ~ ~ [[13 ~] [11 10] [8 7] [6 ~]]>"

// ==========================================================
// SECTIONS
// ==========================================================

let introA = stack(
  s("~ ~ ~ rim").gain(.1),
  ride.gain(.5),
  introChords.voicing().sound("gm_epiano1").gain(.36).room(.35),
  strings(introChords),
  bass("<[2@3 [~ 9]]!3 [2@2 0@2]>", introScales).gain(.6),
  line(introMel, introScales, 36).sound("gm_vibraphone").gain(.3).room(.4)
)

let introB = stack(
  funkDrums.mask("<0 0 1 1>"),
  fillLast(4),
  bass("[0 ~ ~ 0] [~ ~ 7 ~] [6 ~ 4 ~] [2 ~ <2# 3#> ~]", vampScales),
  keys(vampChords).lpf(saw.slow(4).range(700, 8000)),
  line(teaserMel, "D5:dorian").sound("gm_vibraphone").gain(.3).room(.4)
)

let verse = (second = false) => stack(
  funkDrums,
  second ? s("~ ~ ~ [~ ~ ~ sd]").gain(.1) : silence,
  bass("[0 ~ ~ 0] [~ ~ 7 ~] [6 ~ 4 ~] [2 ~ <2# 3# 2# -1 0 0 2# 3#> ~]", verseScales),
  keys(verseChords),
  clav(verseChords),
  sax(line(verseMel, "F4:major")).gain(.46),
  second ? scratch(verseChords) : silence,
  second ? vibesCounter(verseChords) : silence
)

let pre = stack(
  funkDrums,
  fillLast(6),
  s("white").gain(saw.slow(6).range(0, .07)).hpf(3000),
  bass("0 0 7 0 0 0 4 6", preScales),
  keys(preChords, "x*8")
    .clip(.4)
    .gain(.3)
    .lpf(saw.slow(6).range(800, 7000)),
  oohs(preChords),
  scratch(preChords),
  sax(line(preMel, "F4:major"))
)

let chorus = ({ key = 0, answer = false, big = false } = {}) => stack(
  discoDrums,
  crashFirst(10),
  fillLast(10),
  stack(
    bass("0 7 0 7 0 7 [4 2] [0 <-1b 2 -1# 2 -1b 2 -1# 0 0 0>]", chorusScales).clip(.7),
    keys(chorusChords, "[~ x]*4").clip(.5).gain(.28),
    scratch(chorusChords),
    oohs(chorusChords),
    sax(line(chorusMel, "F4:major")),
    flute(line(chorusMel, "F4:major")),
    answer
      ? line(chorusAnswer, "F4:major").sound("gm_trumpet").gain(.3).pan(.62).room(.25)
      : silence,
    big ? stabs(chorusChords) : silence,
    big ? strings(chorusChords) : silence,
    big ? aahs(chorusChords) : silence
  ).transpose(key)
)

let soli = stack(
  funkDrums,
  crashFirst(8),
  fillLast(8),
  bass("[0@2 [~ 0] [4 <0 -4 2# 2 -2 5 -3 3>]]", soliScales),
  keys(soliChords).gain(.3),
  clav(soliChords),
  hornSection(line(harmonize(soliLead, 2, 4), soliScales, 24))
)

let riff = stack(
  funkDrums,
  crashFirst(4),
  fillLast(4),
  bass("[0 ~ ~ 0] [~ ~ 7 ~] [6 ~ 4 ~] [2 ~ <2# 3#> ~]", vampScales),
  hornSection(line(harmonize(riffLead, 2), "D4:dorian")),
  line(riffLead, "D3:dorian").sound("gm_tenor_sax").gain(.25),
  clav(vampChords),
  scratch(vampChords),
  keys(vampChords).gain(.28)
)

let bridge = stack(
  halfTime,
  bass("[0@2 4 [2 <0 1# 2# -4# 2 -3 2# -1#>]]", bridgeScales).gain(.65),
  rhodesArp(bridgeChords),
  strings(bridgeChords),
  flute(line(bridgeMel, "Ab3:major")).gain(.36),
  line(bridgeMel, "Ab4:major").sound("gm_vibraphone").gain(.18).room(.4)
)

// Two bars of drums alone, with a bass pickup at the end
let drumBreak = stack(
  s("<[[bd ~ ~ bd] [~ ~ bd ~] [~ bd ~ ~] [bd ~ ~ ~]] [[bd ~ ~ bd] [~ bd ~ ~] [bd ~ ~ ~] ~]>").gain(.75),
  s("<[~ [sd ~ ~ sd] [~ ~ sd ~] [~ sd ~ sd]] [[~ sd ~ sd] [sd ~ sd sd] [~ sd sd ~] [sd sd sd sd]]>")
    .gain(.45)
    .velocity(saw.range(.5, 1)),
  s("hh*16").gain("[.2 .06 .12 .06]*4"),
  s("<~ [~ ~ ~ oh]>").gain(.15),
  bass("<~ [~ ~ ~ [0 0#]]>", "C2:major")
)

let guitarSolo = stack(
  funkDrums,
  ride,
  crashFirst(8),
  fillLast(8),
  bass("0 ~ 7 ~ 6 4 2 <2# 5 2# -1# 2# -1# -2 -1#>", soloScales),
  keys(soloChords).gain(.3),
  clav(soloChords),
  line(soloMel, soloScales, 24)
    .sound("gm_overdriven_guitar")
    .gain(.34)
    .lpf(4000)
    .room(.3)
    .delay(.18)
    .delaytime(.27)
    .pan(.55)
)

// A cappella: claps, bass, stacked choir and the hook;
// the Rhodes sneaks back in halfway
let acappella = stack(
  s("bd*4").gain(.55),
  s("~ cp ~ cp").gain(.45),
  fillLast(8),
  bass("0 7 0 7 0 7 [4 2] [0 <-1b 2 -1# 2 -1b 2 -1# 0>]", chorusScales).gain(.6),
  oohs(chorusChords).gain(.18),
  aahs(chorusChords),
  keys(chorusChords, "[~ x]*4")
    .clip(.5)
    .gain(.24)
    .mask("<0 0 0 0 1 1 1 1>"),
  sax(line(chorusMel, "F4:major"))
)

let lift = stack(
  s("bd*4").gain(.7),
  s("<[sd*4] [sd*8]>").gain(.32).velocity(saw.slow(2).range(.4, 1)),
  crashFirst(2),
  bass("0 7 0 7 0 7 [4 2] [0 <0 -1#>]", liftScales),
  keys(liftChords, "x*4").clip(.5).gain(.32),
  hornSection(line(liftMel, "Eb5:lydian")),
  line(liftMel, "Eb4:lydian").sound("gm_tenor_sax").gain(.28)
)

// Bossa feel: kick on 1 and 3 with pushes, rim-click clave
let bossaDrums = stack(
  s("bd ~ ~ bd bd ~ ~ bd").gain(.55),
  s("<[rim ~ ~ rim ~ ~ rim ~] [~ ~ rim ~ ~ rim ~ ~]>").gain(.2),
  s("~ hh ~ hh").gain(.1),
  ride.gain(.8)
)

let vibesSolo = stack(
  bossaDrums,
  crashFirst(8),
  fillLast(8),
  bass("0@3 4 4@3 <2# 2 2# 2 2# 5 -4 -1#>", vibesScales).gain(.65),
  keys(vibesChords, "[x ~ ~ x] [~ ~ x ~] [~ x ~ ~] [x ~ ~ ~]").gain(.26),
  strings(vibesChords).gain(.08),
  line(vibesSoloMel, vibesScales, 24)
    .sound("gm_vibraphone")
    .gain(.42)
    .velocity(rand.range(.75, 1))
    .room(.3)
    .delay(.12)
    .delaytime(.375)
    .pan(.42)
)

// ENDING 1: trading ones over the tag vamp. In bar 8 the
// band drops out and the horns play the last lick together.
let band = "<1 1 1 1 1 1 1 0>"
let trade = degrees => line(degrees, tradeScales, 24)

let trades = stack(
  funkDrums.mask(band),
  ride.mask(band),
  crashFirst(8),
  s("<~ ~ ~ ~ ~ ~ ~ [bd ~ ~ ~]>").gain(.6),
  bass("[0 ~ ~ 0] [~ ~ 7 ~] [6 ~ 4 ~] [2 ~ 0 ~]", tradeScales).mask(band),
  keys(tradeChords).mask(band),
  clav(tradeChords).mask(band),
  trade(tenorTrades).sound("gm_tenor_sax").gain(.48).room(.3).pan(.4),
  trade(vibesTrades).sound("gm_vibraphone").gain(.42).room(.3).pan(.6),
  trade(guitarTrades).sound("gm_overdriven_guitar").gain(.34).lpf(4000).room(.3).pan(.55),
  trade(trumpetTrades).sound("gm_trumpet").gain(.36).room(.3).pan(.62),
  hornSection(stack(trade(tuttiBreak), trade(tuttiBreak).transpose(-12)))
)

// ENDING 2: the intro comes back. Its three-note cell
// planes down with the add9 chords, Eb Db B A, with the
// third in the bass as before.
let cell = "[[~ 4] [2 1] 0@2]"

let bookend = stack(
  crashFirst(4),
  ride.gain(.5),
  s("~ ~ ~ rim").gain(.1),
  bookendChords.voicing().sound("gm_epiano1").gain(.38).room(.4),
  strings(bookendChords),
  oohs(bookendChords),
  bass("[2@3 [~ -5]]", bookendScales).gain(.6),
  line(cell, bookendScales, 36).sound("gm_vibraphone").gain(.32).room(.45),
  flute(line(cell, bookendScales, 24)).gain(.2)
)

// ENDING 3: the last whole-step drop lands on G, and the
// final G^9#11 chord is built one instrument at a time,
// a new voice every two beats, under a rising ride roll.
// Degrees are in G lydian: 4 = d, 9 = b, 13 = f#,
// 15 = a, 17 = c# (the #11), 19 = e.
let enter = (degrees, sound, gain) =>
  line(degrees, "G3:lydian").slow(2).sound(sound).gain(gain).room(.5)

let finale = stack(
  s("[bd,cr]").slow(2).gain(.55),
  s("rd*16").gain(.09).velocity(saw.slow(2).range(.3, 1)),
  chord("G^9").voicing().slow(2).sound("gm_epiano1").gain(.42).room(.5),
  strings(chord("G^9")).slow(2),
  bass("0", "G1:major").slow(2),
  enter("[~ 4@7]", "gm_tenor_sax", .3),
  enter("[~ ~ 9@6]", "gm_alto_sax", .3),
  enter("[~ ~ ~ 13@5]", "gm_trumpet", .26),
  enter("[~ ~ ~ ~ 15@4]", "gm_vibraphone", .32),
  enter("[~ ~ ~ ~ ~ 17@3]", "gm_flute", .2),
  enter("[~ ~ ~ ~ ~ ~ 19@2]", "gm_electric_guitar_jazz", .3)
)

// ==========================================================
// THE SONG (138 bars)
// ==========================================================

let song = [
  [4, introA],
  [4, introB],
  [8, verse()],
  [6, pre],
  [10, chorus()],
  [8, soli],
  [8, verse(true)],
  [6, pre],
  [10, chorus({ answer: true })],
  [4, riff],
  [8, bridge],
  [2, drumBreak],
  [8, guitarSolo],
  [8, vibesSolo],
  [8, acappella],
  [2, lift],
  [10, chorus({ key: 2, answer: true })],
  [10, chorus({ key: 2, answer: true, big: true })],
  [8, trades],
  [4, bookend],
  [2, finale]
]

$: arrange(
  ...song.map(([bars, section]) => [bars, section.swingBy(SWING, 8)])
)
