// Melodic lines. Melodies are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and move
// to fit the new chord, which is what makes a hook sound like a hook.
// Strong beats land on chord tones; weak beats move by step. Solos are
// bebop-ish runs in chord-scale degrees.

import type { Rng } from '../lib/random';
import {
  ANSWER,
  CADENCE_WEIGHTS,
  CELLS,
  CHROMATIC_PROB,
  FORM_CHOICES,
  MELODY_RANGES,
  PHRASE_FORMS,
  PRE_MELODIES,
  RIFF_PLAN,
  SHAPE_CHOICES,
  SOLO,
  type Cells,
  type LoopPlan,
  type MelodyKind,
  type MotifLetter,
  type PhraseForm,
  type PhraseFormDef,
  type PreMelody,
  type ShapeName,
} from '../style';
import { chordAt, Scale, type Bar, type Chord, type Key } from '../theory';
import { SLIDE_SECONDS } from './figures';
import { Line, type Note } from './line';
import { onChord, type Changes, type NoteSpec } from './score';

export interface MelodyNote extends Note {
  semis: number; // above the key's tonic
}
export interface SoloNote extends Note {
  degree: number; // chord-scale degree
  grace?: Grace;
}
// A grace note into a note from above (1) or below (-1): a semitone
// away if chromatic, else the next degree. Flicked as a note of its own,
// or slurred: the note starts at its pitch and slides.
export interface Grace {
  from: 1 | -1;
  chromatic: boolean;
  semis: number; // the grace note's pitch, from the note's
  slur: boolean;
}

/** A line in semitones above a key's tonic, on an eighth-note grid. */
export class Melody extends Line<MelodyNote> {
  constructor(
    bars: MelodyNote[][],
    readonly form?: PhraseForm,
  ) {
    super(bars, 8);
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
        // In a gap at the end of the bar, or over a held note.
        const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.len)) : 0;
        const lastNote = notes.at(-1);
        let at: number | null;
        if (lastEnd <= 6) at = lastEnd;
        else if (lastNote && lastNote.len >= 3) at = lastNote.start + 1;
        else at = null;
        if (at === null) return [];
        // Figures cut at the barline, keeping those with two notes left.
        const fitting = ANSWER.figures.map((f) => f.filter(([o, l]) => at + o + l <= 8)).filter((f) => f.length > 1);
        if (!fitting.length) return [];
        const first = key.scale.semis(rng.pick(ANSWER.startDegrees));
        // Each note steps from the one before, snapped to the chord.
        return rng.pick(fitting).reduce<MelodyNote[]>((notes, [o, len], i) => {
          const prev = notes.at(-1)?.semis ?? first;
          const target = prev + (i ? rng.pick(ANSWER.steps) : 0);
          const semis = chordAt(bars[b], at + o, 8).snap(target, key, { prev, dir: 1 });
          return [...notes, { start: at + o, len, semis }];
        }, []);
      }),
    );
  }
}

/** A line in chord-scale degrees, on a sixteenth grid. */
export class Solo extends Line<SoloNote> {
  constructor(bars: SoloNote[][]) {
    super(bars, 16);
  }

  /** The line over `bars` bars against some changes, two octaves up: grace notes flicked or slid into. */
  play(changes: Changes, bars: number): NoteSpec[] {
    return this.over(bars).flatMap(({ time, dur, note: n }): NoteSpec[] => {
      const chord = changes.at(time);
      const note = onChord(chord, n.degree) + 24;
      const { grace } = n;
      if (!grace) return [{ time, dur, note }];
      if (grace.slur) return [{ time, dur, note, slide: { semis: grace.semis, seconds: SLIDE_SECONDS } }];
      // A flick: a third of a sixteenth, then the note.
      const flick = dur / (3 * n.len);
      const from = grace.chromatic ? note + grace.from : onChord(chord, n.degree + grace.from) + 24;
      return [
        { time, dur: flick, note: from },
        { time: time + flick, dur: dur - flick, note },
      ];
    });
  }
}

