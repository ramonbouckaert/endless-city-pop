# Endless City Pop

Endless, procedurally generated city pop: songs in the jazz-funk harmony
of late-'70s and '80s Japanese pop, in major, minor, dorian and
mixolydian keys, each with a bilingual title (真夜中のドライブ (Midnight
Drive)), one after another. They're built from music theory rules as
[Strudel](https://strudel.cc) patterns and played in the browser by
Strudel itself.

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
npm run midi -- mySeed   # write mySeed.mid
```

## How a song is made

```
seed ─▶ mode, key ─▶ form ─▶ harmony ─▶ melody, bass ─▶ Strudel pattern
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

| Step         | Module                 | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style        | `src/style/`           | Every table and tunable, the style as data: each mode's tonality (`tonalities/`), form odds, section rhythms, drum recipes and bass feels, melody cells and phrase forms, harmony colours, instruments and title words. The generators in `src/model/` read these; nothing in `style/` rolls dice or loads Strudel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Form         | `src/model/form.ts`    | Built from optional parts, so length and shape vary by seed: an intro (the chorus teased, planing add9 chords, or one of several vamps and turnarounds, in one of four arrangements) and maybe a vamp; one to three verse / pre-chorus / chorus rounds (the pre-chorus and riffs may not appear at all); a middle of a bridge and up to two solos of one or two choruses each, in either order, maybe a breakdown and a drum break; then one to three last choruses, each of which may lift the key up again (by one to three semitones, up to +4 in all), an optional outro and a final chord. Repeats vary: later verses add parts, later choruses add answers and the last one a "big" layer.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Harmony      | `src/model/harmony.ts` | Roman-numeral templates realised in the song's key and mode as extended chords (the tonic coloured by mode), then reharmonised with tritone substitutions, related ii chords and secondary dominants (a mixolydian I7 is never tritone-subbed: it is home). Bridges move to a related key chosen by circle-of-fifths distance or a chromatic mediant, and end with the mode's cadence back home. Lifts into a final chorus use one of the mode's jazz turnarounds into the new key; in major: bVI-V, ii-V, tritone sub, backdoor iv-bVII, V of V, iii-VI-ii-V, a side-slipped ii-V, a sus pedal, a bare V7alt, the long way round, or Coltrane changes; minor adds the Neapolitan and Andalusian, dorian a plagal and aeolian approach and a half-step side-slip. Solos are written in eights, each ending with the mode's cadence home: its two-bar pair (ii-V in major, iiø-V7alt in minor, i-IV in dorian, I-bVII in mixolydian) moving through keys a step apart, two bars on the home tonic first, or one of the song's vamps; then reharmonised, each chord taking its scale from its pair's key. A 16-bar solo is two different eights. |
| Pre-chorus   | `src/style/song.ts`    | Each song's pre-chorus (2 to 8 bars) takes one of five flavours, each with its own progressions, melody, drums, bass and arrangement: **climb** (a stepwise rise to V, keys opening up over a noise riser), **pedal** (long notes over a held sus dominant, strings swelling), **drop** (the drums drop out and return halfway), **stops** (stop-time band hits under a free lead) and **borrowed** (colour from outside the key: minor-key iv, bIII, bVI and bVII in major; dorian IV7 and the Neapolitan in minor). Progressions are fitted to end on their cadence into the chorus; later rounds add a layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Chord-scales | `src/theory/chord.ts`  | Each chord gets the mode that fits it: diatonic chords take their mode in the key (dorian ii, mixolydian V, lydian IV in major; dorian iv, lydian bVI in minor), altered dominants take altered or phrygian dominant, tritone subs take lydian dominant, a minor m(maj7) melodic minor, and so on. Every mode is placed by its relative major, which also sets its spelling (F# dorian with sharps, Eb dorian with flats). Chords are spelled by scale degree (Bb and Eb in C, never A# and D#).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Melody       | `src/model/melody.ts`  | Motif-based phrases (A B A C ...): each motif is a rhythm cell and a melodic shape (rise, arch, fall, leap and fall, ...). Repeats keep the shape and move to fit the new chord; strong beats land on chord tones; pre-chorus melodies climb a step each bar, answer themselves, or hold long notes; full cadences end on the tonic. Solos are bebop-ish runs in chord-scale degrees. Chorus answers fill the gaps the hook leaves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bass         | `src/model/bass.ts`    | Written per section: each picks a feel from a short list (funk, disco, driving eighths, half-time, bossa, pedal) and rolls its density, syncopation, octave pops and note lengths, writes a one-bar groove in chord-scale degrees, varies it bar by bar with a fill closing each four-bar phrase, and often approaches the next chord's root (chromatically, usually).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Drums        | `src/model/drums.ts`   | One kit per song (the default samples or a classic drum machine). Each section picks a feel (funk, disco, half-time, bossa, ride, claps, build) and rolls its groove: kick placement, ghost notes, hi-hat or ride in eighths or sixteenths with an accent shape, open hats, and sometimes shaker, tambourine or cowbell, with the fourth bar of each phrase varied. Sections may open with a crash and close with a fill (snare roll, toms, mixed, unison hits or a stop), a different one each repeat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Pattern      | `src/render/`          | `Arranger` builds the song as one Strudel pattern: a `Band` of instruments over chord and note patterns, a `stack` per section from its type's recipe (`render/sections/`), and `arrange` over the form. The model's notes become mini-notation, Strudel's own sequence language, in `render/notation.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

The song model (`src/theory/`, `src/style/` and `src/model/`) has no dependencies: a song is plain musical data (chords, notes, drum steps). Only `src/render/` and `src/midi/from-pattern.ts` load Strudel. `src/app/player.ts` runs Strudel's scheduler on Web Audio
(`@strudel/webaudio`, General MIDI soundfonts and the same drum samples
strudel.cc loads).

## Playing

The **↻** button writes a new song; **Play** starts it from its first
bar (and becomes **Stop**), with the section playing glowing and a
playhead line moving across the form. With **Autoplay** on (the default; the browser remembers if you
turn it off), a new song takes over a second after each song's final
chord, so the music keeps going; with it off, a song loops.

## Instruments

`src/style/instruments.ts` says which Strudel sounds play which part.
Strudel's samples are drums and effects, so pitched parts use its General
MIDI soundfonts and synths. Each song picks:

- **Melody voices**: a lead, its octave double and four soloists from
  `VOICES.pool`: saxes, clarinet, flute, harmonica, trumpets, trombone,
  French horn, brass, jazz and overdriven guitar, piano, organs,
  glockenspiel, vibraphone, pads, effects and oohs.
- **The band's other parts** from `PICKS`: keys (electric pianos,
  clavinet, piano, organs), rhythm guitar (muted, jazz, clean,
  nylon), pad, strings, choir, answering brass or flute, bell (vibes and
  other mallets), horn stabs and their second voice, and bass (electric,
  slap, fretless, upright, synth).
