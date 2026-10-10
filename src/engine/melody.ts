// Melodic lines. Melodies are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and move
// to fit the new chord, which is what makes a hook sound like a hook.
// Strong beats land on chord tones; weak beats move by step. Solos are
// bebop-ish runs in chord-scale degrees.

import { Line } from './line';
import { Scale, type Chord, type Key } from './music';
import type { Rng } from './random';
import type {
  Bar,
  Grace,
  MelodyKind,
  MelodyNote,
  MotifLetter,
  Note,
  PhraseForm,
  PreMelody,
  SoloNote,
  Weighted,
} from './types';

export type ShapeName = 'rise' | 'fall' | 'arch' | 'valley' | 'neighbor' | 'leapFall' | 'zigzag';

type Cells = Readonly<Partial<Record<MotifLetter, readonly string[]>>>;

// F, the fragment, only appears in phrase forms (verse, chorus, bridge):
// a short figure stated twice in the bar.
const CELLS: Readonly<Record<MelodyKind, Cells>> = {
  chorus: {
    A: [
      '.xxxx---', '.x.xx---', 'x-.xx---', '.xx-x---', '..xxx---', '.xxx.x--', 'x.xxx---', '.x.x.xx-', 'x--xxx--',
      '.xx-----', 'x-----xx', '..xx----', 'x---x---',
    ],
    B: [
      'x-.x.x--', 'x.xxx.x.', '.x.xx.x.', 'x-xx.x--', 'xx.x.x--', '.xx.xx--', 'x...xxx-',
      'x-----x-', '.x.x----', 'x--x----',
    ],
    C: ['x---x---', 'x-x-x---', '.x.x----', 'x--x----', '.x--x---', 'x----x--'],
    D: ['x-------', '.xx-x---', 'xx-x----', '.x------', 'x---x---', '..x.x---', 'x-x.x---'],
    E: ['.xxxx---', '.x.xx---', 'x.x.xx--', '.xx-----', 'x---x---'],
    F: ['.xx..xx.', 'x.x-x.x-', 'xx-.xx-.', '.x.x.x.x', 'x--x--x-'],
  },
  verse: {
    A: [
      '.xx.x.x.', '..xx.xx-', '.x.xxx--', 'x.x.xx--', '.xxxx-..', 'x..xx.x.', '.x.x.xx-', 'x.xxx...',
      '.x.x----', 'xx------', '..xx----',
    ],
    B: [
      '.x.x.x--', 'x-.xx.x-', '..x.xxx-', '.xx.x---', 'x--.x.x-', 'x...xx.x',
      'x-----x-', 'x--x----', '.xx-----',
    ],
    C: ['x--.xx--', 'x-x-x---', '.x.x----', '.x--x---', 'x----x--'],
    D: ['x--x----', 'x-------', '.xx-x---', '.x------', 'x.x-----', '..x.x---', 'x---.x--'],
    E: ['.xx.x---', 'x-.x----', '.x.x----', 'x---x---'],
    F: ['.xx..xx.', 'x.x.x.x.', '.x.x.x.x', 'x--x--x-', 'xx..xx..'],
  },
  pre: {
    A: ['.x.xxx--', '.x.xx-x-', 'x.x.xx--', 'x.x.x.x-', '.xx.x.x-'],
    B: ['x---.x.x', 'x-.x.x--', '.x.x.x--', 'x.x-x---'],
    C: ['x-------', 'x---x---', '.x------', '.x--x---'],
    D: ['x---.xx-', 'x-------', '.x------', '..x.x---', 'x---x---'],
    E: ['x---x---', '.x--x---'],
  },
  bridge: {
    A: ['x-----xx', 'x-----.x', 'x---x---', 'x-----x-', 'x----x--', '.x---x--'],
    B: ['x---.xx-', 'x-x-x---', 'x--x-x--', 'x--x----', '.x--x---'],
    C: ['x-------', 'x---x---', '.x------', '.x--x---'],
    D: ['x-------', 'x-----x-', '.x------', 'x---x---', 'x..x----', '..x-----'],
    E: ['x---x---', 'x-------'],
    F: ['x--x--x-', 'x-x-x-x-', 'x---x-x-', '.x-.x-x-'],
  },
  riff: {
    A: ['x.xx.x.x', 'x..x.xx.', '.xx.xx.x', 'x.x..xx.', '.x.xx.xx', 'xx..x.xx'],
    B: ['.x.xx.x.', 'x.xx.x--', '.x.x.xx-', 'x.x.xx--', '.xx.x.x.'],
    C: ['x.x.x---', 'x..x.x--'],
    D: ['x.xx.x--', 'x..x----', 'x.x.x.--', '.x.xx---'],
    E: ['x.x.x---', 'x.x-----'],
  },
};