/** Improvises a solo. Chord tones are the even degrees, and beats land on them. */
export class SoloWriter {
  constructor(private readonly rng: Rng) {}

  write(bars: Bar[]): Solo {
    const { rng } = this;
    const { lo } = SOLO;
    // Each bar carries on from where the last left the line: its degree and direction.
    const { lines } = bars.reduce<{ deg: number; dir: number; lines: SoloNote[][] }>(
      ({ deg, dir, lines }, bar, b) => {
        // Breathe at the end of every other bar.
        const picked = rng.pick(SOLO.rhythms);
        const rhythm = b % 2 ? picked.slice(0, 12) + '....' : picked;
        const line = [...rhythm].reduce(
          (at, ch, s) => {
            if (ch !== 'x') return at;
            const r = this.advance(rhythm, s, at.deg, at.dir);
            const graced = (s % 4 === 0 || rhythm[s - 1] !== 'x') && rng.chance(SOLO.grace.chance);
            const note = graced ? { ...r.note, grace: this.grace(chordAt(bar, s, 16), r.deg, at.deg) } : r.note;
            return { deg: r.deg, dir: r.dir, notes: [...at.notes, note] };
          },
          { deg, dir, notes: [] as SoloNote[] },
        );
        return { deg: line.deg, dir: line.dir, lines: [...lines, line.notes] };
      },
      { deg: rng.int(lo + 2, lo + 6), dir: 1, lines: [] },
    );
    return new Solo(lines);
  }

  // A grace note into `target`, never from `prev`, the note just played.
  private grace(chord: Chord, target: number, prev: number): Grace {
    const { rng } = this;
    let { from, chromatic } = rng.weighted(SOLO.grace.from);
    if (!chromatic && target + from === prev) chromatic = true;
    const scale = chord.scale && Scale.named(chord.scale);
    const semis = chromatic || !scale ? from : scale.semis(target + from) - scale.semis(target);
    return { from, chromatic, semis, slur: rng.chance(SOLO.grace.slur) };
  }

