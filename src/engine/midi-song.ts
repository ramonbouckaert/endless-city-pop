// A song's Strudel pattern as MIDI: every note the pattern plays, read
// bar by bar, on one track per instrument (General MIDI programs, drums
// on channel 10), with the form's sections as markers. Like arranger.ts,
// this loads Strudel; midi.ts writes the bytes.

import { noteToMidi, type Fraction, type Hap, type Pattern } from '@strudel/core';
import { GM_PROGRAMS } from './instruments';
import { DRUM_CHANNEL, TICKS_PER_BAR, writeMidi, type MidiNote, type MidiTrack } from './midi';
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

/** The song as a MIDI file. `pattern` is the Arranger's pattern for it. */
export function songToMidi(song: Song, pattern: Pattern): Uint8Array {
  const tracks = new Map<string, MidiTrack>();
  const track = (sound: string): MidiTrack => {
    let t = tracks.get(sound);
    if (!t) {
      const drums = sound === 'drums';
      // Melodic tracks take the channels other than the drums', in turn.
      const melodic = [...tracks.values()].filter((x) => x.channel !== DRUM_CHANNEL).length;
      const channel = drums ? DRUM_CHANNEL : [...Array(16).keys()].filter((c) => c !== DRUM_CHANNEL)[melodic % 15];
      t = { name: drums ? 'Drums' : sound.replace(/^gm_/, '').replace(/_/g, ' '), channel, notes: [] };
      if (!drums) t.program = GM_PROGRAMS[sound] ?? 0;
      tracks.set(sound, t);
    }
    return t;
  };

  for (let bar = 0; bar < song.bars; bar++) {
    for (const hap of pattern.queryArc(bar, bar + 1) as unknown as Hap[]) {
      const { whole, part, value: v } = hap;
      if (!whole || num(whole.begin) !== num(part.begin)) continue; // count each note once, at its onset
      const sound: string | undefined = v.s ?? v.sound;
      if (!sound) continue;
      const tick = num(whole.begin) * TICKS_PER_BAR;
      const note: MidiNote = { tick, dur: DRUM_TICKS, pitch: 0, velocity: velocity(v) };
      if (v.note === undefined) {
        if (DRUM_KEYS[sound] === undefined) continue;
        track('drums').notes.push({ ...note, pitch: DRUM_KEYS[sound] });
      } else {
        const pitch = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
        if (!Number.isFinite(pitch)) continue;
        const dur = (num(whole.end) - num(whole.begin)) * TICKS_PER_BAR * (v.clip ?? v.legato ?? 1);
        track(sound).notes.push({ ...note, pitch, dur });
      }
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
