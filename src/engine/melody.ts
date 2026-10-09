// Melodic lines. Melodies are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and move
// to fit the new chord, which is what makes a hook sound like a hook.
// Strong beats land on chord tones; weak beats move by step. Solos are
// bebop-ish runs in chord-scale degrees.

import { ANSWER, CELLS, MELODY_RANGES, PHRASE, PRE_MELODIES, SHAPE_CHOICES, SOLO, type ShapeName } from './constants';
import type { Chord, Key } from './music';
import type { Rng } from './random';
import type { Bar, MelodyKind, MelodyNote, MotifLetter, Note, PreMelody, SoloNote } from './types';

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

/** A line in semitones above a key's tonic, on an eighth-note grid. */
export class Melody extends Line<MelodyNote> {
  constructor(bars: MelodyNote[][]) {
    super(bars, 8);
  }

  get top(): number {
    return Math.max(...this.bars.flat().map((n) => n.semis));
  }

  /** The first `n` bars. */
  take(n: number): Melody {
    return new Melody(this.bars.slice(0, n));
  }

  /** One item per bar, in degrees of `key`. */
  render(key: Key): string[] {
    const scale = key.scale;
    return this.renderWith((n) => scale.degree(n.semis, key.usesFlats));
  }

  /** Short figures in the gaps this melody leaves, high above it. */
  answer(bars: Bar[], key: Key, rng: Rng): Melody {
    return new Melody(
      this.bars.map((notes, b) => {
        if (b % 2) return [];
        // In a gap at the end of the bar, or over a held note.
        const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.len)) : 0;
        const lastNote = notes.at(-1);
        const at = lastEnd <= 6 ? lastEnd : lastNote && lastNote.len >= 3 ? lastNote.start + 1 : null;
        if (at === null) return [];
        // Figures cut at the barline, keeping those with two notes left.
        const fitting = ANSWER.figures.map((f) => f.filter(([o, l]) => at + o + l <= 8)).filter((f) => f.length > 1);
        if (!fitting.length) return [];
        let semis = key.scale.semis(rng.pick(ANSWER.startDegrees));
        return rng.pick(fitting).map(([o, len], i) => {
          const target = semis + (i ? rng.pick(ANSWER.steps) : 0);
          semis = chordAt(bars[b], at + o, 8).snap(target, key, { prev: semis, dir: 1 });
          return { start: at + o, len, semis };
        });
      }),
    );
  }
}

/** A line in chord-scale degrees, on a sixteenth grid. */
export class Solo extends Line<SoloNote> {
  constructor(bars: SoloNote[][]) {
    super(bars, 16);
  }

  render(): string[] {
    return this.renderWith((n) => String(n.degree));
  }

  /** An improvised solo. Chord tones are the even degrees, and beats land on them. */
  static improvise(bars: Bar[], rng: Rng): Solo {
    const { lo, hi } = SOLO;
    let deg = rng.int(lo + 2, lo + 6);
    let dir = 1;
    return new Solo(
      bars.map((_, b) => {
        let rhythm = rng.pick(SOLO.rhythms);
        // Breathe at the end of every other bar.
        if (b % 2) rhythm = rhythm.slice(0, 12) + '....';
        const notes: SoloNote[] = [];
        for (let s = 0; s < 16; s++) {
          if (rhythm[s] !== 'x') continue;
          if (rng.chance(SOLO.turn)) dir = -dir;
          deg += dir * (rhythm[s + 1] === 'x' ? 1 : rng.pick(SOLO.leaps));
          if (deg > hi) [deg, dir] = [hi - 1, -1];
          if (deg < lo) [deg, dir] = [lo + 1, 1];
          if (s % 4 === 0 && deg % 2 !== 0) deg += dir;
          notes.push({ start: s, len: rhythm[s + 1] === '.' ? 2 : 1, degree: deg });
        }
        return notes;
      }),
    );
  }
}

/** The chord sounding at a slot of a bar. */
const chordAt = (bar: Bar, slot: number, grid: number): Chord =>
  bar[Math.min(bar.length - 1, Math.floor((slot * bar.length) / grid))];

// Melodic shapes, as degree offsets from a motif's first note. Openings
// tend to rise (often by thirds, outlining the chord); answers fall
// back; cadences settle.
function walk(n: number, step: (i: number) => number): number[] {
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + step(i));
  return out;
}
const SHAPES: Record<ShapeName, (n: number, rng: Rng) => number[]> = {
  rise: (n, rng) =>
    walk(n, () =>
      rng.weighted([
        [1, 2],
        [2, 3],
        [3, 1],
      ]),
    ),
  fall: (n, rng) =>
    walk(
      n,
      () =>
        -rng.weighted([
          [1, 3],
          [2, 2],
        ]),
    ),
  arch: (n, rng) => walk(n, (i) => (i < n / 2 ? rng.pick([1, 2, 2]) : -rng.pick([1, 1, 2]))),
  valley: (n, rng) => walk(n, (i) => (i < n / 2 ? -rng.pick([1, 2]) : rng.pick([1, 2, 2]))),
  neighbor: (n) => Array.from({ length: n }, (_, i) => [0, 1, 0, -1][i % 4]),
  leapFall: (n, rng) => walk(n, (i) => (i === 1 ? rng.pick([3, 4]) : -1)),
  zigzag: (n, rng) => walk(n, (i) => (i % 2 ? rng.pick([2, 3]) : -1)),
};