  private advance(rhythm: string, s: number, deg: number, dir: number): { note: SoloNote; deg: number; dir: number } {
    const { rng } = this;
    const { lo, hi } = SOLO;
    if (rng.chance(SOLO.turn)) dir = -dir;
    deg += dir * (rhythm[s + 1] === 'x' ? 1 : rng.pick(SOLO.leaps));
    if (deg > hi) [deg, dir] = [hi - 1, -1];
    if (deg < lo) [deg, dir] = [lo + 1, 1];
    if (s % 4 === 0 && deg % 2 !== 0) deg += dir;
    return { note: { start: s, len: rhythm[s + 1] === '.' ? 2 : 1, degree: deg }, deg, dir };
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

/**
 * Writes one melody of a kind in a key, remembering its motifs as it
 * goes. A pre-chorus melody also takes a style; verses, choruses and
 * bridges pick a phrase form.
 */
export class MelodyWriter {
  private readonly range;
  private readonly cells: Cells;
  private readonly sequence: number;
  private readonly form?: PhraseForm;
  private readonly motifs: Partial<Record<MotifLetter, Motif>> = {};
  private readonly seen: Partial<Record<MotifLetter, number>> = {};
  private readonly drifts: Partial<Record<MotifLetter, number>> = {};
  private prevDeg: number;
  private prevSemis = 0;

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
    const forms = FORM_CHOICES[kind];
    if (forms) this.form = rng.weighted(forms);
  }

  private get phrase(): PhraseFormDef | undefined {
    return this.form && PHRASE_FORMS[this.form];
  }

  /** Which motif plays in each of `n` bars. C: half cadence, D: full cadence, E: tag, F: fragment. */
  private plan(n: number): MotifLetter[] {
    if (this.phrase) return phrasePlan(this.phrase.plan, n);
    return loopPlan(this.kind === 'pre' ? PRE_MELODIES[this.style].plan : RIFF_PLAN, n);
  }

  write(bars: Bar[]): Melody {
    const plan = this.plan(bars.length);
    return new Melody(
      bars.map((bar, b) => this.bar(bar, plan[b])),
      this.form,
    );
  }

  private bar(bar: Bar, letter: MotifLetter): MelodyNote[] {
    const { key, range } = this;
    const scale = key.scale;
    const occurrence = (this.seen[letter] = (this.seen[letter] ?? -1) + 1);
    const motif = (this.motifs[letter] ??= this.motif(letter));
    // Some pre-choruses, and a sentence's fragments, climb with every
    // repeat of the motif.
    const step = this.phrase?.step?.[letter] ?? this.sequence;
    const climb = step * occurrence;
    const lift = this.phrase?.lift?.[letter] ?? 0;
    // Other non-A motifs drift ±1 degree on each repeat so the line develops.
    if (letter !== 'A' && occurrence > 0 && step === 0) {
      const raw = (this.drifts[letter] ?? 0) + this.rng.pick([-1, 0, 0, 1]);
      this.drifts[letter] = Math.max(-2, Math.min(2, raw));
    }
    const drift = this.drifts[letter] ?? 0;
    const notes = motif.notes.map((n, i): MelodyNote => {
      const chord = chordAt(bar, n.start, 8);
      const last = i === motif.notes.length - 1;
      const deg = motif.startDeg + climb + lift + drift + n.offset;
      let semis = scale.semis(clamp(deg, range.lo, range.hi + climb));
      if (n.start % 4 === 0 || n.len >= 3 || i === 0 || (last && (letter === 'C' || letter === 'D'))) {
        const dir = i === 0 ? 0 : Math.sign(n.offset - motif.notes[i - 1].offset);
        // Riffs stay diatonic: they are harmonised by scale steps.
        semis = chord.snap(semis, key, { prev: this.prevSemis, dir, diatonic: this.kind === 'riff' });
      } else if (this.kind !== 'riff' && Math.abs(semis - this.prevSemis) === 2 && this.rng.chance(CHROMATIC_PROB)) {
        semis = this.prevSemis + Math.sign(semis - this.prevSemis);
      }
      if (last && letter === 'D') {
        const w = this.rng.weighted(CADENCE_WEIGHTS);
        if (w >= 0) semis = Math.round((semis - w) / 12) * 12 + w;
      }
      this.prevSemis = semis;
      return { start: n.start, len: n.len, semis };
    });
    this.prevDeg = scale.degree(this.prevSemis).step;
    return notes;
  }

  // A rhythm cell with a shape. Openings start low enough to rise;
  // answers carry on from wherever the line has got to.
  private motif(letter: MotifLetter): Motif {
    const { rng, range } = this;
    const cells = this.phrase?.cells?.[letter] ?? this.cells[letter];
    if (!cells) throw new Error(`No ${letter} cells for a ${this.kind} melody`);
    const rhythm = parseRhythm(rng.pick(cells));
    const offsets = this.shape(rng.weighted(SHAPE_CHOICES[letter]), rhythm.length);
    const top = Math.max(...offsets);
    const startDeg =
      letter === 'A'
        ? range.center - Math.floor((top - Math.min(...offsets)) / 2) + rng.pick([0, 0, 1])
        : clamp(this.prevDeg - top + rng.pick([0, 1, 2]), range.lo, range.hi);
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

// "x-.x" -> notes with lengths: x = note, - = held, . = rest.
const parseRhythm = (cell: string): Note[] =>
  [...cell].flatMap((ch, i) =>
    ch === 'x' ? [{ start: i, len: 1 + (/^-*/.exec(cell.slice(i + 1))?.[0].length ?? 0) }] : [],
  );

// Into the range lo to hi by thirds, so the note stays a chord-ish tone.
function clamp(d: number, lo: number, hi: number): number {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}
