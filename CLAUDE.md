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
npx vitest run test/engine.test.ts
npx vitest run -t "writes complete songs"
```

Scripts (`scripts/*.ts`) cannot be run with `ts-node` or `tsx` directly — `scripts/run-node.sh` bundles them with esbuild first, because several Strudel packages only resolve correctly via their `"module"` field.

## Architecture

### Song pipeline

```
seed → mode, key → form → harmony → melody, bass → Strudel pattern
```

Each step is a separate module in `src/engine/`:

| Module | Role |
|---|---|
| `constants.ts` | Every table and tuneable: templates per mode/section, tempo ranges, drum/bass feels, title words, `TONALITIES` |
| `form.ts` | Builds the section sequence (`Section[]`) |
| `harmony.ts` | Realises roman-numeral templates as `Chord[][]`, applies reharmonisation |
| `melody.ts` | Motif-based melody lines and bebop solo lines |
| `bass.ts` | Per-section bass groove in mini-notation degrees |
| `drums.ts` | Per-section drum groove from a recipe |
| `instruments.ts` | Which Strudel sounds play which part (`VOICES`, `PICKS`, `KITS`, `BAND`) |
| `music.ts` | Core theory: `Chord`, `Key`, `Scale`, `Roman` |
| `song.ts` | `Song.generate()` — drives the whole pipeline; `Song.titleParts()` for bilingual titles |
| `arranger.ts` | Converts a `Song` to a Strudel `Pattern` — the only engine file that imports Strudel |
| `midi-song.ts` | Reads a Strudel pattern back out into MIDI bytes |
| `midi.ts` | Writes Standard MIDI File bytes |
| `random.ts` | Seeded PRNG (`Rng`) |

**Critical separation:** `src/engine/index.ts` deliberately omits `arranger.ts` from its exports. This keeps the engine Strudel-free so unit tests and CLI scripts can import it without loading Web Audio. Import `Arranger` directly from `./engine/arranger` when needed (as `src/main.ts` does).

### Browser app

`src/main.ts` wires the UI: `Song.generate()` → `new Arranger(song).pattern()` → `player.play(pattern, cps)`.  
`src/strudel.ts` wraps Strudel's Web Audio scheduler.  
`src/debug.ts` powers the instruments panel, visible at `?debug=true`.

### Data flow for a mode

Each mode (`major`, `minor`, `dorian`, `mixolydian`) has a `Tonality` entry in `TONALITIES` (`constants.ts`). It supplies chord templates per section type, pre-chorus progressions, bridge keys, key-change turnarounds, cadence chords, and solo change shapes. `Harmonizer` in `harmony.ts` realises templates against the song's `Key` and mode.

### Testing

Unit tests live in `test/`. `scripts/sweep.ts` (called by `npm run check:songs`) generates songs and queries every bar of their Strudel patterns to catch runtime errors without needing a browser. The `checker.ts` module does the per-bar validation.

Songs are deterministic: the same seed always produces the same `Song`. Tests rely on this; snapshot tests exist for specific seeds (e.g. `snap0` in `engine.test.ts`).
