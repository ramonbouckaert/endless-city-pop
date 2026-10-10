// A song as MIDI, from its score: every note on one track per instrument
// (General MIDI programs, drums on channel 10 on the song's kit), each
// track with the mix (volume, pan, reverb and filter as controllers),
// and the form's sections as markers. writer.ts writes the bytes. The
// app plays this file; the MIDI download saves it.

import { programName, type Program } from '../lib/general-midi';
import { ScoreArranger, type Instruments, type Kit, type Score, type Song } from '../engine';
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

/** A note on its way to a track: the instrument that plays it (or the drum kit), as MIDI, and its place in the mix. */
export interface TrackNote {
  program: Program | 'drums';
  note: MidiNote;
  /** Its level: gain, velocity and the instrument's trim together. */
  level: number;
  pan: number; // 0 left, 0.5 centre, 1 right
  room: number; // reverb, 0 dry to 1
  /** A low-pass filter's cutoff in Hz, if the note has one. */
  lpf?: number;
}

// A level (0.05 for a ghost note, 0.75 for the bass) as a MIDI value:
// its square root spreads those out.
const midiLevel = (level: number) => 127 * Math.sqrt(Math.min(1, Math.max(0, level)));

/** Every note of a score as MIDI: drums a sixteenth long, the rest as long as they sound. */
export function midiNotes(score: Score, bpm: number): TrackNote[] {
  const ticksPerSecond = (bpm / 60) * PPQ;
  return score.notes.map(({ time, dur, program, note: pitch, gain, velocity, postgain, clip, slide, controls }) => {
    const level = gain * velocity * postgain;
    const { pan = 0.5, room = 0, lpf } = controls;
    const length = program === 'drums' ? DRUM_TICKS : dur * TICKS_PER_BAR * clip;
    // Its velocity is set with its track's mix, relative to the loudest note there.
    const note: MidiNote = { tick: time * TICKS_PER_BAR, dur: length, pitch, velocity: 127 };
    if (slide) note.slide = { semis: slide.semis, ticks: slide.seconds * ticksPerSecond };
    return { program, note, level, pan, room, ...(lpf === undefined ? {} : { lpf }) };
  });
}

// A filter cutoff as brightness (CC74): 64, the sound as it is, at 8 kHz
// (or no filter), down to 0 at 250 Hz, five octaves below.
const brightness = (lpf: number | undefined) =>
  lpf === undefined ? 64 : Math.round(Math.min(127, Math.max(0, 64 + (64 * Math.log2(lpf / 8000)) / 5)));

// A track's mix, from `start`: its volume set by its loudest note, each
// note's velocity relative to that (so together they play at the note's
// level, and the track's fader moves the whole part), and its pan, reverb
// and brightness, changed where its notes change them.
function mixed(notes: readonly TrackNote[], start: number): { notes: MidiNote[]; controls: ControlChange[] } {
  const loudest = Math.max(...notes.map((n) => n.level), 1e-6);
  const controls: ControlChange[] = [{ tick: start, controller: CC.volume, value: midiLevel(loudest) }];
  let last: Partial<Record<'pan' | 'reverb' | 'brightness', number>> = {};
  for (const { note, pan, room, lpf } of [...notes].sort((a, b) => a.note.tick - b.note.tick)) {
    const now = { pan: Math.round(pan * 127), reverb: Math.round(room * 127), brightness: brightness(lpf) };
    for (const key of ['pan', 'reverb', 'brightness'] as const) {
      if (now[key] !== last[key]) controls.push({ tick: note.tick, controller: CC[key], value: now[key] });
    }
    last = now;
  }
  return {
    notes: notes.map((n) => ({ ...n.note, velocity: 127 * Math.sqrt(Math.min(1, n.level / loudest)) })),
    controls,
  };
}

const MELODIC_CHANNELS = Array.from({ length: 16 }, (_, i) => i).filter((c) => c !== DRUM_CHANNEL);

/**
 * A channel for each instrument (in order of their first notes), and the
 * tick it is set up for it: one of its own while there are channels left;
 * then one whose instrument has finished before this one starts; failing
 * that, the one whose instrument finishes soonest.
 */
export function channelsFor(spans: readonly { first: number; last: number }[]): { channel: number; start: number }[] {
  const ends = new Map<number, number>(); // channel -> when its instrument finishes
  // A channel whose instrument has finished by `first`, or the one finishing soonest.
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

// A track for each instrument's notes, the drums on the drum channel and
// the rest on the others (channelsFor).
function tracksFor(notes: readonly TrackNote[], kit: Kit): MidiTrack[] {
  // Each instrument's notes, in order of its first.
  const byProgram = new Map<Program | 'drums', TrackNote[]>();
  for (const n of notes) {
    const mine = byProgram.get(n.program);
    if (mine) mine.push(n);
    else byProgram.set(n.program, [n]);
  }
  const melodic = [...byProgram.keys()].filter((p): p is Program => p !== 'drums');
  const channels = channelsFor(
    melodic.map((program) => {
      const mine = byProgram.get(program) ?? [];
      return {
        first: Math.min(...mine.map((n) => n.note.tick)),
        last: Math.max(...mine.map((n) => n.note.tick + n.note.dur)),
      };
    }),
  );
  return [...byProgram].map(([program, mine]) => {
    if (program === 'drums')
      return { name: `Drums (${kit.name})`, channel: DRUM_CHANNEL, program: kit.program, ...mixed(mine, 0) };
    const { channel, start } = channels[melodic.indexOf(program)];
    return { name: programName(program), channel, program, start, ...mixed(mine, start) };
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
    tracks: tracksFor(midiNotes(score, song.bpm), instruments.kit),
  });
}
