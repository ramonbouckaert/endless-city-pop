# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev            # dev server at http://localhost:5173
npm run build          # production build
npm run preview        # serve the production build (required before npm run smoke)
npm test               # vitest unit tests + check:songs on 12 seeds
npm run check:songs -- 25          # sweep 25 seeds for pattern errors
npm run song -- mySeed             # print a song's outline
npm run midi -- mySeed             # write mySeed.mid (a second argument names the file)
npm run smoke          # Playwright smoke test (needs npm run preview running)
npm run format         # Prettier
npm run typecheck      # tsc type-check only
```

To run a single vitest test file or a named test:

```sh
npx vitest run test/model.test.ts
npx vitest run -t "writes complete songs"
```

Scripts (`scripts/*.ts`) cannot be run with `ts-node` or `tsx` directly — `scripts/run-node.sh` bundles them with esbuild first, because several Strudel packages only resolve correctly via their `"module"` field.

## Architecture

### Layers

```
src/
  lib/      generic helpers: seeded Rng (+ Weighted/Range types), 16-step drum bars, katakana romaji
  theory/   music theory as values: Scale, Key, Chord, Roman, Template, parseChordSpec + their tables
  style/    the city-pop style as data: tonalities/ (one file per mode), form odds, section variants, section rhythms,
            drum recipes, bass feels, melody cells, harmony palette, instruments, title words
  model/    Form and the generators: form-planner, harmony, solo-changes, melody, bass, drums, groove, sections/
            (one writer per type), orchestration (Instruments, Kit), title, Song
  render/   Strudel only: notation.ts (mini-notation strings), mix.ts (each part's level), band.ts, drums.ts,
            sections/, arranger.ts
  midi/     writer.ts (Standard MIDI File bytes), from-pattern.ts (reads a Strudel pattern back out)
  app/      the browser page: main.ts (App) wires session.ts, player.ts, FormStrip, TitleMarquee, autoplay,
            midi-download, debug/ (Choices, DebugPanel); storage.ts remembers values in this browser;
            time.ts holds the pure clock helpers
```

Dependency rules:

- `style/` imports only from `lib/` and `theory/`. It defines the vocabulary types that name its tables' keys (`SectionType`, `DrumFeel`, `DrumSound`, `BassFeel`, `MelodyKind`, `PreFlavour`, ...). What every section type is (its label, whether the band plays through it, whether it hands over to anything) is in one table, `SECTION_TYPES` (`style/form.ts`); `SectionType`, `PlayedType` and `isPlayed` derive from it.
- `model/` reads `style/` tables and produces **plain musical data** only: chords, notes with degrees or semitones, 16-step drum gains. Nothing in `model/` writes mini-notation or imports Strudel.
- `render/notation.ts` turns model data into mini-notation strings without importing Strudel, so tests can check it. Everything else in `render/` and `midi/from-pattern.ts` loads Strudel; unit tests and plain scripts must not import them.
- `app/` is the only browser/DOM code.
- Side effects: only DOM code in `app/`, and methods changing their own class's private fields. An `Rng` passed to a function or constructor belongs to it: the caller hands on `rng.fork(label)` (forking reads only the seed) and never draws from what it handed on.

### Song pipeline

```
seed → mode, key → Form (its Sections) → materials per part → instruments → title
     → Arranger: per section, its type's recipe over its material → Strudel pattern
```

- `FormPlanner` (`model/form-planner.ts`) builds the sections with `section()` and returns a `Form` (`model/form.ts`), which answers everything asked of the form: section starts and bars, `next`/`after`/`previous`/`first`, how often a part has played (`repeatOf`), the soloists, the playhead, and each section's description. `SectionOf<T>` (`model/section.ts`) gives each section type its own fields (a chorus's `answer`/`big`, a solo's `soloist`, a lift's `liftTo`/`turnaround`, ...). Each `Section` has a `part` id: sections that share it play the same material (every chorus is part `chorus`); solos and lifts get one part each (`solo:0`, `solo:1`, `lift:0`, ...).
- `writeMaterials` (`model/sections/index.ts`) writes one material per part, on first use and memoised, through `WRITERS`: one writer file per section type in `model/sections/`, mirroring `render/sections/`. Writers get a `WriteContext` (the `Form`, the key's `Tonality`, `material(sec)` for other parts, shared helpers). A part can draw on another (a drum break picks up into the next section's material; a lift avoids the previous lift's variant). Shared harmony (chorus bars, hook, vamp bars, intro harmony) is computed lazily once, in `SharedHarmony`.
- `MaterialOf<T>` (`model/material.ts`) gives each section type its own material shape. `song.material(section)`, `song.part(type)` (first part of a type) and `song.parts(type)` look them up.
- Variants (`style/variants.ts`): every way a section type can be played (intro texture, vamp entry, pre-chorus flavour, solo comp, lift, outro and finale style) is a `Variants` table of weighted entries, some with their own groove. The material stores its pick as `variant`; the recipe switches on it.
- `Instruments.pick` (`model/orchestration.ts`) picks every part's sound and the drum `Kit`. `Sounds` is uniform: every part is a sound name, read and replaced by path (`sound(path)`, `with(path, sound)`). Every part plays at its level in `render/mix.ts`, set for its sound in `BAND` (the melody voices: for the alto sax); `Instruments.trim(path)` scales a different pick by its sound's level, as postgain.
- `Arranger` (`render/arranger.ts`) calls each section's recipe from `render/sections/` (one file per section type) with a `PlayedContext` (chords, scales, bass, drums, lines) for sections the band plays through, or a plain `SectionContext` for a drum break or finale. Each section gets its own `Band`, which notes (privately) which parts the recipe asks for; the arranger merges them into the arrangement's `uses` for the debug panel, so recipes build only parts they play.

### Data flow for a mode

Each mode (`major`, `minor`, `dorian`, `mixolydian`) has its data (`TonalityDef`) in `style/tonalities/<mode>.ts`: chord templates per section type, pre-chorus progressions per flavour, bridge keys, key-change turnarounds, cadence chords and solo change shapes. `tonalityOf(mode)` gives it as a `Tonality` (`style/tonalities/tonality.ts`), with the lookups that can fail or need fitting (`templatesFor`, `preTemplates`, `turnaround`, `isTonic`). `Harmonizer` (`model/harmony.ts`) realises templates against the song's `Key`; `SoloChangesWriter` (`model/solo-changes.ts`) writes solo changes with it.

Generators are writer classes: the constructor takes what is decided (or a plan to pick from) and the `Rng` it owns, and `write(input)` returns a value without keeping output state on the writer (`DrumWriter`, `BassWriter`, `GrooveWriter`, `MelodyWriter`, `AnswerWriter`, `SoloWriter`, `SoloChangesWriter`, `TitleWriter`).

### Testing

Unit tests live in `test/` (`theory`, `model`, `notation`, `time`, `midi`). `scripts/sweep.ts` (`npm run check:songs`) generates songs and queries every bar of their Strudel patterns via `scripts/checker.ts` to catch runtime errors without a browser.

Songs are deterministic: the same seed always produces the same `Song`. Seeds are not stable across changes to the generators: the `snap0` snapshot in `test/__snapshots__/` is expected to change when generation changes; update it with `npx vitest run -u` when the change is intended.
