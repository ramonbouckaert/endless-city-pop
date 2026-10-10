import type { NoteSpec } from './score';

/** A note on a grid: the slot it starts on and how many it lasts. */
export interface Note {
  start: number;
  len: number;
}

/** Notes per bar on a grid of `grid` slots. */
export class Line<N extends Note> {
  constructor(
    readonly bars: N[][],
    readonly grid: number,
  ) {}

  /** The line's notes over `bars` bars, looping it, each at the pitch `pitch` gives it. */
  notes(bars: number, pitch: (note: N, time: number) => number): NoteSpec[] {
    return this.over(bars).map(({ time, dur, note }) => ({ time, dur, note: pitch(note, time) }));
  }

  // The line over `bars` bars, looping it, each note placed in time in
  // bars from the section's start (cut off at its bar's end).
  protected over(bars: number): { time: number; dur: number; note: N }[] {
    const { grid } = this;
    return Array.from({ length: bars }, (_, b) =>
      this.bars[b % this.bars.length].map((note) => ({
        time: b + note.start / grid,
        dur: (Math.min(note.start + note.len, grid) - note.start) / grid,
        note,
      })),
    ).flat();
  }
}
