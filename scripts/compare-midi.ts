// Compares the MIDI export's notes from the score (src/midi/from-score.ts)
// with the notes Strudel plays, read out of the arranged pattern bar by
// bar as the export used to. Per track: note counts, the share of
// Strudel's onsets (distinct times a note starts) the score has too, and
// the share of Strudel's notes it has at the same time, pitch and length. Chord
// parts are voiced differently, so only their onsets should match.
// Usage: scripts/run-node.sh scripts/compare-midi.ts [count]

import { noteToMidi, type Hap } from '@strudel/core';
import { midiNotes, type SoundNote as MixedNote } from '../src/midi/from-score';
import { TICKS_PER_BAR } from '../src/midi/writer';
import { Song } from '../src/model';
import { Arranger } from '../src/render';
import { ScoreArranger } from '../src/score';
import { isDrumSound } from '../src/style';

const count = Number(process.argv[2] ?? 30);

// A note as compared: its sound and when, how high and how long it plays.
type SoundNote = Pick<MixedNote, 'sound' | 'note'>;

// The notes Strudel plays, as the export used to read them: a note for
// each hap with an onset; drums by sound name.
function strudelNotes(song: Song): SoundNote[] {
  const { pattern } = new Arranger(song).arrange();
  const haps = Array.from({ length: song.bars }, (_, bar) => pattern.queryArc(bar, bar + 1) as unknown as Hap[]).flat();
  return haps.flatMap((hap): SoundNote[] => {
    const { whole, part, value: v } = hap;
    if (!whole || whole.begin.valueOf() !== part.begin.valueOf()) return [];
    const sound: string | undefined = v.s ?? v.sound;
    if (!sound) return [];
    const tick = whole.begin.valueOf() * TICKS_PER_BAR;
    if (v.note === undefined)
      return isDrumSound(sound)
        ? [{ sound: 'drums', note: { tick, dur: 0, pitch: drumPitch(sound), velocity: 0 } }]
        : [];
    const pitch = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
    const dur = (whole.end.valueOf() - whole.begin.valueOf()) * TICKS_PER_BAR * (v.clip ?? 1);
    return [{ sound, note: { tick, dur, pitch, velocity: 0 } }];
  });
}
// Drums compared by sound: any number unique per sound will do.
const drumPitch = (sound: string) => [...sound].reduce((n, c) => n * 31 + (c.codePointAt(0) ?? 0), 7);

// A note's time and pitch, and for pitched notes its length.
const key = (n: SoundNote) =>
  n.sound === 'drums'
    ? `${Math.round(n.note.tick)}:${n.note.pitch}`
    : `${Math.round(n.note.tick)}:${Math.round(n.note.pitch)}:${Math.round(n.note.dur)}`;

// How many of `a` find a note at the same time, pitch and length in `b`, each used once.
function matches(a: readonly SoundNote[], b: readonly SoundNote[]): number {
  const left = new Map<string, number>();
  for (const n of b) left.set(key(n), (left.get(key(n)) ?? 0) + 1);
  let found = 0;
  for (const n of a) {
    const k = key(n);
    const c = left.get(k) ?? 0;
    if (c) {
      found++;
      left.set(k, c - 1);
    }
  }
  return found;
}

// The distinct times notes start.
const onsets = (notes: readonly SoundNote[]) => new Set(notes.map((n) => Math.round(n.note.tick)));

type Totals = { old: number; new: number; oldOnsets: number; onsets: number; pitches: number };
const totals = new Map<string, Totals>();
let oldMs = 0;
let newMs = 0;
for (let i = 0; i < count; i++) {
  const song = Song.generate(`compare${i}`);
  let t = performance.now();
  const before = strudelNotes(song);
  oldMs += performance.now() - t;
  t = performance.now();
  // Drums keyed by sound for the comparison, as above.
  const score = new ScoreArranger(song).arrange();
  const after = midiNotes(score, song.bpm);
  newMs += performance.now() - t;
  const drumSounds = score.notes.filter((n) => n.note === undefined && isDrumSound(n.sound));
  let d = 0;
  for (const n of after) if (n.sound === 'drums') n.note.pitch = drumPitch(drumSounds[d++].sound);
  for (const sound of new Set([...before, ...after].map((n) => n.sound))) {
    const a = before.filter((n) => n.sound === sound);
    const b = after.filter((n) => n.sound === sound);
    const tot = totals.get(sound) ?? { old: 0, new: 0, oldOnsets: 0, onsets: 0, pitches: 0 };
    tot.old += a.length;
    tot.new += b.length;
    const theirs = onsets(b);
    tot.oldOnsets += onsets(a).size;
    tot.onsets += [...onsets(a)].filter((t) => theirs.has(t)).length;
    tot.pitches += matches(a, b);
    totals.set(sound, tot);
  }
}

const pct = (n: number, of: number) => (of ? `${((100 * n) / of).toFixed(1)}%` : '-');
console.log(
  `${count} songs. Strudel read-out ${(oldMs / count).toFixed(0)} ms a song, score ${(newMs / count).toFixed(1)} ms a song.\n`,
);
console.log('sound'.padEnd(30), 'strudel'.padStart(8), 'score'.padStart(8), 'onsets'.padStart(8), 'notes'.padStart(8));
for (const [sound, t] of [...totals].sort((a, b) => b[1].old - a[1].old)) {
  console.log(
    sound.padEnd(30),
    String(t.old).padStart(8),
    String(t.new).padStart(8),
    pct(t.onsets, t.oldOnsets).padStart(8),
    pct(t.pitches, t.old).padStart(8),
  );
}
