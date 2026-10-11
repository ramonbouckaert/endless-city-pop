// Melodic lines. Melodies are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and move
// to fit the new chord, which is what makes a hook sound like a hook.
// Strong beats land on chord tones; weak beats move by step. (Solos are
// in solo-line.ts.)

import type { Rng } from '../../lib/random';
import {
  ANSWER,
  type AnswerStyle,
  CADENCE_WEIGHTS,
  CHROMATIC_PROB,
  MELODY_HELD,
  PHRASE_FORMS,
  SHAPE_CHOICES,
  type LoopPlan,
  type MelodyStyle,
  type MotifLetter,
  type PhraseForm,
  type PhraseFormDef,
  type Reply,
  type ShapeName,
} from '../../style';
import { Chord, PitchClass, type Bar, type Key } from '../../theory';
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

  /** Its even bars' notes (the odd ones rest). */
  get alternate(): Melody {
    return new Melody(
      this.bars.map((notes, b) => (b % 2 ? [] : notes)),
      this.form,
    );
  }

  /** Whether each bar rests. */
  get rests(): boolean[] {
    return this.bars.map((notes) => !notes.length);
  }

  /** Its notes in the bars `keep` marks (the others rest). */
  where(keep: readonly boolean[]): Melody {
    return new Melody(
      this.bars.map((notes, b) => (keep[b] ? notes : [])),
      this.form,
    );
  }

  /**
   * Its first note held a half bar or more, as a lone note in its bar,
   * trilled: thirty-seconds with the note above (`above` gives it) for
   * half its length, then held.
   */
  trilled(above: (semis: number) => number): Melody {
    const at = this.bars.findIndex((notes) => notes.length === 1 && notes[0].len >= 8);
    if (at < 0) return this;
    const [held] = this.bars[at];
    const shakes = held.len; // thirty-seconds over the first half
    const trill = Array.from({ length: shakes }, (_, i) => ({
      start: held.start + i / 2,
      len: 0.5,
      semis: i % 2 ? above(held.semis) : held.semis,
    }));
    const rest = { start: held.start + shakes / 2, len: held.len - shakes / 2, semis: held.semis };
    return new Melody(
      this.bars.map((notes, b) => (b === at ? [...trill, rest] : notes)),
      this.form,
    );
  }

  /** The first `n` bars. */
  take(n: number): Melody {
    return new Melody(this.bars.slice(0, n), this.form);
  }

  /** Its bars from bar `n` on. */
  drop(n: number): Melody {
    return new Melody(this.bars.slice(n), this.form);
  }
}

type Figure = (typeof ANSWER.figures)[number];
/** An answer's figure, from a degree by steps (perhaps landing on the chord's root). */
interface Phrase {
  figure: Figure;
  first: number;
  steps: number[];
  land?: boolean;
}

/**
 * Where an answer goes: from `at` (perhaps after a pickup an eighth
 * before, over the tail of the hook's note `under`) to `room`, over the
 * chords `chordAt` gives (on into the next bar).
 */
interface Space {
  at: number;
  under?: number;
  room: number;
  chordAt: (step: number) => Chord;
}

// A figure cut where a space's room ends, without the pickups that led
// on past it. One with a note held off the eighths (a dotted 3-3-2) fits
// only from a beat: from an offbeat it pulls against the bar.
function cut(figure: Figure, { at, room }: Space): Figure {
  if (at % 4 && figure.some(([o, l]) => o % 2 && l > 1)) return [];
  const fits = figure.filter(([o, l]) => at + o + l <= room);
  while ((fits.at(-1)?.[1] ?? 2) < 2) fits.pop();
  return fits;
}

// Notes with each that repeats the one before held on from it instead.
function tied(notes: MelodyNote[]): MelodyNote[] {
  return notes.reduce<MelodyNote[]>((out, n) => {
    const before = out.at(-1);
    if (before?.semis !== n.semis) return [...out, n];
    return [...out.slice(0, -1), { ...before, len: n.start + n.len - before.start }];
  }, []);
}

