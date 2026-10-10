// Standard MIDI Files: a song's notes as a type-1 file, one track per
// instrument after a conductor track of tempo, meter, key and section
// markers. Plain bytes, no dependencies.

import { mod12 } from './music';
import type { Key } from './music';

export const PPQ = 480; // ticks per quarter note
export const TICKS_PER_BAR = PPQ * 4;
export const DRUM_CHANNEL = 9; // channel 10, counting from one

export interface MidiNote {
  tick: number;
  dur: number; // ticks
  pitch: number; // 0-127
  velocity: number; // 1-127
}

export interface MidiTrack {
  name: string;
  channel: number; // 0-15
  program?: number; // General MIDI program, 0-127 (none on the drum channel)
  notes: MidiNote[];
}

export interface MidiSong {
  title: string;
  bpm: number;
  key: Key;
  markers: { tick: number; text: string }[];
  tracks: MidiTrack[];
}

/** A key signature: sharps (+) or flats (-) of its relative major, and whether it is minor. */
export function keySignature(key: Key): { sf: number; minor: boolean } {
  const pos = mod12(key.majorTonic * 7);
  return { sf: key.usesFlats && pos > 0 ? pos - 12 : pos, minor: key.mode === 'minor' };
}

/** The song as a type-1 MIDI file. */
export function writeMidi(song: MidiSong): Uint8Array {
  const { sf, minor } = keySignature(song.key);
  const usPerQuarter = Math.round(60_000_000 / song.bpm);
  const conductor: TrackEvent[] = [
    { tick: 0, data: meta(0x03, text(song.title)) },
    { tick: 0, data: meta(0x51, [(usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]) },
    { tick: 0, data: meta(0x58, [4, 2, 24, 8]) }, // 4/4
    { tick: 0, data: meta(0x59, [sf & 0xff, minor ? 1 : 0]) },
    ...song.markers.map((m) => ({ tick: m.tick, data: meta(0x06, text(m.text)) })),
  ];
  const chunks = [conductor, ...song.tracks.map(trackEvents)].map(trackChunk);
  const header = [...ascii('MThd'), ...u32(6), ...u16(1), ...u16(chunks.length), ...u16(PPQ)];
  return Uint8Array.from([...header, ...chunks.flat()]);
}

interface TrackEvent {
  tick: number;
  data: number[];
  off?: boolean; // note-offs sort before note-ons at the same tick
}

function trackEvents(track: MidiTrack): TrackEvent[] {
  const ch = track.channel & 0x0f;
  const events: TrackEvent[] = [{ tick: 0, data: meta(0x03, text(track.name)) }];
  if (track.program !== undefined && ch !== DRUM_CHANNEL)
    events.push({ tick: 0, data: [0xc0 | ch, track.program & 0x7f] });
  for (const n of separate(track.notes)) {
    const pitch = clamp(Math.round(n.pitch), 0, 127);
    events.push(
      { tick: n.tick, data: [0x90 | ch, pitch, clamp(Math.round(n.velocity), 1, 127)] },
      { tick: n.tick + n.dur, data: [0x80 | ch, pitch, 0], off: true },
    );
  }
  return events;
}

// A repeated pitch on one channel cuts the note before it, so a note-off
// never ends the newer note.
function separate(notes: MidiNote[]): MidiNote[] {
  const sorted = notes
    .map((n) => ({ ...n, tick: Math.max(0, Math.round(n.tick)), dur: Math.max(1, Math.round(n.dur)) }))
    .sort((a, b) => a.tick - b.tick);
  const sounding = new Map<number, MidiNote>();
  const out: MidiNote[] = [];
  for (const n of sorted) {
    const prev = sounding.get(n.pitch);
    if (prev && prev.tick + prev.dur > n.tick) {
      prev.dur = n.tick - prev.tick;
      if (!prev.dur) out.splice(out.indexOf(prev), 1); // two at once: keep one
    }
    sounding.set(n.pitch, n);
    out.push(n);
  }
  return out;
}

function trackChunk(events: TrackEvent[]): number[] {
  const sorted = events
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => a.tick - b.tick || Number(!!b.off) - Number(!!a.off) || a.i - b.i);
  const bytes: number[] = [];
  let t = 0;
  for (const e of sorted) {
    bytes.push(...vlq(e.tick - t), ...e.data);
    t = e.tick;
  }
  bytes.push(0, ...meta(0x2f, []));
  return [...ascii('MTrk'), ...u32(bytes.length), ...bytes];
}

const meta = (type: number, data: number[]) => [0xff, type, ...vlq(data.length), ...data];
const text = (s: string) => [...new TextEncoder().encode(s)];
const ascii = (s: string) => [...s].map((c) => c.codePointAt(0) ?? 0);
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A variable-length quantity: seven bits a byte, high bit set on all but the last. */
export function vlq(n: number): number[] {
  const out = [n & 0x7f];
  while ((n >>>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
