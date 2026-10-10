// Melodic lines. Melodies are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and move
// to fit the new chord, which is what makes a hook sound like a hook.
// Strong beats land on chord tones; weak beats move by step. (Solos are
// in solo-line.ts.)

import type { Rng } from '../../lib/random';
import {
  ANSWER,
  CADENCE_WEIGHTS,
  CHROMATIC_PROB,
  PHRASE_FORMS,
  SHAPE_CHOICES,
  type LoopPlan,
  type MelodyStyle,
  type MotifLetter,
  type PhraseForm,
  type PhraseFormDef,
  type ShapeName,
} from '../../style';
import { Chord, type Bar, type Key } from '../../theory';
import { Line, type Note } from './line';

export interface MelodyNote extends Note {
  semis: number; // above the key's tonic
}
/** A line in semitones above a key's tonic. */
export class Melody extends Line<MelodyNote> {
  constructor(
    bars: MelodyNote[][],
    readonly form?: PhraseForm,
  ) {
    super(bars);
  }

  get top(): number {
    return Math.max(...this.bars.flat().map((n) => n.semis));
  }

  /** The first `n` bars. */
  take(n: number): Melody {
    return new Melody(this.bars.slice(0, n), this.form);
  }
}

/** Writes the answer to a hook: short figures in the gaps it leaves, high above it. */
export class AnswerWriter {
  constructor(
    private readonly key: Key,
    private readonly rng: Rng,
  ) {}

  write(hook: Melody, bars: Bar[]): Melody {
    const { key, rng } = this;
    return new Melody(
      hook.bars.map((notes, b) => {
        if (b % 2) return [];
        // In a gap at the end of the bar (from beat four at the latest),
        // or an eighth into a note held a dotted quarter or more.
        const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.len)) : 0;
        const lastNote = notes.at(-1);
        let at: number | null;
        if (lastEnd <= 12) at = lastEnd;
        else if (lastNote && lastNote.len >= 6) at = lastNote.start + 2;
        else at = null;
        if (at === null) return [];
        // Figures cut at the barline, keeping those with two notes left.
        const fitting = ANSWER.figures.map((f) => f.filter(([o, l]) => at + o + l <= 16)).filter((f) => f.length > 1);
        if (!fitting.length) return [];
        const first = key.scale.semis(rng.pick(ANSWER.startDegrees));
        // Each note steps from the one before, snapped to the chord.
        return rng.pick(fitting).reduce<MelodyNote[]>((notes, [o, len], i) => {
          const prev = notes.at(-1)?.semis ?? first;
          const target = prev + (i ? rng.pick(ANSWER.steps) : 0);
          const semis = Chord.at(bars[b], at + o).snap(target, key, { prev, dir: 1 });
          return [...notes, { start: at + o, len, semis }];
        }, []);
      }),
    );
  }
}

// Offsets for `n` notes, each a step from the one before.
function walk(n: number, step: (i: number) => number): number[] {
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + step(i));
  return out;
}

interface Motif {
  notes: (Note & { offset: number })[];
  startDeg: number;
}

// Where a melody has got to after a bar: each motif as first written, how
// many times each has played before and how far it has drifted, and the
// line's last note.
interface Progress {
  readonly motifs: Partial<Record<MotifLetter, Motif>>;
  readonly seen: Partial<Record<MotifLetter, number>>;
  readonly drifts: Partial<Record<MotifLetter, number>>;
  readonly prevDeg: number;
  readonly prevSemis: number;
}

/**
 * Writes a melody in a style and a key, remembering its motifs as it
 * goes. A style with phrase forms (a verse's, a chorus's, a bridge's)
 * picks one; the rest loop their motifs.
 */
export class MelodyWriter {
  private readonly form?: PhraseForm;

  constructor(
    private readonly key: Key,
    private readonly style: MelodyStyle,
    private readonly rng: Rng,
  ) {
    if (style.forms) this.form = rng.weightedKey(style.forms);
  }

  private get phrase(): PhraseFormDef | undefined {
    return this.form && PHRASE_FORMS[this.form];
  }

  /** Which motif plays in each of `n` bars. C: half cadence, D: full cadence, E: tag, F: fragment. */
  private plan(n: number): MotifLetter[] {
    if (this.phrase) return phrasePlan(this.phrase.plan, n);
    if (!this.style.plan) throw new Error('A melody needs phrase forms or a loop');
    return loopPlan(this.style.plan, n);
  }

  write(bars: Bar[]): Melody {
    const plan = this.plan(bars.length);
    const start: Progress = { motifs: {}, seen: {}, drifts: {}, prevDeg: this.style.range.center, prevSemis: 0 };
    const { lines } = bars.reduce<{ at: Progress; lines: MelodyNote[][] }>(
      ({ at, lines }, bar, b) => {
        const played = this.bar(bar, plan[b], at);
        return { at: played.at, lines: [...lines, played.notes] };
      },
      { at: start, lines: [] },
    );
    return new Melody(lines, this.form);
  }