// A phrase varied one way: turned the other way, begun a third higher,
// or landing on the chord's root.
function varied(phrase: Phrase, how: Reply): Phrase {
  if (how === 'turn') return { ...phrase, steps: phrase.steps.map((s) => -s) };
  if (how === 'lift') return { ...phrase, first: phrase.first + 2 };
  return { ...phrase, land: true };
}

/**
 * Writes the answer to a hook in a style: figures in the gaps it leaves,
 * high above it, in four-bar phrases (in every bar: a chorus picks which
 * it plays), or a line held over it.
 */
export class AnswerWriter {
  constructor(
    private readonly key: Key,
    private readonly style: AnswerStyle,
    private readonly rng: Rng,
  ) {}

  write(hook: Melody, bars: Bar[]): Melody {
    const { rng, style } = this;
    if (style === 'line') return this.line(bars);
    // A riff calls with one figure, from one degree by the same steps,
    // every time; fills call with a new one each time.
    const riff = style === 'riff' && this.phrase(rng.pick(ANSWER.figures));
    // A phrase's second half replies to its first (if in two notes or
    // more): fills turned the other way, a riff varied one way for the song.
    const reply = riff ? rng.weightedKey(ANSWER.riffReplies) : 'turn';
    const calls: (Phrase | undefined)[] = [];
    return new Melody(
      hook.bars.map((notes, b) => {
        const space = this.space(hook, bars, b);
        if (!space) return [];
        if (style === 'echo') return this.echo(notes, space);
        const call = b % 4 >= 2 ? calls[b - 2] : undefined;
        const replied = call && this.place(varied(call, reply), space);
        if (replied && replied.length > 1) return replied;
        calls[b] = riff || this.fill(space);
        return calls[b] ? this.place(calls[b], space) : [];
      }),
    );
  }

  // Where bar `b`'s answer goes, if the hook leaves it a gap. It may run
  // on into the next bar until the hook comes back (not into a bar the
  // hook rests, which has its own answer, nor past the chorus's end).
  private space(hook: Melody, bars: Bar[], b: number): Space | null {
    const found = gap(hook.bars[b]);
    if (!found) return null;
    const next = hook.bars[b + 1];
    return {
      ...found,
      room: next?.length ? 16 + next[0].start : 16,
      chordAt: (step) => (step < 16 ? Chord.at(bars[b], step) : Chord.at(bars[b + 1], step - 16)),
    };
  }

  // A new fill: a figure that fits, the longer the likelier (by the
  // square root of its span, so short ones still come up).
  private fill(space: Space): Phrase | undefined {
    const fits = ANSWER.figures.filter((f) => cut(f, space).length === f.length);
    if (!fits.length) return undefined;
    const span = (f: Figure) => Math.max(...f.map(([o, l]) => o + l));
    return this.phrase(this.rng.weighted(fits.map((f) => [f, Math.sqrt(span(f))] as const)));
  }

  // A figure from a high degree by steps: three all up, or all down, then
  // (in a long figure) back the other way.
  private phrase(figure: Figure): Phrase {
    const { rng } = this;
    const [out, back] = rng.chance(ANSWER.rise) ? [ANSWER.rising, ANSWER.falling] : [ANSWER.falling, ANSWER.rising];
    return {
      figure,
      first: rng.pick(ANSWER.startDegrees),
      steps: Array.from({ length: figure.length }, (_, i) => rng.pick(i < 3 ? out : back)),
    };
  }