interface PhraseFormDef {
  plan: readonly MotifLetter[];
  /** Rhythm cells used in place of the kind's own. */
  cells?: Cells;
  /** Degrees a motif sits above where it would otherwise start. */
  lift?: Partial<Record<MotifLetter, number>>;
  /** Degrees a motif moves on each repeat, in sequence. */
  step?: Partial<Record<MotifLetter, number>>;
}

// Eight-bar phrase forms. A is the idea; C a half cadence, D the full one.
const PHRASE_FORMS: Readonly<Record<PhraseForm, PhraseFormDef>> = {
  // Antecedent and consequent: the same opening, ending open then closed.
  period: { plan: ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D'] },
  // The opening pair twice, then a late half cadence holds off the close.
  pairs: { plan: ['A', 'B', 'A', 'B', 'A', 'C', 'A', 'D'] },
  // An idea and its repeat, then fragments climbing in sequence, then a
  // broadening into the cadence.
  sentence: { plan: ['A', 'B', 'A', 'B', 'F', 'F', 'C', 'D'], step: { F: 1 } },
  // Two A pairs, a contrasting pair set higher, and the A back home.
  aaba: { plan: ['A', 'B', 'A', 'B', 'E', 'C', 'A', 'D'], lift: { E: 2 } },
  // Short calls that leave room, answered by busier lines.
  callResponse: {
    plan: ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'D'],
    cells: {
      A: ['.xxx-...', 'x.xx-...', '.x.xx-..', 'xx.x-...', '..xxx-..'],
      B: ['x.x.xx--', '.xx.xxx-', 'x.xxx.x-', '.x.x.xx-', 'xx.xx---'],
    },
  },
};

const FORM_CHOICES: Readonly<Partial<Record<MelodyKind, Weighted<PhraseForm>>>> = {
  chorus: [['period', 4], ['pairs', 2], ['sentence', 2], ['aaba', 2], ['callResponse', 2]],
  verse: [['period', 3], ['pairs', 2], ['sentence', 2], ['aaba', 1], ['callResponse', 3]],
  bridge: [['period', 2], ['pairs', 1], ['sentence', 3], ['aaba', 2]],
};

const MELODY_RANGES: Readonly<Record<MelodyKind, { center: number; lo: number; hi: number }>> = {
  chorus: { center: 4, lo: -1, hi: 9 },
  verse: { center: 1, lo: -3, hi: 6 },
  pre: { center: 2, lo: -2, hi: 9 },
  bridge: { center: 3, lo: -2, hi: 8 },
  riff: { center: 6, lo: 2, hi: 10 },
};

const HOLD_CELLS: Cells = {
  A: ['x-------', 'x-----x-', 'x---x---', '.x------'],
  B: ['x---x---', 'x-----.x'],
  C: ['x-------'],
  D: ['x-------'],
  E: ['x-------'],
};

const PRE_MELODIES: Readonly<Record<PreMelody, { sequence: number; cells: Cells }>> = {
  climb: { sequence: 1, cells: CELLS.pre },
  question: { sequence: 0, cells: CELLS.pre },
  hold: { sequence: 1, cells: HOLD_CELLS },
};

