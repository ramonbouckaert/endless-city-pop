// The player's clock in song terms: pure helpers, tested on their own.

import type { Song } from '../engine';

/** How long a number of bars plays, in seconds: four beats a bar. */
export const seconds = (bars: number, bpm: number): number => (bars * 4 * 60) / bpm;

/** A song's length in seconds, to its final chord. */
export const songLength = (song: Song): number => seconds(song.bars, song.bpm);

/** How many bars play in a number of seconds. */
export const bars = (seconds: number, bpm: number): number => (seconds * bpm) / (4 * 60);

/** Seconds as m:ss, counting whole seconds like a player's clock. */
export function clock(time: number): string {
  const s = Math.floor(time);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