  // A phrase's notes in a space (none if under two fit): each steps from
  // the one before, snapped to the chord (a long one to a tone it can
  // hold without rubbing, which may hold on the note before); the last is
  // held on up to `ANSWER.held`, a breath before the hook comes back,
  // and if the phrase lands, on the chord's nearest root. A pickup leads
  // into the first note.
  private place(phrase: Phrase, space: Space): MelodyNote[] {
    const { key } = this;
    const { at, room, chordAt } = space;
    const fits = cut(phrase.figure, space);
    if (fits.length < 2) return [];
    let prev = key.scale.semis(phrase.first);
    const notes = fits.map(([o, len], i) => {
      const start = at + o;
      const step = i ? phrase.steps[i - 1] : 0;
      const chord = chordAt(start);
      const last = i === fits.length - 1;
      const held = last ? Math.max(len, Math.min(room - ANSWER.breath - start, ANSWER.held)) : len;
      prev = chord.snap(prev + step, key, { prev, dir: Math.sign(step) || 1, clean: held >= MELODY_HELD * 16 });
      if (last && phrase.land) {
        const up = PitchClass.of(chord.root - key.tonic - prev);
        prev = up <= 6 ? prev + up : prev + up - 12;
      }
      return { start, len: held, semis: prev };
    });
    const pickup =
      space.under === undefined ? undefined : this.pickup(notes[0].semis, -Math.sign(phrase.steps[0]), space);
    return tied(pickup === undefined ? notes : [{ start: at - 2, len: 2, semis: pickup }, ...notes]);
  }

  // A pickup into `first`: the nearest tone of the chord under it, from
  // the side the line moves away from if it can, that rubs against
  // neither the hook's note it plays over nor the note it leads into.
  private pickup(first: number, side: number, { at, under, chordAt }: Space): number | undefined {
    const { key } = this;
    const rubs = (a: number, b: number) => [1, 11].includes(PitchClass.of(a - b));
    const tones = new Set(chordAt(at - 2).pcs.map((pc) => PitchClass.of(pc - key.tonic)));
    const near = (d: number) => [first + side * d, first - side * d];
    const fits = (s: number) =>
      tones.has(PitchClass.of(s)) && (under === undefined || !rubs(s, under)) && !rubs(s, first);
    for (let d = 2; d <= 7; d++) {
      const found = near(d).find(fits);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  // The last few notes the hook sang before the gap, again in it, high.
  private echo(notes: MelodyNote[], { at, room, chordAt }: Space): MelodyNote[] {
    const { key } = this;
    const tail = notes.filter((n) => n.start < at).slice(-ANSWER.echo);
    if (tail.length < 2) return [];
    const [lo, hi] = ANSWER.line.map((d) => key.scale.semis(d));
    let up = 0;
    while (tail[0].semis + up < lo) up += 12;
    while (tail[0].semis + up > hi) up -= 12;
    const placed = tail
      .map((n) => ({ ...n, start: at + n.start - tail[0].start, len: Math.min(n.len, 4) }))
      .filter((n) => n.start + n.len <= room);
    if (placed.length < 2) return [];
    return placed.reduce<MelodyNote[]>((out, n, i) => {
      const prev = out.at(-1)?.semis ?? n.semis + up;
      const dir = i ? Math.sign(n.semis - tail[i - 1].semis) : 0;
      return [...out, { ...n, semis: chordAt(n.start).snap(n.semis + up, key, { prev, dir, diatonic: true }) }];
    }, []);
  }

  // A long note on each chord: the nearest tone of the next, holding a
  // common tone once, then stepping on, turning back at its range's ends.
  // A note held across a chord change in the bar is one note.
  private line(bars: Bar[]): Melody {
    const { key, rng } = this;
    const [lo, hi] = ANSWER.line.map((d) => key.scale.semis(d));
    let prev = key.scale.semis(rng.pick(ANSWER.startDegrees));
    let dir = rng.pick([1, -1]);
    let held = false;
    return new Melody(
      bars.map((bar) => {
        const len = 16 / bar.length;
        return bar.reduce<MelodyNote[]>((out, chord, c) => {
          let semis = chord.snap(prev, key);
          if (semis === prev && held) semis = chord.snap(prev + 2 * dir, key, { prev, dir });
          if (semis > hi || semis < lo) {
            dir = semis > hi ? -1 : 1;
            semis = chord.snap(prev + 2 * dir, key, { prev, dir });
          }
          held = semis === prev;
          prev = semis;
          const last = out.at(-1);
          if (last?.semis === semis) return [...out.slice(0, -1), { ...last, len: last.len + len }];
          return [...out, { start: c * len, len, semis }];
        }, []);
      }),
    );
  }
}

// Where an answer fits in a bar of the hook, on an eighth: a gap at its
// end (from beat four at the latest), after a pickup over the tail of a
// last note a quarter long or more; or an eighth into a note held a
// dotted quarter or more.
function gap(notes: readonly MelodyNote[]): { at: number; under?: number } | null {
  const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.len)) : 0;
  const lastNote = notes.at(-1);
  const eighth = (step: number) => Math.ceil(step / 2) * 2;
  if (lastEnd <= 12)
    return { at: eighth(lastEnd), ...(lastNote && lastNote.len >= 4 ? { under: lastNote.semis } : {}) };
  if (lastNote && lastNote.len >= 6) return { at: eighth(lastNote.start + 2) };
  return null;
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

