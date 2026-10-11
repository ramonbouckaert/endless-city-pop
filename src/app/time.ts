// The player's clock in song terms: pure helpers, tested on their own.
// A song's tempo may change, so bars and seconds go through its timeline.

import type { Song } from '../engine';

/** How long a song plays to a point `bars` in, in seconds. */
export const seconds = (song: Song, bars: number): number => song.timeline.seconds(bars);

/** A song's length in seconds, to its final chord. */
export const songLength = (song: Song): number => seconds(song, song.bars);

/** How many bars of a song play in a number of seconds. */
export const bars = (song: Song, seconds: number): number => song.timeline.timeAt(seconds);

/** Seconds as m:ss, counting whole seconds like a player's clock. */
export function clock(time: number): string {
  const s = Math.floor(time);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
