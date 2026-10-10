# Endless City Pop

Endless, procedurally generated city pop: songs in the jazz-funk harmony
of late-'70s and '80s Japanese pop, in major, minor, dorian and
mixolydian keys, each with a bilingual title (真夜中のドライブ (Midnight
Drive)), one after another. They're built from music theory rules,
written out as MIDI, and played in the browser on the
[GeneralUser GS](https://www.schristiancollins.com/generaluser.php)
soundfont by [SpessaSynth](https://github.com/spessasus/spessasynth_lib).

Every song comes from a seed, so the same seed always gives the
same song: its harmony, drums, instruments, melodies and sections, then
the arrangement, as timed notes (a score) and a MIDI file.

## Quick start

```sh
npm install
npm run dev        # the app, at http://localhost:5173
npm test           # unit tests, then checks 12 songs' scores and MIDI
npm run song -- mySeed   # print a song's outline
npm run midi -- mySeed   # write mySeed.mid
```

## How a song is made

```
seed ─▶ mode, key ─▶ form ─▶ harmony ─▶ melody, bass ─▶ score ─▶ MIDI ─▶ soundfont synth
```

### Modes

A seed picks a mode, and the mode's
**tonality** (`TONALITIES` in `src/style/tonalities/`) supplies its
progressions, tonic chord, cadence, bridge keys, key-change turnarounds
and final chord:

| Mode       | Sound                                                                                                                                                                                                                         | Tonic                   | Cadence home      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------- |
| Major      | ii-V-I jazz-funk: secondary dominants, iii-VI-ii-V, borrowed iv and bVI.                                                                                                                                                      | maj9, maj7, 6/9         | ii-V              |
| Minor      | Jazz minor (Autumn Leaves, Blue Bossa): the minor ii-V-i with a half-diminished ii and an altered or b9 V, the aeolian cycle iv-bVII-bIII-bVI, the Andalusian i-bVII-bVI-V, the dorian IV7, the Neapolitan bII and bII7 subs. | m9, m6/9, m(maj9)       | iiø-V7alt         |
| Dorian     | Modal funk (So What, Chameleon): long stretches of the dorian m7 and its bright IV7, bIII and bVII from the parent major. Fewer reharmonisations, since the music sits rather than cadences.                                  | m9, m11                 | bVII-IV7 (plagal) |
| Mixolydian | Soul-jazz on a dominant tonic (Cissy Strut, Watermelon Man): I7 against bVII and IV, eight-bar blues, the funk 7#9.                                                                                                           | 13, 9, 7#9 (unresolved) | IV-bVII           |

A minor key's V is always an altered or b9 dominant (phrygian dominant or
altered scale), even when it leads into the next section, and a minor
sus V can be the phrygian 7b9sus. Bridges in minor visit the relative
major, bVI, iv minor or the Neapolitan; dorian bridges go to the parent
major or a half step up, as in So What.

| Step         | Module                      | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style        | `src/style/`                | Every table and tunable, the style as data: each mode's tonality (`tonalities/`), form odds, section rhythms, drum recipes and bass feels, melody cells and phrase forms, harmony colours, instruments and title words. The generators in `src/model/` read these; nothing in `style/` rolls dice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Form         | `src/model/form-planner.ts` | Built from optional parts, so length and shape vary by seed: an intro (the chorus teased, planing add9 chords, or one of several vamps and turnarounds, in one of four arrangements) and maybe a vamp; one to three verse / pre-chorus / chorus rounds (the pre-chorus and riffs may not appear at all); a middle of a bridge and up to two solos of one or two choruses each, in either order, maybe a breakdown and a drum break; then one to three last choruses, each of which may lift the key up again (by one to three semitones, up to +4 in all), an optional outro and a final chord. Repeats vary: later verses add parts, later choruses add answers and the last one a "big" layer.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Harmony      | `src/model/harmony.ts`      | Roman-numeral templates realised in the song's key and mode as extended chords (the tonic coloured by mode), then reharmonised with tritone substitutions, related ii chords and secondary dominants (a mixolydian I7 is never tritone-subbed: it is home). Bridges move to a related key chosen by circle-of-fifths distance or a chromatic mediant, and end with the mode's cadence back home. Lifts into a final chorus use one of the mode's jazz turnarounds into the new key; in major: bVI-V, ii-V, tritone sub, backdoor iv-bVII, V of V, iii-VI-ii-V, a side-slipped ii-V, a sus pedal, a bare V7alt, the long way round, or Coltrane changes; minor adds the Neapolitan and Andalusian, dorian a plagal and aeolian approach and a half-step side-slip. Solos are written in eights, each ending with the mode's cadence home: its two-bar pair (ii-V in major, iiø-V7alt in minor, i-IV in dorian, I-bVII in mixolydian) moving through keys a step apart, two bars on the home tonic first, or one of the song's vamps; then reharmonised, each chord taking its scale from its pair's key. A 16-bar solo is two different eights. |
| Pre-chorus   | `src/style/variants.ts`     | Each song's pre-chorus (2 to 8 bars) takes one of five flavours, each with its own progressions, melody, drums, bass and arrangement: **climb** (a stepwise rise to V, keys opening up over a noise riser), **pedal** (long notes over a held sus dominant, strings swelling), **drop** (the drums drop out and return halfway), **stops** (stop-time band hits under a free lead) and **borrowed** (colour from outside the key: minor-key iv, bIII, bVI and bVII in major; dorian IV7 and the Neapolitan in minor). Progressions are fitted to end on their cadence into the chorus; later rounds add a layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Chord-scales | `src/theory/chord.ts`       | Each chord gets the mode that fits it: diatonic chords take their mode in the key (dorian ii, mixolydian V, lydian IV in major; dorian iv, lydian bVI in minor), altered dominants take altered or phrygian dominant, tritone subs take lydian dominant, a minor m(maj7) melodic minor, and so on. Every mode is placed by its relative major, which also sets its spelling (F# dorian with sharps, Eb dorian with flats). Chords are spelled by scale degree (Bb and Eb in C, never A# and D#).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Melody       | `src/model/melody.ts`       | Motif-based phrases (A B A C ...): each motif is a rhythm cell and a melodic shape (rise, arch, fall, leap and fall, ...). Repeats keep the shape and move to fit the new chord; strong beats land on chord tones; pre-chorus melodies climb a step each bar, answer themselves, or hold long notes; full cadences end on the tonic. Solos are bebop-ish runs in chord-scale degrees. Chorus answers fill the gaps the hook leaves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bass         | `src/model/bass.ts`         | Written per section: each picks a feel from a short list (funk, disco, driving eighths, half-time, bossa, pedal) and rolls its density, syncopation, octave pops and note lengths, writes a one-bar groove in chord-scale degrees, varies it bar by bar with a fill closing each four-bar phrase, and often approaches the next chord's root (chromatically, usually).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Drums        | `src/model/drums.ts`        | One kit per song (one of the soundfont's General MIDI drum kits: standard, room, power, electronic, 808/909, dance or jazz). Each section picks a feel (funk, disco, half-time, bossa, ride, claps, build) and rolls its groove: kick placement, ghost notes, hi-hat or ride in eighths or sixteenths with an accent shape, open hats, and sometimes shaker, tambourine or cowbell, with the fourth bar of each phrase varied. Sections may open with a crash and close with a fill (snare roll, toms, mixed, unison hits or a stop), a different one each repeat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Score        | `src/score/`                | `ScoreArranger` writes the song as timed notes: a `ScoreBand` of instruments over the section's chords and lines, each section by its type's recipe (`score/sections/`), shifted into its key, swung and placed on the form. Chords are voiced in close position under each part's top note. `src/midi/from-score.ts` writes the score as a MIDI file with each track's mix.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Everything up to the MIDI file (`src/theory/`, `src/style/`,
`src/model/`, `src/score/` and `src/midi/`) has no dependencies: a song
is plain musical data. `src/app/player.ts` plays the MIDI file in the
browser with SpessaSynth (an AudioWorklet synthesizer and sequencer) on
GeneralUser GS, kept in the browser's Cache Storage after the first
visit.

### The soundfont

The app doesn't serve all of GeneralUser GS (32 MB): `npm run soundfont`
(`scripts/build-soundfont.ts`) builds a 4 MB copy with only what a song
can play. It downloads the full bank once into `node_modules/.cache`,
keeps the instruments in `SOUNDFONT_PROGRAMS` and the drum kits in
`SOUNDFONT_KITS` (`src/style/instruments.ts`), and on those kits only the
drums the band plays, then compresses the samples to Ogg Vorbis (SF3;
`--quality` sets the Vorbis quality, 4 by default). The result is
committed as `src/app/soundfont/GeneralUser-GS-city-pop.sf3`. If a song
can play something the file lacks (a new instrument in the style's
lists), `test/soundfont.test.ts` fails until you run it again.

## Playing

The **↻** button writes a new song; **Play** starts it from its first
bar (and becomes **Stop**), with the section playing glowing and a
playhead line moving across the form. With **Autoplay** on (the default; the browser remembers if you
turn it off), a new song takes over a second after each song's final
chord, so the music keeps going; with it off, a song stops at its end. The
first Play waits for the soundfont to load (the button says so).

## Instruments

`src/style/instruments.ts` says which instruments play which part. An
instrument is a General MIDI program (`GM.electricPiano1` is 4, from
`src/lib/general-midi.ts`) all the way through, and a drum is a General
MIDI percussion key (`PERCUSSION.snare` is 38). Each song picks:

- **Melody voices**: a lead, its octave double and four soloists from
  `VOICES.pool`: saxes, clarinet, flute, harmonica, trumpets, trombone,
  French horn, brass, jazz and overdriven guitar, piano, organs,
  glockenspiel, vibraphone, pads, effects and oohs.
- **The band's other parts** from `PICKS`: keys (electric pianos,
  clavinet, piano, organs), rhythm guitar (muted, jazz, clean,
  nylon), pad, strings, choir, answering brass or flute, bell (vibes and
  other mallets), horn stabs and their second voice, and bass (electric,
  slap, fretless, upright, synth).