const SHAPE_CHOICES: Readonly<Record<MotifLetter, Weighted<ShapeName>>> = {
  A: [['rise', 3], ['arch', 3], ['leapFall', 2], ['zigzag', 2], ['valley', 1]],
  B: [['fall', 3], ['valley', 2], ['neighbor', 2], ['arch', 2], ['rise', 1]],
  C: [['fall', 2], ['neighbor', 2], ['valley', 2], ['arch', 1]],
  D: [['fall', 2], ['valley', 2], ['neighbor', 2], ['arch', 1], ['leapFall', 1]],
  E: [['rise', 2], ['arch', 2], ['leapFall', 1]],
  F: [['zigzag', 2], ['neighbor', 2], ['fall', 2], ['rise', 1]],
};

const ANSWER = {
  figures: [
    [[0, 1], [1, 2]],
    [[0, 1], [1, 1]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [2, 1]],
  ] as readonly (readonly [number, number])[][],
  startDegrees: [7, 8, 9],
  steps: [2, 3, -2],
};

const SOLO = {
  rhythms: [
    '..x.xxxxx.x.x...',
    'x.x.x.xxx.x.....',
    '..xxxxx.x...x.x.',
    'x...x.x.xxxxx...',
    '.xx.x.xxx.x.xx..',
    'x.xxx.x.x.x.x...',
    '..x.x.x.xxxxx.x.',
    'xxxxx.x.....x.x.',
  ],
  lo: 6,
  hi: 18,
  turn: 0.2,
  leaps: [1, 2, 2, 3],
  // Grace notes flick into notes that stand out: on the beat, or after a
  // breath. Mostly a chromatic lean up from a semitone below.
  grace: {
    chance: 0.2,
    from: [
      [{ from: -1, chromatic: true }, 5],
      [{ from: 1, chromatic: false }, 2],
      [{ from: 1, chromatic: true }, 1],
      [{ from: -1, chromatic: false }, 1],
    ] as Weighted<Pick<Grace, 'from' | 'chromatic'>>,
    // How many flicked grace notes would fill a sixteenth.
    split: 3,
    slur: 0.6,
    // Seconds a slurred note takes to slide into its pitch.
    slide: 0.05,
  },
};

const CHROMATIC_PROB = 0.15;
const CADENCE_WEIGHTS: Weighted<number> = [[0, 11], [7, 5], [-1, 4]];

/** A line in semitones above a key's tonic, on an eighth-note grid. */
export class Melody extends Line<MelodyNote> {
  constructor(bars: MelodyNote[][], readonly form?: PhraseForm) {
    super(bars, 8);
  }

  get top(): number {
    return Math.max(...this.bars.flat().map((n) => n.semis));
  }

