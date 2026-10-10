import type { Note } from './types';

/** Notes per bar on a grid of `grid` slots. */
export class Line<N extends Note> {
  constructor(
    readonly bars: N[][],
    readonly grid: number,
  ) {}

  /** One bar as mini-notation, held notes weighted: "[~ 0 2 4 5@4]". */
  static renderBar<N extends Note>(notes: N[], grid: number, token: (n: N) => string): string {
    if (!notes.length) return '~';
    const weighted = (tok: string, len: number) => (len > 1 ? `${tok}@${len}` : tok);
    const tokens: string[] = [];
    let t = 0;
    for (const n of [...notes].sort((a, b) => a.start - b.start)) {
      if (n.start > t) tokens.push(weighted('~', n.start - t));
      const end = Math.min(n.start + n.len, grid);
      tokens.push(weighted(token(n), end - n.start));
      t = end;
    }
    if (t < grid) tokens.push(weighted('~', grid - t));
    return `[${tokens.join(' ')}]`;
  }

  protected renderWith(token: (n: N) => string): string[] {
    return this.bars.map((notes) => Line.renderBar(notes, this.grid, token));
  }
}