- **A drum kit** from `KITS`: one of GeneralUser GS's drum kits,
  mostly the standard ones, sometimes room, power, electronic, 808/909,
  dance or jazz.

No song plays one sound in two parts while a part has another to choose.
Sounds play louder or quieter by their level in `SOUND_LEVELS`, measured
by `npm run levels` (`scripts/measure-levels.ts`): it renders the same
phrase on every instrument offline (SpessaSynth in Node, on the app's
soundfont) and compares loudness. Run it again after changing the
soundfont or the instruments a song picks from.

## MIDI export

**Export as MIDI** in the app (or `npm run midi`) downloads the song
as a type-1 Standard MIDI File: one track per instrument with its General
MIDI program (Rhodes, clavinet, finger bass, alto sax, ...), drums on
channel 10 in General MIDI percussion keys, and a conductor track with
the tempo, 4/4, the key signature (minor, or the relative major's for a
mode) and a marker at each section. It is the same file the app plays,
so it has exactly what you hear, swing included: each track's volume,
pan, reverb and filter sweeps as controllers, the song's drum kit, and
the risers as reverse cymbals (delay doesn't carry over). Later key
changes keep the opening key signature. `src/midi/from-score.ts` builds
it from the score; `src/midi/writer.ts` writes the bytes.

## Checking songs without listening

`npm run check:songs -- 25` sweeps 25 seeds, checking each song's score
and MIDI file: pitches in range, real times and lengths, a General MIDI
program for every sound, and every section playing something. `npm run
smoke` (with `npm run preview` running) loads the built app in Chromium
and presses Play.

## Licence

This project is AGPL-3.0-or-later (see `LICENSE`): if you host it, the
source must stay available to its users. It bundles SpessaSynth
(Apache-2.0) and serves its own copy of GeneralUser GS by S. Christian
Collins, whose licence is in `public/soundfonts/GeneralUser-GS-LICENSE.txt`.