  /** Which motif plays in each of `n` bars. C: half cadence, D: full cadence, E: tag, F: fragment, H: held, R: rest. */
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
  // A rest bar (R) plays nothing, and leaves the line where it was.
  private bar(bar: Bar, letter: MotifLetter, at: Progress): { notes: MelodyNote[]; at: Progress } {
    if (letter === 'R') return { notes: [], at };
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
    // Notes the chord doesn't place (off the strong beats), which may turn chromatic.
    const free = new Set<number>();
    const placed = motif.notes.reduce<MelodyNote[]>((line, n, i) => {
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
      } else free.add(i);
      // A full cadence may settle on the tonic or fifth, if the chord under it has that note.
      if (last && letter === 'D') {
        const w = this.rng.weighted(
          CADENCE_WEIGHTS.filter(([w]) => w < 0 || chord.pcs.includes(PitchClass.of(key.tonic + w))),
        );
        if (w >= 0) semis = Math.round((semis - w) / 12) * 12 + w;
      }
      return [...line, { start: n.start, len: n.len, semis }];
    }, []);
    // A short free note stepping on a whole tone to the next, the line
    // going the same way into it, may approach it from a semitone off
    // (G F Eb as G E Eb): chromatic, but resolving at once.
    const notes = placed.map((n, i) => {
      const prev = placed[i - 1]?.semis ?? at.prevSemis;
      const next = placed[i + 1]?.semis;
      if (diatonic || !free.has(i) || n.len > 2 || next === undefined || Math.abs(next - n.semis) !== 2) return n;
      if (Math.sign(n.semis - prev) !== Math.sign(next - n.semis) || !this.rng.chance(CHROMATIC_PROB)) return n;
      return { ...n, semis: next - Math.sign(next - n.semis) };
    });
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

// A phrase form over `n` bars: a bar short, without the bar before its
// cadence; shorter still, its last bars; longer, tagged before its full
// cadence.
function phrasePlan(plan: readonly MotifLetter[], n: number): MotifLetter[] {
  if (n === plan.length - 1 && n > 1) return [...plan.slice(0, -2), ...plan.slice(-1)];
  if (n <= plan.length) return plan.slice(plan.length - n);
  return [...plan, ...new Array<MotifLetter>(n - plan.length - 1).fill('E'), 'D'];
}

// A loop over `n` bars, into as much of its end as fits after the first bar.
function loopPlan({ loop, end }: LoopPlan, n: number): MotifLetter[] {
  const ending = end.slice(-Math.max(1, Math.min(end.length, n - 1)));
  return [...Array.from({ length: n - ending.length }, (_, i) => loop[i % loop.length]), ...ending];
}

// "x-.x" -> notes with lengths, in sixteenths: x = a note, - = held, . =
// rest, each an eighth (in a cell of eight) or a sixteenth (of sixteen).
const parseRhythm = (cell: string): Note[] => {
  const unit = 16 / cell.length;
  return [...cell].flatMap((ch, i) =>
    ch === 'x' ? [{ start: unit * i, len: unit * (1 + (/^-*/.exec(cell.slice(i + 1))?.[0].length ?? 0)) }] : [],
  );
};

// Into the range lo to hi by thirds, so the note stays a chord-ish tone.
function foldByThirds(d: number, lo: number, hi: number): number {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}
