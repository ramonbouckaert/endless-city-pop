# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev            # dev server at http://localhost:5173
npm run build          # production build
npm run preview        # serve the production build (required before npm run smoke)
npm test               # vitest unit tests + check:songs on 12 seeds
npm run check:songs -- 25          # sweep 25 seeds' scores and MIDI for problems
npm run song -- mySeed             # print a song's outline
npm run midi -- mySeed             # write mySeed.mid (a second argument names the file)
npm run soundfont      # rebuild the app's soundfont (after changing what a song can play)
npm run levels         # measure SOUND_LEVELS on the app's soundfont (prints the table to paste in)
npm run smoke          # Playwright smoke test (needs npm run preview running)
npm run format         # Prettier
npm run typecheck      # tsc type-check only
```

To run a single vitest test file or a named test:

```sh
npx vitest run test/model.test.ts
npx vitest run -t "writes complete songs"
```

Scripts (`scripts/*.ts`) cannot be run with Node directly — `scripts/run-node.sh` bundles them with esbuild first, because `src/` imports its modules without file extensions.

## Architecture

### Layers

```
src/
  lib/      generic helpers: seeded Rng (+ Weighted/Range types), 16-step drum bars, katakana romaji, General
            MIDI (GM programs, percussion keys)
  theory/   music theory as values: Scale, Key, Chord, Roman, Template, parseChordSpec + their tables
  style/    the city-pop style as data: tonalities/ (one file per mode), form odds, section variants, section rhythms,
            drum recipes, bass feels, melody cells, harmony palette, instruments, title words
  model/    Form and the generators: form-planner, harmony, solo-changes, melody, bass, drums, groove, sections/
            (one writer per type), orchestration (Instruments, Kit), title, Song
  score/    the song as timed notes: ScoreArranger, ScoreBand, drums, figures (as data), mix.ts (each part's
            level), sections/ (one recipe per type)
  midi/     writer.ts (Standard MIDI File bytes), from-score.ts (a song's score as MIDI, with its mix)
  app/      the browser page: main.ts (App) wires session.ts, player.ts (SpessaSynth), soundfont.ts, FormStrip,
            TitleMarquee, autoplay, midi-download; storage.ts remembers values in this browser; time.ts holds the
            pure clock helpers
src/app/soundfont/  the app's soundfont: GeneralUser GS trimmed and compressed by scripts/build-soundfont.ts
public/soundfonts/  GeneralUser GS's licence
```

Dependency rules:

- `style/` imports only from `lib/` and `theory/`. It defines the vocabulary types that name its tables' keys (`SectionType`, `DrumFeel`, `BassFeel`, `MelodyKind`, `PreFlavour`, ...). What every section type is (its label, whether the band plays through it, whether it hands over to anything) is in one table, `SECTION_TYPES` (`style/form.ts`); `SectionType`, `PlayedType` and `isPlayed` derive from it.
- `model/` reads `style/` tables and produces **plain musical data** only: chords, notes with degrees or semitones, 16-step drum gains.
- `score/` reads `model/`, `style/` and `theory/`; `midi/` builds on it. Neither touches the browser, so tests and scripts use them directly.
- `app/` is the only browser/DOM code, and the only code that loads `spessasynth_lib`. Scripts may use `spessasynth_core` (Node rendering and soundfont editing, as `scripts/measure-levels.ts` and `scripts/build-soundfont.ts` do).
- Side effects: only DOM code in `app/`, and methods changing their own class's private fields. An `Rng` passed to a function or constructor belongs to it: the caller hands on `rng.fork(label)` (forking reads only the seed) and never draws from what it handed on.

### Song pipeline

```
seed → mode, key → Form (its Sections) → materials per part → instruments → title
     → ScoreArranger: per section, its type's recipe over its material → Score (timed notes)
     → songToMidi → MIDI file → played in the browser by SpessaSynth on GeneralUser GS (and saved by Export as MIDI)
```

- `FormPlanner` (`model/form-planner.ts`) builds the sections with `section()` and returns a `Form` (`model/form.ts`), which answers everything asked of the form: section starts and bars, `next`/`after`/`previous`/`first`, how often a part has played (`repeatOf`), the soloists, the playhead, and each section's description. `SectionOf<T>` (`model/section.ts`) gives each section type its own fields (a chorus's `answer`/`big`, a solo's `soloist`, a lift's `liftTo`/`turnaround`, ...). Each `Section` has a `part` id: sections that share it play the same material (every chorus is part `chorus`); solos and lifts get one part each (`solo:0`, `solo:1`, `lift:0`, ...).
- `writeMaterials` (`model/sections/index.ts`) writes one material per part, on first use and memoised, through `WRITERS`: one writer file per section type in `model/sections/`, mirroring `score/sections/`. Writers get a `WriteContext` (the `Form`, the key's `Tonality`, `material(sec)` for other parts, shared helpers). A part can draw on another (a drum break picks up into the next section's material; a lift avoids the previous lift's variant). Shared harmony (chorus bars, hook, vamp bars, intro harmony) is computed lazily once, in `SharedHarmony`.
- `MaterialOf<T>` (`model/material.ts`) gives each section type its own material shape. `song.material(section)`, `song.part(type)` (first part of a type) and `song.parts(type)` look them up.
- Variants (`style/variants.ts`): every way a section type can be played (intro texture, vamp entry, pre-chorus flavour, solo comp, lift, outro and finale style) is a `Variants` table of weighted entries, some with their own groove. The material stores its pick as `variant`; the recipe switches on it.
- Instruments are General MIDI programs everywhere, from the style's tables to the MIDI file: `GM` (`lib/general-midi.ts`) names all 128 (`GM.electricPiano1` is 4), and `Program` is their type. Drums are General MIDI percussion keys (`PERCUSSION.snare` is 38, type `Percussion`) from the drum recipes on. Nothing translates between names and numbers; `programName` is only for MIDI track names.
- `Instruments.pick` (`model/orchestration.ts`) picks every part's instrument and the drum `Kit` (one of the soundfont's drum kits, by its program on the drum channel). `Sounds` holds a `Program` per part, read by path (`sound(path)`). Every part plays at its level in `score/mix.ts`, set for its instrument in `BAND` (the melody voices: for the alto sax); `Instruments.trim(path)` scales a different pick by its level (`SOUND_LEVELS`, keyed by program and measured on the soundfont by `npm run levels`), as postgain. `SOUNDFONT_PROGRAMS` and `SOUNDFONT_KITS` (`style/instruments.ts`) are everything a song can play: `npm run soundfont` keeps just those of GeneralUser GS (and on the kits, the drums in `PERCUSSION`), compressed to SF3, and `test/soundfont.test.ts` fails if the committed soundfont lacks any of them. A score note carries its `program` (or `'drums'`) and its MIDI `note` (a pitch, or a percussion key).
- `ScoreArranger` (`score/arranger.ts`) calls each section's recipe from `score/sections/` (one file per section type) with a `PlayedScoreContext` (the section's `Changes`, bass, lines and figures) for sections the band plays through, or a plain `ScoreContext` for a drum break or finale. Each section gets its own `ScoreBand`, which notes which parts the recipe asks for (the score's `uses`), so recipes build only parts they play. Notes carry pitch, time and length in bars, gain, velocity, postgain, clip, slides and effect controls. Chords are voiced by `theory/voicing.ts` (close position under an anchor).
- `songToMidi` (`midi/from-score.ts`) writes the score as a type-1 MIDI file: a track per sound on its General MIDI program, the drums on channel 10 on the song's kit, each track's mix as controllers (CC7 volume from its loudest note, CC10 pan, CC91 reverb, CC74 brightness for filter sweeps; delay and high-pass aren't carried), channels shared only between sounds that never play at once. The app plays this file (`app/player.ts`: SpessaSynth's `WorkletSynthesizer` and `Sequencer`, the soundfont from `src/app/soundfont/`, served under a content-hashed name and kept in Cache Storage until it changes); Export as MIDI saves it.

### Data flow for a mode

Each mode (`major`, `minor`, `dorian`, `mixolydian`) has its data (`TonalityDef`) in `style/tonalities/<mode>.ts`: chord templates per section type, pre-chorus progressions per flavour, bridge keys, key-change turnarounds, cadence chords and solo change shapes. `tonalityOf(mode)` gives it as a `Tonality` (`style/tonalities/tonality.ts`), with the lookups that can fail or need fitting (`templatesFor`, `preTemplates`, `turnaround`, `isTonic`). `Harmonizer` (`model/harmony.ts`) realises templates against the song's `Key`; `SoloChangesWriter` (`model/solo-changes.ts`) writes solo changes with it.

Generators are writer classes: the constructor takes what is decided (or a plan to pick from) and the `Rng` it owns, and `write(input)` returns a value without keeping output state on the writer (`DrumWriter`, `BassWriter`, `GrooveWriter`, `MelodyWriter`, `AnswerWriter`, `SoloWriter`, `SoloChangesWriter`, `TitleWriter`).

### Testing

Unit tests live in `test/` (`theory`, `model`, `score`, `time`, `midi`, ...). `scripts/sweep.ts` (`npm run check:songs`) generates songs and checks each one's score and MIDI (pitches in range, real times and lengths, a General MIDI program for every sound, every section playing). The browser player has no unit tests: check it with `npm run dev`, or `npm run smoke` (Playwright, with `npm run preview` running).

Songs are deterministic: the same seed always produces the same `Song`. Seeds are not stable across changes to the generators: the `snap0` snapshot in `test/__snapshots__/` is expected to change when generation changes; update it with `npx vitest run -u` when the change is intended.