interface Motif {
  notes: (Note & { offset: number })[];
  startDeg: number;
}

/**
 * Writes one melody of a kind in a key, remembering its motifs as it
 * goes. A pre-chorus melody also takes a style.
 */
export class MelodyWriter {
  private readonly range;
  private readonly cells: Readonly<Record<MotifLetter, readonly string[]>>;
  private readonly sequence: number;
  private readonly motifs: Partial<Record<MotifLetter, Motif>> = {};
  private readonly seen: Partial<Record<MotifLetter, number>> = {};
  private prevDeg: number;
  private prevSemis?: number;

  constructor(
    private readonly key: Key,
    private readonly kind: MelodyKind,
    private readonly rng: Rng,
    private readonly style: PreMelody = 'climb',
  ) {
    this.range = MELODY_RANGES[kind];
    this.prevDeg = this.range.center;
    const pre = kind === 'pre' ? PRE_MELODIES[style] : undefined;
    this.cells = pre?.cells ?? CELLS[kind];
    this.sequence = pre?.sequence ?? 0;
  }

  /** Which motif plays in each of `n` bars. C: half cadence, D: full cadence, E: tag. */
  static plan(n: number, kind: MelodyKind, style: PreMelody = 'climb'): MotifLetter[] {
    const each = (f: (i: number) => MotifLetter) => Array.from({ length: n }, (_, i) => f(i));
    if (kind === 'pre') {
      // All end on a half cadence into the chorus.
      if (style === 'question') return each((i) => (i === n - 1 ? 'C' : i % 2 ? 'B' : 'A'));
      if (style === 'hold') return each((i) => (i === n - 1 ? 'C' : 'A'));
      return each((i) => (i === n - 1 ? 'C' : i === n - 2 && n >= 3 ? 'B' : 'A'));
    }
    if (kind === 'riff') return each((i) => (i % 2 ? (i === n - 1 ? 'D' : 'B') : 'A'));
    if (n === 4) return ['A', 'B', 'A', 'D'];
    if (n <= 8) return PHRASE.slice(8 - n);
    return each((i) => (i < 8 ? PHRASE[i] : i === n - 1 ? 'D' : 'E'));
  }

  write(bars: Bar[]): Melody {
    const plan = MelodyWriter.plan(bars.length, this.kind, this.style);
    return new Melody(bars.map((bar, b) => this.bar(bar, plan[b])));
  }

  private bar(bar: Bar, letter: MotifLetter): MelodyNote[] {
    const { key, range } = this;
    const scale = key.scale;
    const occurrence = (this.seen[letter] = (this.seen[letter] ?? -1) + 1);
    const motif = (this.motifs[letter] ??= this.motif(letter));
    // Some pre-choruses climb with every repeat of the motif.
    const climb = this.sequence * occurrence;
    const notes = motif.notes.map((n, i): MelodyNote => {
      const chord = chordAt(bar, n.start, 8);
      const last = i === motif.notes.length - 1;
      let semis = scale.semis(clamp(motif.startDeg + climb + n.offset, range.lo, range.hi + climb));
      if (n.start % 4 === 0 || n.len >= 3 || i === 0 || (last && (letter === 'C' || letter === 'D'))) {
        const dir = i === 0 ? 0 : Math.sign(n.offset - motif.notes[i - 1].offset);
        // Riffs stay diatonic: they are harmonised by scale steps.
        semis = chord.snap(semis, key, { prev: this.prevSemis, dir, diatonic: this.kind === 'riff' });
      }
      // A full cadence ends on the tonic if it belongs to the chord.
      if (last && letter === 'D' && chord.pcs.includes(key.tonic)) semis = Math.round(semis / 12) * 12;
      this.prevSemis = semis;
      return { start: n.start, len: n.len, semis };
    });
    this.prevDeg = parseInt(scale.degree(this.prevSemis!), 10);
    return notes;
  }

  // A rhythm cell with a shape. Openings start low enough to rise;
  // answers carry on from wherever the line has got to.
  private motif(letter: MotifLetter): Motif {
    const { rng, range } = this;
    const rhythm = parseRhythm(rng.pick(this.cells[letter]));
    const offsets = SHAPES[rng.weighted(SHAPE_CHOICES[letter])](rhythm.length, rng);
    const top = Math.max(...offsets);
    const startDeg =
      letter === 'A'
        ? range.center - Math.floor((top - Math.min(...offsets)) / 2) + rng.pick([0, 0, 1])
        : clamp(this.prevDeg - top + rng.pick([0, 1, 2]), range.lo, range.hi);
    return { notes: rhythm.map((n, i) => ({ ...n, offset: offsets[i] })), startDeg };
  }
}

// "x-.x" -> notes with lengths: x = note, - = held, . = rest.
const parseRhythm = (cell: string): Note[] =>
  [...cell].flatMap((ch, i) => (ch === 'x' ? [{ start: i, len: 1 + /^-*/.exec(cell.slice(i + 1))![0].length }] : []));

// Into the range lo to hi by thirds, so the note stays a chord-ish tone.
function clamp(d: number, lo: number, hi: number): number {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}
