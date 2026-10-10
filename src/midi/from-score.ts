// A song as MIDI, from its score: every note on one track per instrument
// (General MIDI programs, drums on channel 10), each track with the mix
// (volume, pan and reverb as controllers), and the form's sections as
// markers. No Strudel: writer.ts writes the bytes.

import type { Instruments, Song } from '../model';
import { ScoreArranger, type Score } from '../score';
import { DRUM_SOUNDS, GM_PROGRAMS, isDrumSound } from '../style';
import {
  CC,
  DRUM_CHANNEL,
  PPQ,
  TICKS_PER_BAR,
  writeMidi,
  type ControlChange,
  type MidiNote,
  type MidiTrack,
} from './writer';

const DRUM_TICKS = TICKS_PER_BAR / 16;

/** A note on its way to a track: the sound it plays (or 'drums'), as MIDI, and its place in the mix. */
export interface SoundNote {
  sound: string;
  note: MidiNote;
  /** Its level: gain, velocity and the sound's trim together. */
  level: number;
  pan: number; // 0 left, 0.5 centre, 1 right
  room: number; // reverb, 0 dry to 1
}

// A level (0.05 for a ghost note, 0.75 for the bass) as a MIDI value:
// its square root spreads those out.
const midiLevel = (level: number) => 127 * Math.sqrt(Math.min(1, Math.max(0, level)));

/** Every note of a score as MIDI; drums by their General MIDI key, sounds that are neither (the noise riser) left out. */
export function midiNotes(score: Score, bpm: number): SoundNote[] {
  const ticksPerSecond = (bpm / 60) * PPQ;
  return score.notes.flatMap((n): SoundNote[] => {
    const tick = n.time * TICKS_PER_BAR;
    const level = n.gain * n.velocity * n.postgain;
    const mix = { level, pan: n.controls.pan ?? 0.5, room: n.controls.room ?? 0 };
    if (n.note === undefined) {
      if (!isDrumSound(n.sound)) return [];
      const note = { tick, dur: DRUM_TICKS, pitch: DRUM_SOUNDS[n.sound].gmKey, velocity: midiLevel(level) };
      return [{ sound: 'drums', note, ...mix }];
    }
    const note: MidiNote = { tick, dur: n.dur * TICKS_PER_BAR * n.clip, pitch: n.note, velocity: midiLevel(level) };
    if (n.slide) note.slide = { semis: n.slide.semis, ticks: n.slide.seconds * ticksPerSecond };
    return [{ sound: n.sound, note, ...mix }];
  });
}

// A track's mix, from `start`: its volume set by its loudest note, each
// note's velocity relative to that (so together they play at the note's
// level, and the track's fader moves the whole part), and its pan and
// reverb, changed where its notes change them.
function mixed(notes: readonly SoundNote[], start: number): { notes: MidiNote[]; controls: ControlChange[] } {
  const loudest = Math.max(...notes.map((n) => n.level), 1e-6);
  const controls: ControlChange[] = [{ tick: start, controller: CC.volume, value: midiLevel(loudest) }];
  let last: { pan?: number; reverb?: number } = {};
  for (const { note, pan, room } of [...notes].sort((a, b) => a.note.tick - b.note.tick)) {
    const now = { pan: Math.round(pan * 127), reverb: Math.round(room * 127) };
    if (now.pan !== last.pan) controls.push({ tick: note.tick, controller: CC.pan, value: now.pan });
    if (now.reverb !== last.reverb) controls.push({ tick: note.tick, controller: CC.reverb, value: now.reverb });
    last = now;
  }
  return {
    notes: notes.map((n) => ({ ...n.note, velocity: 127 * Math.sqrt(Math.min(1, n.level / loudest)) })),
    controls,
  };
}

const MELODIC_CHANNELS = Array.from({ length: 16 }, (_, i) => i).filter((c) => c !== DRUM_CHANNEL);

/**
 * A channel for each sound (in order of their first notes), and the tick
 * it is set up for it: one of its own while there are channels left;
 * then one whose sound has finished before this one starts; failing
 * that, the one whose sound finishes soonest.
 */
export function channelsFor(spans: readonly { first: number; last: number }[]): { channel: number; start: number }[] {
  const ends = new Map<number, number>(); // channel -> when its sound finishes
  // A channel whose sound has finished by `first`, or the one finishing soonest.
  const reused = (first: number) => {
    const byEnd = [...ends].sort((a, b) => a[1] - b[1]);
    return (byEnd.find(([, end]) => end <= first) ?? byEnd[0])[0];
  };
  return spans.map(({ first, last }) => {
    const unused = MELODIC_CHANNELS.find((c) => !ends.has(c));
    const channel = unused ?? reused(first);
    ends.set(channel, last);
    return { channel, start: unused === undefined ? first : 0 };
  });
}

// A track for each sound's notes, the drums on the drum channel and the
// rest on the others (channelsFor).
function tracksFor(notes: readonly SoundNote[]): MidiTrack[] {
  const sounds = [...new Set(notes.map((n) => n.sound))];
  const of = (sound: string) => notes.filter((n) => n.sound === sound);
  const melodic = sounds.filter((sound) => sound !== 'drums');
  const channels = channelsFor(
    melodic.map((sound) => {
      const mine = of(sound);
      return {
        first: Math.min(...mine.map((n) => n.note.tick)),
        last: Math.max(...mine.map((n) => n.note.tick + n.note.dur)),
      };
    }),
  );
  return sounds.map((sound) => {
    if (sound === 'drums') return { name: 'Drums', channel: DRUM_CHANNEL, ...mixed(of(sound), 0) };
    const { channel, start } = channels[melodic.indexOf(sound)];
    return {
      name: sound.replace(/^gm_/, '').replaceAll('_', ' '),
      channel,
      program: GM_PROGRAMS[sound] ?? 0,
      start,
      ...mixed(of(sound), start),
    };
  });
}

/** The song as a MIDI file, played on `instruments` (its own unless given). */
export function songToMidi(song: Song, instruments: Instruments = song.instruments): Uint8Array {
  const score = new ScoreArranger(song, instruments).arrange();
  const { starts } = song.form;
  const markers = song.form.describe().map((text, i) => ({ tick: starts[i] * TICKS_PER_BAR, text }));
  return writeMidi({
    title: song.title,
    bpm: song.bpm,
    key: song.key,
    markers,
    tracks: tracksFor(midiNotes(score, song.bpm)),
  });
}
