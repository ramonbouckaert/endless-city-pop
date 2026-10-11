import { loopBars } from '../../lib/steps';
import type { NoteSpec } from '../score';

/** A note on a bar's sixteenths: the one it starts on and how many it lasts (perhaps past the barline). */
export interface Note {
  start: number;
  len: number;
}

/** Notes per bar, on sixteenths. */
export class Line<N extends Note> {
  constructor(readonly bars: N[][]) {}

  /** The line's notes over `bars` bars, looping it, each at the pitch `pitch` gives it. */
  notes(bars: number, pitch: (note: N, time: number) => number): NoteSpec[] {
    return this.over(bars).map(({ time, dur, note }) => ({ time, dur, note: pitch(note, time) }));
  }

  // The line over `bars` bars, looping it, each note placed in time in
  // bars from the section's start (cut off at the section's end: a note
  // may be tied over the barline).
  protected over(bars: number): { time: number; dur: number; note: N }[] {
    return loopBars(this.bars, bars, (note, b) => ({
      time: b + note.start / 16,
      dur: (Math.min(b * 16 + note.start + note.len, bars * 16) - b * 16 - note.start) / 16,
      note,
    }));
  }
}
