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
  style/    the city-pop style as data: tonalities/ (one file per mode), form odds, section rhythms,
            drum recipes, bass feels, melody cells, harmony palette, instruments, title words
  model/    generators: form, harmony, melody, bass, drums, groove, materials, orchestration, title, Song
  render/   Strudel only: notation.ts (mini-notation strings), band.ts, drums.ts, sections/, arranger.ts
  midi/     writer.ts (Standard MIDI File bytes), from-pattern.ts (reads a Strudel pattern back out)
  app/      the browser page: main.ts wires session.ts, player.ts, form-strip, title-marquee, autoplay,
            midi-download, debug-panel; time.ts holds the pure clock/playhead helpers
```

Dependency rules:

- `style/` imports only from `lib/` and `theory/`. It defines the vocabulary types that name its tables' keys (`SectionType`, `DrumFeel`, `BassFeel`, `MelodyKind`, `PreFlavour`, ...).
- `model/` reads `style/` tables and produces **plain musical data** only: chords, notes with degrees or semitones, 16-step drum gains. Nothing in `model/` writes mini-notation or imports Strudel.
- `render/notation.ts` turns model data into mini-notation strings without importing Strudel, so tests can check it. Everything else in `render/` and `midi/from-pattern.ts` loads Strudel; unit tests and plain scripts must not import them.
- `app/` is the only browser/DOM code.

### Song pipeline

```
seed → mode, key → form (Section[]) → materials per part → instruments → title
     → Arranger: per section, its type's recipe over its material → Strudel pattern
```

- `FormPlanner` (`model/form.ts`) builds the sections. Each `Section` has a `part` id: sections that share it play the same material (every chorus is part `chorus`); solos and lifts get one part each (`solo:0`, `solo:1`, `lift:0`, ...).
- `writeMaterials` (`model/materials.ts`) writes one material per part, on first use and memoised, through a registry keyed by section type. A part can draw on another (a drum break picks up into the next section's material; a lift avoids the previous lift's style). Shared harmony (chorus bars, hook, vamp bars, intro harmony) is computed lazily once.
- `MaterialOf<T>` (`model/material.ts`) gives each section type its own material shape. `song.material(section)`, `song.part(type)` (first part of a type) and `song.parts(type)` look them up.
- `pickInstruments` (`model/orchestration.ts`) picks every part's sound and the drum kit. `Sounds` is uniform: every part is a sound name; gains come from `voiceGain`/`level` and the band's own gains in `render/band.ts`.
- `Arranger` (`render/arranger.ts`) builds a `SectionContext` per section and calls its recipe from `render/sections/` (one file per section type).

### Data flow for a mode

Each mode (`major`, `minor`, `dorian`, `mixolydian`) has a `Tonality` in `style/tonalities/<mode>.ts`. It supplies chord templates per section type, pre-chorus progressions per flavour, bridge keys, key-change turnarounds, cadence chords and solo change shapes. `Harmonizer` (`model/harmony.ts`) realises templates against the song's `Key`.

### Testing

Unit tests live in `test/` (`theory`, `model`, `notation`, `time`, `midi`). `scripts/sweep.ts` (`npm run check:songs`) generates songs and queries every bar of their Strudel patterns via `scripts/checker.ts` to catch runtime errors without a browser.

Songs are deterministic: the same seed always produces the same `Song`. Seeds are not stable across changes to the generators: the `snap0` snapshot in `test/__snapshots__/` is expected to change when generation changes; update it with `npx vitest run -u` when the change is intended.
