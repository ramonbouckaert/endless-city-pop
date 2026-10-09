# Strudel Songsmith

Procedurally generated jazz-funk songs, built from
music theory rules as [Strudel](https://strudel.cc) patterns and played
in the browser by Strudel itself.

Every song comes from a seed, so the same seed always gives the
same song. The app calls Strudel's functions directly to build each song
(harmony, drums, instruments, melodies, sections, then the arrangement);
it doesn't write out Strudel code.

## Quick start

```sh
npm install
npm run dev        # the app, at http://localhost:5173
npm test           # unit tests, then queries 12 songs' patterns through Strudel
npm run song -- mySeed   # print a song's outline
```

## How a song is made

```
seed ─▶ form ─▶ harmony ─▶ melody, bass ─▶ Strudel pattern
```

| Step         | Module                    | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Style        | `src/engine/constants.ts` | Every table and tunable, including jazz-funk as data: chord templates per section, tempo and swing ranges, drum and bass feels, instruments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Form         | `src/engine/form.ts`      | Built from optional parts, so length and shape vary by seed: an intro (the chorus teased, planing add9 chords, or one of several vamps and turnarounds, in one of four arrangements) and maybe a vamp; one to three verse / pre-chorus / chorus rounds (the pre-chorus and riffs may not appear at all); a middle of a bridge and up to two solos of one or two choruses each, in either order, maybe a breakdown and a drum break; then one to three last choruses, each of which may lift the key up again (by one to three semitones, up to +4 in all), an optional outro and a final chord. Repeats vary: later verses add parts, later choruses add answers and the last one a "big" layer. |
| Harmony      | `src/engine/harmony.ts`   | Roman-numeral templates realised in a major key as extended chords, then reharmonised with tritone substitutions, related ii chords and secondary dominants. Bridges move to a related key chosen by circle-of-fifths distance or a chromatic mediant, and end with a ii-V back home. Lifts into a final chorus use one of eleven jazz turnarounds into the new key: bVI-V, ii-V, tritone sub, backdoor iv-bVII, V of V, iii-VI-ii-V, a side-slipped ii-V, a sus pedal, a bare V7alt, the long way round, or Coltrane changes. Solos run ii-V pairs through keys a minor third or whole step apart.                                                                                              |
| Pre-chorus   | `src/engine/constants.ts` | Each song's pre-chorus (2 to 8 bars) takes one of five flavours, each with its own progressions, melody, drums, bass and arrangement: **climb** (a stepwise rise to V, keys opening up over a noise riser), **pedal** (long notes over a held sus dominant, strings swelling), **drop** (the drums drop out and return halfway), **stops** (stop-time band hits under a free lead) and **borrowed** (minor-key iv, bIII, bVI and bVII colour). Progressions are fitted to end on their cadence into the chorus; later rounds add a layer.                                                                                                                                                        |
| Chord-scales | `src/engine/music.ts`     | Each chord gets the mode that fits it: diatonic chords take the key's mode (dorian ii, mixolydian V, lydian IV), altered dominants take altered or phrygian dominant, tritone subs take lydian dominant, and so on. Chords are spelled by scale degree (Bb and Eb in C, never A# and D#).                                                                                                                                                                                                                                                                                                                                                                                                        |
| Melody       | `src/engine/melody.ts`    | Motif-based phrases (A B A C ...): each motif is a rhythm cell and a melodic shape (rise, arch, fall, leap and fall, ...). Repeats keep the shape and move to fit the new chord; strong beats land on chord tones; pre-chorus melodies climb a step each bar, answer themselves, or hold long notes; full cadences end on the tonic. Solos are bebop-ish runs in chord-scale degrees. Chorus answers fill the gaps the hook leaves.                                                                                                                                                                                                                                                              |
| Bass         | `src/engine/bass.ts`      | Written per section: each picks a feel from a short list (funk, disco, driving eighths, half-time, bossa, pedal) and rolls its density, syncopation, octave pops and note lengths, writes a one-bar groove in chord-scale degrees, varies it bar by bar with a fill closing each four-bar phrase, and often approaches the next chord's root (chromatically, usually).                                                                                                                                                                                                                                                                                                                           |
| Drums        | `src/engine/drums.ts`     | One kit per song (the default samples or a classic drum machine). Each section picks a feel (funk, disco, half-time, bossa, ride, claps, build) and rolls its groove: kick placement, ghost notes, hi-hat or ride in eighths or sixteenths with an accent shape, open hats, and sometimes shaker, tambourine or cowbell, with the fourth bar of each phrase varied. Sections may open with a crash and close with a fill (snare roll, toms, mixed, unison hits or a stop), a different one each repeat.                                                                                                                                                                                          |
| Pattern      | `src/engine/arranger.ts`  | `Arranger` builds the song as one Strudel pattern: a `Band` of instruments over chord and note patterns, a `stack` per section from its type's recipe, and `arrange` over the form. Note sequences are mini-notation strings, Strudel's own sequence language.                                                                                                                                                                                                                                                                                                                                                                                                                                   |

The song model (everything but `arranger.ts`) has no dependencies. `src/strudel.ts` runs Strudel's scheduler on Web Audio
(`@strudel/webaudio`, General MIDI soundfonts and the same drum samples
strudel.cc loads).

## Checking songs without listening

`scripts/checker.ts` queries every bar of a song's pattern and reports
mini-notation errors, unknown sound names and notes out of range. `npm run check:songs
-- 25` sweeps 25 seeds. `npm run smoke` (with `npm run preview`
running) loads the built app in Chromium and presses Play.

## Licence

Strudel is licensed under the GNU AGPL 3.0, and this app bundles it, so
this project is AGPL-3.0-or-later too (see `LICENSE`). If you host it,
the source must stay available to its users.