- **A drum kit** from `KITS`: the default samples or one of 16 drum
  machines, including the TR-808, TR-909 and Oberheim DMX. The drum
  sounds a machine lacks (`KIT_GAPS`) come from the default samples.

No song plays one sound in two parts while a part has another to choose,
counting soundfonts that are the same recording under another name
(`SAME_SOUND`) as one. Sounds play louder or quieter by their level in
`SOUND_LEVELS`, measured by rendering each with Strudel playing the same
phrase and comparing loudness; notes above a soundfont's top
(`SOUND_TOPS`, where its samples are missing) drop an octave.

### Trying other instruments

Open the app with `?debug=true` (e.g. `http://localhost:5173/?debug=true`)
for an **Instruments** panel under the player: every part the band plays
(keys, clavinet, bass, pads, lead, soloists, horns, drum kit, ...), what
it plays, and a menu that starts on the song's own pick and lists every
sound Strudel has loaded (General MIDI soundfonts, synths, samples, drum
machines). A choice re-arranges the song at once, even while it plays,
carries over to new songs, and is remembered in the browser. **Copy
changes** copies your choices and what each replaced.

## MIDI export

**Export as MIDI** in the app (or `npm run midi`) downloads the song
as a type-1 Standard MIDI File: one track per instrument with its General
MIDI program (Rhodes, clavinet, finger bass, alto sax, ...), drums on
channel 10 in General MIDI percussion keys, and a conductor track with
the tempo, 4/4, the key signature (minor, or the relative major's for a
mode) and a marker at each section. `src/midi/from-pattern.ts` reads every
note from the song's Strudel pattern, so the file has exactly what the
app plays, swing and voicings included; `src/midi/writer.ts` writes the
bytes. Effects (reverb, filters, delay) and the noise riser don't carry
over, and later key changes keep the opening key signature.

## Checking songs without listening

`scripts/checker.ts` queries every bar of a song's pattern and reports
mini-notation errors, unknown sound names and notes out of range. `npm run check:songs
-- 25` sweeps 25 seeds. `npm run smoke` (with `npm run preview`
running) loads the built app in Chromium and presses Play.

## Licence

Strudel is licensed under the GNU AGPL 3.0, and this app bundles it, so
this project is AGPL-3.0-or-later too (see `LICENSE`). If you host it,
the source must stay available to its users.
