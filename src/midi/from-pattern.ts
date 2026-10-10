// A song's Strudel pattern as MIDI: every note the pattern plays, read
// bar by bar, on one track per instrument (General MIDI programs, drums
// on channel 10), with the form's sections as markers. Like render/,
// this loads Strudel; writer.ts writes the bytes.

import { noteToMidi, type Fraction, type Hap, type Pattern } from '@strudel/core';
import type { Song } from '../model';
import { DRUM_SOUNDS, GM_PROGRAMS, isDrumSound } from '../style';
import { DRUM_CHANNEL, PPQ, TICKS_PER_BAR, writeMidi, type MidiNote, type MidiTrack } from './writer';

const DRUM_TICKS = TICKS_PER_BAR / 16;

const num = (f: Fraction) => f.valueOf();

// Strudel's gain is a level (0.05 for a ghost note, 0.75 for the bass);
// its square root spreads those over MIDI velocities.
const velocity = (v: Record<string, any>) => 127 * Math.sqrt(Math.min(1, (v.gain ?? 1) * (v.velocity ?? 1)));

// A track for each sound's notes, the drums on the drum channel and the
// rest on the others in turn.
function tracksFor(notes: readonly { sound: string; note: MidiNote }[]): MidiTrack[] {
  const sounds = [...new Set(notes.map((n) => n.sound))];
  const melodicChannels = Array.from({ length: 16 }, (_, i) => i).filter((c) => c !== DRUM_CHANNEL);
  const melodic = sounds.filter((sound) => sound !== 'drums');
  return sounds.map((sound) => {
    const trackNotes = notes.filter((n) => n.sound === sound).map((n) => n.note);
    if (sound === 'drums') return { name: 'Drums', channel: DRUM_CHANNEL, notes: trackNotes };
    return {
      name: sound.replace(/^gm_/, '').replaceAll('_', ' '),
      channel: melodicChannels[melodic.indexOf(sound) % 15],
      program: GM_PROGRAMS[sound] ?? 0,
      notes: trackNotes,
    };
  });
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
    // Sounds that aren't drums (the noise riser) are left out.
    if (!isDrumSound(sound)) return null;
    return { sound: 'drums', note: { ...base, pitch: DRUM_SOUNDS[sound].gmKey } };
  }
  const pitch = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
  if (!Number.isFinite(pitch)) return null;
  const dur = (num(whole.end) - num(whole.begin)) * TICKS_PER_BAR * (v.clip ?? v.legato ?? 1);
  // A pitch envelope (penv semitones up into the note) slides it in.
  const slide = v.penv ? { slide: { semis: -v.penv, ticks: (v.pattack ?? PATTACK) * ticksPerSecond } } : {};
  return { sound, note: { ...base, pitch, dur, ...slide } };
}

/** The song as a MIDI file. `pattern` is its arrangement's pattern. */
export function songToMidi(song: Song, pattern: Pattern): Uint8Array {
  const ticksPerSecond = (song.bpm / 60) * PPQ;
  const notes = Array.from({ length: song.bars }, (_, bar) => pattern.queryArc(bar, bar + 1) as unknown as Hap[])
    .flat()
    .flatMap((hap) => noteFromHap(hap, ticksPerSecond) ?? []);
  const { starts } = song.form;
  const markers = song.form.describe().map((text, i) => ({ tick: starts[i] * TICKS_PER_BAR, text }));
  return writeMidi({ title: song.title, bpm: song.bpm, key: song.key, markers, tracks: tracksFor(notes) });
}
