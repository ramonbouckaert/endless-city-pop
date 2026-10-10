// A song's Strudel pattern as MIDI: every note the pattern plays, read
// bar by bar, on one track per instrument (General MIDI programs, drums
// on channel 10), with the form's sections as markers. Like arranger.ts,
// this loads Strudel; midi.ts writes the bytes.

import { noteToMidi, type Fraction, type Hap, type Pattern } from '@strudel/core';
import { GM_PROGRAMS } from './instruments';
import { DRUM_CHANNEL, PPQ, TICKS_PER_BAR, writeMidi, type MidiNote, type MidiTrack } from './midi';
import type { Song } from './song';

// Drum sounds as General MIDI percussion keys. Sounds not listed (the
// noise riser) are left out.
const DRUM_KEYS: Readonly<Record<string, number>> = {
  bd: 36,
  rim: 37,
  sd: 38,
  cp: 39,
  lt: 45,
  hh: 42,
  oh: 46,
  mt: 47,
  cr: 49,
  ht: 50,
  rd: 51,
  tb: 54,
  cb: 56,
  sh: 82,
};
const DRUM_TICKS = TICKS_PER_BAR / 16;

const num = (f: Fraction) => f.valueOf();

// Strudel's gain is a level (0.05 for a ghost note, 0.75 for the bass);
// its square root spreads those over MIDI velocities.
const velocity = (v: Record<string, any>) => 127 * Math.sqrt(Math.min(1, (v.gain ?? 1) * (v.velocity ?? 1)));

function trackFor(sound: string, tracks: Map<string, MidiTrack>): MidiTrack {
  let t = tracks.get(sound);
  if (t) return t;
  const drums = sound === 'drums';
  const melodicCount = [...tracks.values()].filter((x) => x.channel !== DRUM_CHANNEL).length;
  const melodicChannels = Array.from({ length: 16 }, (_, i) => i).filter((c) => c !== DRUM_CHANNEL);
  const channel = drums ? DRUM_CHANNEL : melodicChannels[melodicCount % 15];
  const name = drums ? 'Drums' : sound.replace(/^gm_/, '').replaceAll('_', ' ');
  t = { name, channel, notes: [] };
  if (!drums) t.program = GM_PROGRAMS[sound] ?? 0;
  tracks.set(sound, t);
  return t;
}

// Superdough's pitch-envelope attack when a pattern sets none, in seconds.
const PATTACK = 0.2;

function noteFromHap(hap: Hap, ticksPerSecond: number): { sound: string; note: MidiNote } | null {
  const { whole, part, value: v } = hap;
  if (!whole || num(whole.begin) !== num(part.begin)) return null;
  const sound: string | undefined = v.s ?? v.sound;
  if (!sound) return null;
  const tick = num(whole.begin) * TICKS_PER_BAR;
  const base: MidiNote = { tick, dur: DRUM_TICKS, pitch: 0, velocity: velocity(v) };
  if (v.note === undefined) {
    const pitch = DRUM_KEYS[sound];
    if (pitch === undefined) return null;
    return { sound: 'drums', note: { ...base, pitch } };
  }
  const pitch = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
  if (!Number.isFinite(pitch)) return null;
  const dur = (num(whole.end) - num(whole.begin)) * TICKS_PER_BAR * (v.clip ?? v.legato ?? 1);
  const note: MidiNote = { ...base, pitch, dur };
  // A pitch envelope (penv semitones up into the note) slides it in.
  if (v.penv) note.slide = { semis: -v.penv, ticks: (v.pattack ?? PATTACK) * ticksPerSecond };
  return { sound, note };
}

/** The song as a MIDI file. `pattern` is the Arranger's pattern for it. */
export function songToMidi(song: Song, pattern: Pattern): Uint8Array {
  const tracks = new Map<string, MidiTrack>();
  const ticksPerSecond = (song.bpm / 60) * PPQ;
  for (let bar = 0; bar < song.bars; bar++) {
    for (const hap of pattern.queryArc(bar, bar + 1) as unknown as Hap[]) {
      const result = noteFromHap(hap, ticksPerSecond);
      if (result) trackFor(result.sound, tracks).notes.push(result.note);
    }
  }
  let bar = 0;
  const markers = song.form.map((s) => {
    const marker = { tick: bar * TICKS_PER_BAR, text: s.describe() };
    bar += s.bars;
    return marker;
  });
  return writeMidi({ title: song.title, bpm: song.bpm, key: song.key, markers, tracks: [...tracks.values()] });
}