  // A bar of the melody, from where it has got to; and where it gets to.
  private bar(bar: Bar, letter: MotifLetter, at: Progress): { notes: MelodyNote[]; at: Progress } {
    const { key } = this;
    const { range, diatonic = false } = this.style;
    const scale = key.scale;
    const occurrence = (at.seen[letter] ?? -1) + 1;
    const motif = at.motifs[letter] ?? this.motif(letter, at.prevDeg);
    // Some pre-choruses, and a sentence's fragments, climb with every
    // repeat of the motif.
    const step = this.phrase?.step?.[letter] ?? this.style.sequence ?? 0;
    const climb = step * occurrence;
    const lift = this.phrase?.lift?.[letter] ?? 0;
    // Other non-A motifs drift ±1 degree on each repeat so the line develops.
    const drifted = at.drifts[letter] ?? 0;
    const drift =
      letter !== 'A' && occurrence > 0 && step === 0
        ? Math.max(-2, Math.min(2, drifted + this.rng.pick([-1, 0, 0, 1])))
        : drifted;
    const notes = motif.notes.reduce<MelodyNote[]>((line, n, i) => {
      const prev = line.at(-1)?.semis ?? at.prevSemis;
      const chord = Chord.at(bar, n.start);
      const last = i === motif.notes.length - 1;
      const deg = motif.startDeg + climb + lift + drift + n.offset;
      let semis = scale.semis(foldByThirds(deg, range.lo, range.hi + climb));
      // On beat one or three, held a dotted quarter, or opening or closing a cadence.
      if (n.start % 8 === 0 || n.len >= 6 || i === 0 || (last && (letter === 'C' || letter === 'D'))) {
        const dir = i === 0 ? 0 : Math.sign(n.offset - motif.notes[i - 1].offset);
        // A diatonic style (a riff's) keeps to the key: it is harmonised by scale steps.
        semis = chord.snap(semis, key, { prev, dir, diatonic });
      } else if (!diatonic && Math.abs(semis - prev) === 2 && this.rng.chance(CHROMATIC_PROB)) {
        semis = prev + Math.sign(semis - prev);
      }
      if (last && letter === 'D') {
        const w = this.rng.weighted(CADENCE_WEIGHTS);
        if (w >= 0) semis = Math.round((semis - w) / 12) * 12 + w;
      }
      return [...line, { start: n.start, len: n.len, semis }];
    }, []);
    const prevSemis = notes.at(-1)?.semis ?? at.prevSemis;
    return {
      notes,
      at: {
        motifs: { ...at.motifs, [letter]: motif },
        seen: { ...at.seen, [letter]: occurrence },
        drifts: { ...at.drifts, [letter]: drift },
        prevDeg: scale.degree(prevSemis).step,
        prevSemis,
      },
    };
  }

  // A rhythm cell with a shape. Openings start low enough to rise;
  // answers carry on from wherever the line has got to (`prevDeg`).
  private motif(letter: MotifLetter, prevDeg: number): Motif {
    const { rng } = this;
    const { range } = this.style;
    const cells = this.phrase?.cells?.[letter] ?? this.style.cells[letter];
    if (!cells) throw new Error(`No ${letter} cells for this melody`);
    const rhythm = parseRhythm(rng.pick(cells));
    const offsets = this.shape(rng.weightedKey(SHAPE_CHOICES[letter]), rhythm.length);
    const top = Math.max(...offsets);
    const startDeg =
      letter === 'A'
        ? range.center - Math.floor((top - Math.min(...offsets)) / 2) + rng.pick([0, 0, 1])
        : foldByThirds(prevDeg - top + rng.pick([0, 1, 2]), range.lo, range.hi);
    return { notes: rhythm.map((n, i) => ({ ...n, offset: offsets[i] })), startDeg };
  }

  // A melodic shape, as degree offsets from a motif's first note. Openings
  // tend to rise (often by thirds, outlining the chord); answers fall
  // back; cadences settle.
  private shape(name: ShapeName, n: number): number[] {
    const { rng } = this;
    switch (name) {
      case 'rise':
        return walk(n, () =>
          rng.weighted([
            [1, 2],
            [2, 3],
            [3, 1],
          ]),
        );
      case 'fall':
        return walk(
          n,
          () =>
            -rng.weighted([
              [1, 3],
              [2, 2],
            ]),
        );
      case 'arch':
        return walk(n, (i) => (i < n / 2 ? rng.pick([1, 2, 2]) : -rng.pick([1, 1, 2])));
      case 'valley':
        return walk(n, (i) => (i < n / 2 ? -rng.pick([1, 2]) : rng.pick([1, 2, 2])));
      case 'neighbor':
        return Array.from({ length: n }, (_, i) => [0, 1, 0, -1][i % 4]);
      case 'leapFall':
        return walk(n, (i) => (i === 1 ? rng.pick([3, 4]) : -1));
      case 'zigzag':
        return walk(n, (i) => (i % 2 ? rng.pick([2, 3]) : -1));
    }
  }
}

// A phrase form over `n` bars: its last bars if shorter, else tagged
// before its full cadence.
function phrasePlan(plan: readonly MotifLetter[], n: number): MotifLetter[] {
  if (n <= plan.length) return plan.slice(plan.length - n);
  return [...plan, ...new Array<MotifLetter>(n - plan.length - 1).fill('E'), 'D'];
}

// A loop over `n` bars, into as much of its end as fits after the first bar.
function loopPlan({ loop, end }: LoopPlan, n: number): MotifLetter[] {
  const ending = end.slice(-Math.max(1, Math.min(end.length, n - 1)));
  return [...Array.from({ length: n - ending.length }, (_, i) => loop[i % loop.length]), ...ending];
}

// "x-.x" -> notes with lengths, in sixteenths: x = a note on an eighth, - = held, . = rest.
const parseRhythm = (cell: string): Note[] =>
  [...cell].flatMap((ch, i) =>
    ch === 'x' ? [{ start: 2 * i, len: 2 * (1 + (/^-*/.exec(cell.slice(i + 1))?.[0].length ?? 0)) }] : [],
  );

// Into the range lo to hi by thirds, so the note stays a chord-ish tone.
function foldByThirds(d: number, lo: number, hi: number): number {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}
