// A song's time: its bars (four quarter notes each) and its tempo, which
// may change. Notes are placed in bars (2.5: halfway through the third
// bar); the timeline turns that into quarter notes (for MIDI ticks) and
// seconds (for the player's clock), and back.

/** A tempo from a time on (in bars), in quarter notes a minute. */
export interface TempoChange {
  readonly at: number;
  readonly bpm: number;
}

const QUARTERS = 4; // a bar's

export class Timeline {
  /** Each tempo change, at its quarter note, and the seconds it falls at. */
  private readonly tempos: readonly { quarter: number; seconds: number; bpm: number }[];

  /** `tempos`: in time order, the first at 0. */
  constructor(tempos: readonly TempoChange[]) {
    this.tempos = tempos.reduce<{ quarter: number; seconds: number; bpm: number }[]>((list, { at, bpm }) => {
      const quarter = this.quarters(at);
      const prev = list.at(-1);
      const seconds = prev ? prev.seconds + ((quarter - prev.quarter) * 60) / prev.bpm : 0;
      return [...list, { quarter, seconds, bpm }];
    }, []);
  }

  /** A song at one tempo throughout. */
  static steady(bpm: number): Timeline {
    return new Timeline([{ at: 0, bpm }]);
  }

  /** Every tempo change, at its quarter note. */
  get tempoChanges(): { quarter: number; bpm: number }[] {
    return this.tempos.map(({ quarter, bpm }) => ({ quarter, bpm }));
  }

  /** The tempo at a time, in bars. */
  bpmAt(time: number): number {
    return this.tempoAt(this.quarters(time)).bpm;
  }

  /** Quarter notes from the start to a time in bars. */
  quarters(time: number): number {
    return time * QUARTERS;
  }

  /** Seconds from the start to a time in bars. */
  seconds(time: number): number {
    const q = this.quarters(time);
    const t = this.tempoAt(q);
    return t.seconds + ((q - t.quarter) * 60) / t.bpm;
  }

  /**
   * The time in bars `seconds` in: the inverse of seconds() (to a
   * billionth of a bar, so a time turned into seconds and back is where
   * it was, despite rounding on the way).
   */
  timeAt(seconds: number): number {
    const t = this.tempos.findLast((x) => x.seconds <= seconds) ?? this.tempos[0];
    const time = (t.quarter + ((seconds - t.seconds) * t.bpm) / 60) / QUARTERS;
    return Math.round(time * 1e9) / 1e9;
  }

  // The tempo in force at a quarter note.
  private tempoAt(quarter: number) {
    return this.tempos.findLast((t) => t.quarter <= quarter) ?? this.tempos[0];
  }
}
