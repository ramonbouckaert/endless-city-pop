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
npx vitest run test/song.test.ts
npx vitest run -t "writes complete songs"
```

Scripts (`scripts/*.ts`) cannot be run with Node directly — `scripts/run-node.sh` bundles them with esbuild first, because `src/` imports its modules without file extensions.

## Architecture

### Layers

```
src/
  lib/      generic helpers: seeded Rng (+ Weighted/Odds/Range types), 16-step drum bars, katakana romaji, General
            MIDI (GM programs, percussion keys), Timeline (bars to quarter notes and seconds, through tempo changes)
  theory/   music theory as classes (statics, not loose functions): PitchClass, Scale, Key, Chord, Voicing, Roman,
            Template + their tables
  style/    the city-pop style as data: tonalities/ (one file per mode), form odds, section variants, section rhythms
            (every section's groove), drum recipes, bass feels, melody cells, harmony palette, instruments, the mix
            (each part's level), fixed rhythms and figures, title words
  engine/   the song and its score, in four folders (each pipeline step depends only on later ones; score/ on song/
            just for types):
    song/       Song (seed → everything), FormPlanner, Instruments and Kit (orchestration.ts), TitleWriter
    sections/   section.ts (the Section base, plans and PlayedMaterial), Form, BuildContext, ScoreContext, then one
                file per kind of section: its writer and its recipe
    writers/    the generators of material: Harmonizer (and SoloChangesWriter), MelodyWriter, AnswerWriter,
                SoloWriter (solo-line.ts), BassWriter, DrumWriter, and Line, the base of their lines
    score/      score.ts (ScoreNote, Part, Changes, and style rhythms and figures placed in time), ScoreBand,
                ScoreArranger
  midi/     writer.ts (Standard MIDI File bytes), from-score.ts (a song's score as MIDI, with its mix)
  app/      the browser page: main.ts (App: every action, from the buttons, form strip, media controls and
            autoplay, and render()), transport.ts (the song, whether it plays, where it is; play/stop/next/seek),
            player.ts (SynthPlayer: SpessaSynth), soundfont.ts, media-session.ts (MediaControls.update: lock-screen
            metadata, position and buttons), FormStrip, TitleMarquee, autoplay, midi-download; storage.ts remembers
            values in this browser; time.ts holds the pure clock helpers
src/app/soundfont/  the app's soundfont: GeneralUser GS trimmed and compressed by scripts/build-soundfont.ts
public/licenses/   the licences of what the app ships (GeneralUser GS, SpessaSynth); vite.config.ts writes
                    licenses/index.html listing them, linked from the footer
artwork/           artwork.svg, the app's picture; images.ts makes favicon.svg (on a rounded tile) and artwork.png (the
                    media controls', rendered by Playwright's Chromium) from it, which vite.config.ts builds and serves
```

Dependency rules:

- Every folder's `index.ts` is the only way in from outside it: it exports what other folders use, and nothing reaches past it into another folder's files (`engine/index.ts` is the engine's public API, for `midi/`, `app/`, tests and scripts). Within a folder, files import each other directly.
- `style/` imports only from `lib/` and `theory/`. It defines the vocabulary types that name its tables' keys (`DrumFeel`, `BassFeel`, `PreFlavour`, ...). It knows nothing of section classes: data that belongs to a kind of section is a plain value the class picks up (`GROOVES.verse`, `MELODIES.chorus`, a melody style per pre-chorus flavour, `tonality.templates.verse`). Weights are `Weighted<T>` ([item, weight] pairs) for any choice, `Odds<K>` ({ name: weight }) for choices named by strings, and a `weight` field on `Variants` entries; a plain list in a style table is picked from uniformly (its entries are not repeated to weight them).
- `engine/` reads `style/` tables and `theory/`. A `Song` is **plain musical data** only (chords, notes with degrees or semitones, 16-step drum gains); `ScoreArranger` turns it into timed notes. `midi/` builds on it. Neither touches the browser, so tests and scripts use them directly.
- `app/` is the only browser/DOM code, and the only code that loads `spessasynth_lib`. Scripts may use `spessasynth_core` (Node rendering and soundfont editing, as `scripts/measure-levels.ts` and `scripts/build-soundfont.ts` do).
- Side effects: only DOM code in `app/`, and methods changing their own class's private fields. An `Rng` passed to a function or constructor belongs to it: the caller hands on `rng.fork(label)` (forking reads only the seed) and never draws from what it handed on.

### Song pipeline

```
seed → mode, key → plan (Form<SectionPlan>) → Form of sections, each built with its part's material → instruments → title
     → ScoreArranger: per section, its type's recipe over its material → Score (timed notes)
     → songToMidi → MIDI file → played in the browser by SpessaSynth on GeneralUser GS (and saved by Export as MIDI)
```

- No section kind is ever named by a string: a kind of section is its class (`Chorus`, `SoloSection`, ...), and everything that tells kinds apart asks the class, through its statics (`id`, `label`, `short`, `handsOver`), `kind === Chorus`, or `instanceof`. A class's `id` is the one string for it (part ids, seed labels, the page's CSS classes).
- `FormPlanner` (`engine/song/form-planner.ts`) plans the form from independent rolls (`style/form.ts`): an intro and perhaps a vamp; rounds of a verse and pre-chorus (if the song has verses, `FORM.verseChance`) and a chorus (8, 10 or 16 bars, `FORM.chorusBars`: sixteen is a theme in four-bar phrases); the middle; the last choruses and the ending. A verseless song of sixteen-bar choruses after a vamp is J-Cycle's form. The plan's form is a `Form<Plan>` of plain plan entries made with `planned(Chorus, 8, { answer, big })` (`engine/sections/section.ts`; each plan carries its `kind`, the class, and that class's own fields, typed from its constructor: a chorus's `answer`/`big`, a solo's `soloist`, a lift's `turnaround`, ...; a lift's `shift` is the key it lifts to). `buildForm` (`engine/sections/index.ts`) builds the song's `Form` of sections from it. `Form` (`engine/sections/form.ts`, generic over what it holds) answers everything asked of a form: section starts and bars, `next`/`previous`/`first(Kind)`/`ofType(Kind)`, how often a part has played (`repeatOf`), the playhead, and (for sections) each one's description. Every section has a `part` id: sections that share it play the same material (every chorus is part `Chorus.id`); solos and lifts get one part each (`solo:0`, `solo:1`, `lift:0`, ...).
- Each kind of section is a class in its own file in `engine/sections/` (`Chorus`, `PreChorus`, `SoloSection`, ...), extending the abstract `Section<M>` (`engine/sections/section.ts`, `M` its material). The file declares everything about the kind: its statics, its plan fields (`ChorusFields`, merged into the class with `interface Chorus extends Readonly<ChorusFields> {}`; the base constructor copies them from the plan, and keeps the `plan`), its material (`ChorusMaterial`), how it writes it and how it plays it. A section has `kind`, `bars`, `part`, `shift`, its own fields, a readonly `material`, `parts(band, repeat)` (its notes: one list of `Part`s, drums first) and `describe()`. A section the band plays through extends `PlayedSection<M>`, whose `parts` calls the kind's recipe, `play(ctx)`, with a `PlayedScoreContext`; a drum break and the finale implement `parts` themselves. `KINDS` (`engine/sections/index.ts`) lists every class; `AnySection` (the union a song's form holds, narrowed with `instanceof`) and `Material` derive from it. A section's constructor takes its plan and a `BuildContext` (`engine/sections/build-context.ts`: the key, the `plan`, `section(plan)` for another section and `first(Kind)`, built on first use, `previous(this)` and `firstChordAfter(this)`, shared helpers): it writes its material in `ctx.material(this, (rng) => ...)`, which runs once per part (on the part's own stream) and gives later sections of the part the same material. A part can draw on another (a drum break or a lift picks up into the next section's first chord, so that section is built first; a lift avoids the previous lift's variant). Material is always in the song's key (a bridge's in its own): a section after a key change, and the lift into it, play it transposed by their `shift`. Shared harmony (`chorusBars`, `hook`, `vampBars`, `introBars`) is computed lazily once, on the `BuildContext`. In `play`, `this` is the section and `this.material` its material.
- Each kind's material extends `PlayedMaterial` (`engine/sections/section.ts`) if the band plays through it, and never repeats the section's fields (an outro's variant and a lift's turnaround are the section's). `section.material` is a section's; `song.part(Kind)` (first part of a kind) and `song.parts(Kind)` are views over the sections.
- Variants (`style/variants.ts`): every way a section type can be played (intro texture, vamp entry, pre-chorus flavour, solo comp, lift, outro and finale style) is a table of weighted entries: `Odds` where a variant is just a name, `Variants` where it carries more. Intro, pre-chorus, solo and outro variants each carry their own groove (drum and bass feels, `groove`); the other played types have one each in `GROOVES` (`style/rhythm.ts`). The material stores its pick as `variant`; the recipe switches on it.
- Instruments are General MIDI programs everywhere, from the style's tables to the MIDI file: `GM` (`lib/general-midi.ts`) names all 128 (`GM.electricPiano1` is 4), and `Program` is their type. Drums are General MIDI percussion keys (`PERCUSSION.snare` is 38, type `Percussion`) from the drum recipes on. Nothing translates between names and numbers; `programName` is only for MIDI track names.
- `Instruments.pick` (`engine/song/orchestration.ts`) picks every part's instrument and the drum `Kit` (one of the soundfont's drum kits, by its program on the drum channel). `Sounds` holds a `Program` per part, read by path (`sound(path)`). Every part plays at its level in `MIX` (`style/mix.ts`; recipes pick a named level, such as `keysUnder` or `comp`, through the band's methods), set for its instrument in `BAND` (the melody voices: for the alto sax); `Instruments.trim(path)` scales a different pick by its level (`SOUND_LEVELS`, keyed by program and measured on the soundfont by `npm run levels`), as postgain. `SOUNDFONT_PROGRAMS` and `SOUNDFONT_KITS` (`style/instruments.ts`) are everything a song can play: `npm run soundfont` keeps just those of GeneralUser GS (and on the kits, the drums in `PERCUSSION`), compressed to SF3, and `test/soundfont.test.ts` fails if the committed soundfont lacks any of them. A score note carries its `program` (or `'drums'`) and its MIDI `note` (a pitch, or a percussion key).
- Time: every bar is 4/4 (sixteen sixteenths), and times are in bars. A section may change the tempo (`Section.tempo`: a fermata finale, or a section whose plan holds its last bar on a `fermata`, a moment of tension mid-song: `FORM.fermataChance`, on a pre-chorus, bridge, breakdown or lift), and `song.timeline` (`lib/timeline.ts`, built from `Form.tempos`) turns bars into quarter notes (MIDI ticks, with tempo events) and seconds (the app's clock, seek and length).
- `ScoreArranger` (`engine/score/arranger.ts`) asks each section for its `parts`, on a `ScoreBand` of its own (`engine/sections/score-context.ts` holds `ScoreContext` and `PlayedScoreContext`: the section's `Changes`, bass, lines and figures). The band keeps bass notes at or above `Chord.BASS_LOW`. The arranger transposes a section's parts by its `shift`, all but the drums and effects (notes with no `path`, such as the riser) and swings them. A section may play some parts on sounds of its own (`Section.sounds`, given the song's: a solo's or bridge's keys swapped to clavinet or organ, never to a sound the song's keys or a melody voice already plays). Lines turn into notes with `Line.notes` (a solo's with `Solo.play`, `engine/writers/solo-line.ts`). Everything placed in a bar is on sixteenths (melody cells are written in eighths and parsed onto them), but for a few ornaments between them: thirty-second trills and glissandos, and triplets (the bell tree in `LAYERS`, the ostinato's last beat, a quarter-note-triplet echo); `loopBars` (`lib/steps.ts`) loops bars of anything over a section. Notes carry pitch, time and length in bars, gain, velocity, postgain, clip, slides and effect controls. Chords are voiced by `Voicing` (`theory/voicing.ts`) under an anchor (a part's `anchor` in `MIX`), in the song's `voicings`: comping close or in fourths (a dominant's over its guide tones), sustained parts close or spread. A voicing makes room for a melody: a section's `melodyOver(ctx)` (its lead's line, or a teaser's) rides on its `Changes` (`ctx.C`), and each chord hit drops voicing notes a semitone or minor ninth from the melody's long notes over it (`MELODY_HELD`), keeping at least three.
- `songToMidi` (`midi/from-score.ts`) writes the score as a type-1 MIDI file: a track per sound on its General MIDI program, the drums on channel 10 on the song's kit, each track's mix as controllers (CC7 volume from its loudest note, CC10 pan, CC91 reverb, CC74 brightness for filter sweeps: a note's `Controls` are just these), channels shared only between sounds that never play at once. The app plays this file (`app/player.ts`: SpessaSynth's `WorkletSynthesizer` and `Sequencer`, the soundfont from `src/app/soundfont/`, served under a content-hashed name and kept in Cache Storage until it changes); Export as MIDI saves it.

### Data flow for a mode

Each mode (`major`, `minor`, `dorian`, `mixolydian`, `phrygian`) has its data (`TonalityDef`) in `style/tonalities/<mode>.ts`: chord templates per section type, pre-chorus progressions per flavour, bridge keys, key-change turnarounds, cadence chords and solo change shapes. `tonalityOf(mode)` gives it as a `Tonality` (`style/tonalities/tonality.ts`), with the lookups that can fail or need fitting (`bridges`, `preTemplates`, `turnaround`, `isTonic`). A melody is written in a `MelodyStyle` (`style/melody.ts`: range, cells, and phrase forms or a loop), not by naming the section it is for. `Harmonizer` (`engine/writers/harmony.ts`) realises templates against the song's `Key`; `SoloChangesWriter` (also `engine/writers/harmony.ts`) writes solo changes with it.

Generators are writer classes: the constructor takes what is decided (or a plan to pick from) and the `Rng` it owns, and `write(input)` returns a value without keeping output state on the writer (`DrumWriter`, `BassWriter`, `MelodyWriter`, `AnswerWriter`, `SoloWriter`, `SoloChangesWriter`, `TitleWriter`).

### Testing

Unit tests live in `test/` (`theory`, `song`, `form`, `score`, `sections`, `time`, `midi`, ...). `scripts/sweep.ts` (`npm run check:songs`) generates songs and checks each one's score and MIDI (pitches in range, real times and lengths, a General MIDI program for every sound, every section playing). The browser player has no unit tests: check it with `npm run dev`, or `npm run smoke` (Playwright, with `npm run preview` running).

Songs are deterministic: the same seed always produces the same `Song`. Seeds are not stable across changes to the generators: the `snap0` snapshot in `test/__snapshots__/` is expected to change when generation changes; update it with `npx vitest run -u` when the change is intended.