  /** The first `n` bars. */
  take(n: number): Melody {
    return new Melody(this.bars.slice(0, n), this.form);
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

  /** Seconds a slurred note takes to slide into its pitch (Strudel's pattack). */
  static readonly slide = SOLO.grace.slide;

  render(): string[] {
    return this.renderWith((n) => {
      if (!n.grace || n.grace.slur) return String(n.degree);
      // A flicked grace note takes the front of the note: "[4b 4@2]".
      const { from, chromatic } = n.grace;
      const accidental = from > 0 ? '#' : 'b';
      const grace = chromatic ? `${n.degree}${accidental}` : String(n.degree + from);
      return `[${grace} ${n.degree}@${SOLO.grace.split * n.len - 1}]`;
    });
  }

  /** Semitones each note slides up into its pitch (Strudel's penv), in the same rhythm. */
  slides(): string[] {
    return this.renderWith((n) => String(n.grace?.slur ? -n.grace.semis : 0));
  }

  /** An improvised solo. Chord tones are the even degrees, and beats land on them. */
  static improvise(bars: Bar[], rng: Rng): Solo {
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
            const r = Solo.advance(rhythm, s, at.deg, at.dir, rng);
            const graced = (s % 4 === 0 || rhythm[s - 1] !== 'x') && rng.chance(SOLO.grace.chance);
            const note = graced ? { ...r.note, grace: Solo.grace(chordAt(bar, s, 16), r.deg, at.deg, rng) } : r.note;
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
  private static grace(chord: Chord, target: number, prev: number, rng: Rng): Grace {
    let { from, chromatic } = rng.weighted(SOLO.grace.from);
    if (!chromatic && target + from === prev) chromatic = true;
    const scale = chord.scale && Scale.named(chord.scale);
    const semis = chromatic || !scale ? from : scale.semis(target + from) - scale.semis(target);
    return { from, chromatic, semis, slur: rng.chance(SOLO.grace.slur) };
  }

  private static advance(
    rhythm: string,
    s: number,
    deg: number,
    dir: number,
    rng: Rng,
  ): { note: SoloNote; deg: number; dir: number } {
    const { lo, hi } = SOLO;
    if (rng.chance(SOLO.turn)) dir = -dir;
    deg += dir * (rhythm[s + 1] === 'x' ? 1 : rng.pick(SOLO.leaps));
    if (deg > hi) [deg, dir] = [hi - 1, -1];
    if (deg < lo) [deg, dir] = [lo + 1, 1];
    if (s % 4 === 0 && deg % 2 !== 0) deg += dir;
    return { note: { start: s, len: rhythm[s + 1] === '.' ? 2 : 1, degree: deg }, deg, dir };
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
function shapeOffsets(name: ShapeName, n: number, rng: Rng): number[] {
  switch (name) {
    case 'rise':
      return walk(n, () => rng.weighted([[1, 2], [2, 3], [3, 1]]));
    case 'fall':
      return walk(n, () => -rng.weighted([[1, 3], [2, 2]]));
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
    const { kind, style } = this;
    const each = (f: (i: number) => MotifLetter) => Array.from({ length: n }, (_, i) => f(i));
    if (kind === 'pre') {
      // All end on a half cadence into the chorus.
      if (style === 'question')
        return each((i) => {
          if (i === n - 1) return 'C';
          return i % 2 ? 'B' : 'A';
        });
      if (style === 'hold') return each((i) => (i === n - 1 ? 'C' : 'A'));
      return each((i) => {
        if (i === n - 1) return 'C';
        if (i === n - 2 && n >= 3) return 'B';
        return 'A';
      });
    }
    if (kind === 'riff')
      return each((i) => {
        if (i % 2 === 0) return 'A';
        return i === n - 1 ? 'D' : 'B';
      });
    const phrase = this.phrase!.plan;
    if (n <= 8) return phrase.slice(8 - n);
    return each((i) => {
      if (i < 8) return phrase[i];
      return i === n - 1 ? 'D' : 'E';
    });
  }

  write(bars: Bar[]): Melody {
    const plan = this.plan(bars.length);
    return new Melody(bars.map((bar, b) => this.bar(bar, plan[b])), this.form);
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
    this.prevDeg = Number.parseInt(scale.degree(this.prevSemis), 10);
    return notes;
  }

  // A rhythm cell with a shape. Openings start low enough to rise;
  // answers carry on from wherever the line has got to.
  private motif(letter: MotifLetter): Motif {
    const { rng, range } = this;
    const cells = this.phrase?.cells?.[letter] ?? this.cells[letter];
    if (!cells) throw new Error(`No ${letter} cells for a ${this.kind} melody`);
    const rhythm = parseRhythm(rng.pick(cells));
    const offsets = shapeOffsets(rng.weighted(SHAPE_CHOICES[letter]), rhythm.length, rng);
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
  [...cell].flatMap((ch, i) =>
    ch === 'x' ? [{ start: i, len: 1 + (/^-*/.exec(cell.slice(i + 1))?.[0].length ?? 0) }] : [],
  );

// Into the range lo to hi by thirds, so the note stays a chord-ish tone.
function clamp(d: number, lo: number, hi: number): number {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}
