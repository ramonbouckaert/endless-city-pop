# Strudel Songsmith

Procedurally generated pop, rock, jazz and jazz-funk songs, written as
[Strudel](https://strudel.cc) code from music theory rules and played in
the browser by Strudel itself.

Every song comes from a seed, so the same seed and style always give the
same song. The output is ordinary Strudel code laid out like a
hand-written piece (harmony, drums, instruments, melodies, sections, then
the arrangement), so you can edit it in the app, or paste it into
strudel.cc.

## Quick start

```sh
npm install
npm run dev        # the app, at http://localhost:5173
npm test           # unit tests, then plays 12 songs through Strudel headlessly
npm run song -- mySeed pop > song.js   # print a song's code
npm run check -- song.js                # play a file headlessly and report problems
```

## How a song is made

```
seed ─▶ form ─▶ harmony ─▶ melody, bass ─▶ Strudel code
```

| Step         | Module                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style        | `src/engine/styles.js`  | Data for jazz-funk, pop, rock and jazz: chord templates per section, tempo and swing ranges, drum and bass feels, instruments.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Form         | `src/engine/form.js`    | Intro, verse, pre-chorus, chorus, riff, bridge, drum break, solos, breakdown, lift, outro and a final chord, with lengths, energy and per-repeat variations (second verse adds parts, later choruses add answers and a "big" layer, the last choruses can move up a key).                                                                                                                                                                                                                                                        |
| Harmony      | `src/engine/harmony.js` | Roman-numeral templates realised in a key and coloured to the style (triads and power chords for rock, add9 and sevenths for pop, extended chords for jazz). Jazz styles reharmonise with tritone substitutions, related ii chords and secondary dominants. Bridges move to a related key chosen by circle-of-fifths distance or a chromatic mediant, and end with a ii-V back home. Final choruses can lift a half or whole step via bVI-V of the new key. Solos run ii-V pairs through keys a minor third or whole step apart. |
| Chord-scales | `src/engine/theory.js`  | Each chord gets the mode that fits it: diatonic chords take the key's mode (dorian ii, mixolydian V, lydian IV), altered dominants take altered or phrygian dominant, tritone subs take lydian dominant, and so on. Chords are spelled by scale degree (Bb and Eb in C, never A# and D#).                                                                                                                                                                                                                                        |
| Melody       | `src/engine/melody.js`  | Motif-based phrases (A B A C ...): each motif is a rhythm cell and a melodic shape (rise, arch, fall, leap and fall, ...). Repeats keep the shape and move to fit the new chord; strong beats land on chord tones; pre-chorus motifs climb a step each bar; full cadences end on the tonic. Solos are bebop-ish runs in chord-scale degrees. Chorus answers fill the gaps the hook leaves.                                                                                                                                       |
| Bass         | `src/engine/bass.js`    | A rhythm template per feel (funk, disco, half-time, bossa, walking, rock eighths, ...) played in chord-scale degrees, with an approach note into each next chord (chromatic for jazz, diatonic or fifth for pop and rock).                                                                                                                                                                                                                                                                                                       |
| Drums        | `src/engine/drums.js`   | Grooves per feel, a crash on each section's first bar and a crescendo snare fill on its last.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Code         | `src/engine/codegen.js` | Writes it all out as Strudel code, in the layout of `examples/claudes-song.strudel.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                          |

The engine has no dependencies; Strudel is only needed to play the
result. `src/strudel.js` embeds Strudel's editor and audio engine
(`@strudel/codemirror`, `@strudel/webaudio`, General MIDI soundfonts and
the same drum samples strudel.cc loads).

## Checking songs without listening

`scripts/checker.mjs` evaluates generated code with Strudel's own
transpiler and pattern engine, queries every bar, and reports mini-notation
errors, unknown sound names and notes out of range. `npm run check:songs
-- 25` sweeps 25 seeds per style. `npm run smoke` (with `npm run preview`
running) loads the built app in Chromium and presses Play.

## Licence

Strudel is licensed under the GNU AGPL 3.0, and this app bundles it, so
this project is AGPL-3.0-or-later too (see `LICENSE`). If you host it,
the source must stay available to its users.
