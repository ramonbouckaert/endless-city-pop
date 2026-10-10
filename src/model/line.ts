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
}
