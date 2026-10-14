// Bass lines. A writer picks a feel and rolls its own settings for it:
// how busy, how syncopated, how many octave pops, how long notes ring.
// It writes a one-bar groove (or picks a feel's fixed riff), then varies
// it bar by bar, with a busier end to each four-bar phrase (a riff
// stays as it is). Notes are chord-scale degrees, so the
// groove follows the changes, and a bar's last note can approach the
// next chord's root, or (in some feels) push it a sixteenth early. Some
// feels ghost an octave pop after a note; a walking line has a way of
// its own.

import { along, lerp } from '../../lib/math';
import type { Odds, Range, Rng } from '../../lib/random';
import {
  BASS,
  BASS_DEGREES,
  BASS_FEELS,
  BASS_NOTES,
  type BassFeel,
  type BassFeelDef,
  type BassToken,
  SONG,
} from '../../style';
import { Chord, type Bar, type Degree, type Key } from '../../theory';
import { Line, type Note } from './line';

/** A note in the chord-scale of the chord it sounds over (the bar's last, for an approach note). */
export interface BassNote extends Note {
  degree: Degree;
}

/** A bass line in one feel. */
export class BassLine extends Line<BassNote> {
  constructor(
    readonly feel: BassFeel,
    bars: BassNote[][],
  ) {
    super(bars);
  }

  /** Its bars from bar `n` on. */
  drop(n: number): BassLine {
    return new BassLine(this.feel, this.bars.slice(n));
  }
}

type Step = BassToken | 'A' | 'pop' | null; // A: the approach note; pop: the last note's octave, ghosted

const ROOT: Degree = { step: 0, alter: 0 };

export class BassWriter {
  readonly feel: BassFeel;
  private readonly def: BassFeelDef;
  private readonly density: number;
  private readonly sync: number;
  private readonly octave: number;
  private readonly legato: number;
  private readonly variety: number;
  private readonly pops: number;
  // How much of a feel's busy end the song's tempo leaves (1: all of it).
  private readonly busy: number;

  /**
   * `bpm`: the song's tempo, which calms a line the faster it is; `riff`:
   * a riff (a cell, as BASS_FEELS' riffs are) to play in place of a feel,
   * the song's own.
   */
  constructor(
    feels: Odds<BassFeel>,
    private readonly key: Key,
    bpm: number,
    private readonly rng: Rng,
    riff?: string,
  ) {
    this.feel = riff ? 'riff' : rng.weightedKey(feels);
    this.def = riff ? { ...BASS_FEELS.riff, cells: [riff] } : BASS_FEELS[this.feel];
    this.busy = lerp(1, 1 - BASS.tempoCalm, along(bpm, SONG.pace));
    this.density = rng.range(this.calmed(this.def.density));
    this.sync = rng.range(this.calmed(this.def.sync));
    this.octave = rng.range(this.def.octave);
    this.legato = rng.range(this.def.legato);
    this.variety = rng.range(BASS.variety);
    this.pops = this.def.pops ? rng.range(this.def.pops) : 0;
  }

  write(bars: Bar[]): BassLine {
    const { walk } = this.def;
    if (walk) return new BassLine(this.feel, this.walk(bars, this.rng.chance(walk.eighths)));
    const groove = this.groove();
    // The bars that push the next bar's root onto their last sixteenth
    // (never the last, so a looping line starts on its root).
    const { anticipate } = this.def;
    const pushes = bars.map((_, b) => !!anticipate && b < bars.length - 1 && this.rng.chance(anticipate));
    const lines = bars.map((bar, b) => {
      // Where the approach into the next chord starts (16: none). A chord
      // change mid-bar lands on the new root. Those steps are set, so only
      // the others are rolled.
      const approachStep = this.grid === 16 && this.rng.chance(0.5) ? 15 : 14;
      const push = pushes[b];
      const pushed = b > 0 && pushes[b - 1];
      let at = this.rng.chance(this.def.approach) ? approachStep : 16;
      if (push) at = 15;
      const split = bar.length > 1;
      const free = (i: number) => i !== 0 && !this.anchor(i) && i < at && !(split && i === 8);
      // A fixed riff plays as it is, but for the song's last bar.
      const { cells } = this.def;
      const varied = b === 0 || cells ? groove : this.vary(groove, free);
      const ends = b === bars.length - 1 || (b % 4 === 3 && !cells);
      const played = ends ? this.fill(varied, free) : varied;
      // The approach note, then silence to the barline; and no root on
      // the downbeat the bar before pushed early.
      const steps = played.map((tok, i): Step => {
        if (i === at) return 'A';
        if (i > at || (i === 0 && pushed)) return null;
        return split && i === 8 ? 'R' : tok;
      });
      // The approach into the next bar's first chord (with no chords to
      // go between, the root), or that root itself, pushed.
      const last = bar.at(-1);
      const next = bars[(b + 1) % bars.length]?.[0];
      const target = at < 16 && last && next ? this.approach(last, next, push) : ROOT;
      return this.notes(steps, (tok, i) => (tok === 'A' ? target : this.degree(tok, Chord.at(bar, i))), push);
    });
    return new BassLine(this.feel, lines);
  }

  // A walking line, a quarter note a beat: each chord's bass note on its
  // first beat, then steps through its scale towards the next chord's
  // bass, the last beat approaching it. In `eighths`, each beat's note
  // twice, the last eighth approaching the next chord.
  private walk(bars: Bar[], eighths: boolean): BassNote[][] {
    return bars.map((bar, b) => {
      const next = bars[(b + 1) % bars.length][0];
      const each = 16 / bar.length;
      return bar.flatMap((chord, c) => {
        const into = bar[c + 1] ?? next;
        const first = this.degree('R', chord);
        const dir = into.bassMidi >= chord.bassMidi ? 1 : -1;
        const beats = each / 4;
        return Array.from({ length: beats }, (_, k): BassNote[] => {
          const start = c * each + k * 4;
          const last = k === beats - 1;
          const on: Degree = k === 0 ? first : { step: first.step + dir * k, alter: 0 };
          // The approach: the last beat (but a chord's only one), or in eighths its second eighth.
          if (!eighths) return [{ start, len: 4, degree: last && k > 0 ? this.approach(chord, into) : on }];
          return [
            { start, len: 2, degree: on },
            { start: start + 2, len: 2, degree: last ? this.approach(chord, into) : on },
          ];
        }).flat();
      });
    });
  }

  // A range with its busy end cut back for the tempo.
  private calmed([lo, hi]: Range): Range {
    return [lo, lo + (hi - lo) * this.busy];
  }

  private get grid(): 8 | 16 {
    return this.def.grid;
  }

  private anchor(i: number): BassToken | undefined {
    return this.def.anchors?.[i];
  }

  // How strongly each sixteenth pulls a note.
  private strength(i: number, sync = this.sync): number {
    if (this.grid === 8 && i % 2) return 0;
    if (i % 4 === 0) return 1;
    if (i % 2 === 0) return 0.45 + 0.4 * sync;
    return 0.8 * sync;
  }

  private sounds(i: number): boolean {
    return this.rng.chance(Math.min(1, this.density * this.strength(i) * BASS.densityBoost));
  }

  private note(i: number): BassToken {
    if (i === 0) return 'R';
    const weights = i % 4 === 0 ? BASS_NOTES.onBeat : BASS_NOTES.offBeat;
    return this.rng.weighted(weights.map(([tok, base, oct]) => [tok, base + oct * this.octave] as const));
  }

  // One bar as 16 steps: a note where one starts, null elsewhere; in a
  // popping feel, perhaps an octave pop on the free sixteenth after a
  // note. A feel with riffs plays one of them.
  private groove(): readonly Step[] {
    const { cells } = this.def;
    if (cells) return [...this.rng.pick(cells)].map((ch) => (ch === '.' ? null : (ch as BassToken)));
    const steps: Step[] = Array.from({ length: 16 }, (_, i) =>
      i === 0 || this.anchor(i) || this.sounds(i) ? (this.anchor(i) ?? this.note(i)) : null,
    );
    if (!this.pops) return steps;
    return steps.map((tok, i) => {
      const before = steps[i - 1];
      return !tok && before && before !== 'pop' && !this.anchor(i) && this.rng.chance(this.pops) ? 'pop' : tok;
    });
  }

  // The groove with a few free steps re-rolled.
  private vary(groove: readonly Step[], free: (i: number) => boolean): readonly Step[] {
    return groove.map((tok, i) => {
      if (!free(i) || !this.rng.chance(this.variety)) return tok;
      return this.sounds(i) ? this.note(i) : null;
    });
  }

  // A busier second half to close a phrase.
  private fill(steps: readonly Step[], free: (i: number) => boolean): readonly Step[] {
    const density = Math.min(1, this.density + BASS.fill.density * this.busy);
    const sync = Math.min(1, this.sync + BASS.fill.sync * this.busy);
    return steps.map((tok, i) => {
      if (i < 8 || !free(i)) return tok;
      return this.rng.chance(density * this.strength(i, sync)) ? this.note(i) : null;
    });
  }

  // A token as a degree of a chord's scale. Over a slash chord the line
  // sits on its bass: the root and fifth play the bass note, the octave
  // its octave.
  private degree(tok: BassToken, chord: Chord): Degree {
    if (chord.bass === undefined || !(tok === 'R' || tok === 'O' || tok === 'F'))
      return { step: BASS_DEGREES[tok], alter: 0 };
    const bass = chord.bassDegree;
    return tok === 'O' ? { ...bass, step: bass.step + BASS_DEGREES.O } : bass;
  }

  // The note from `cur` into `next`'s bass note (or, `exact`, that note),
  // as a degree of cur's scale, counted from its root.
  private approach(cur: Chord, next: Chord, exact = false): Degree {
    const from = cur.bassMidi;
    let target = next.bassMidi;
    if (target - from > 6) target -= 12;
    if (from - target > 6) target += 12;
    const { rng } = this;
    const approach = rng.chance(BASS.chromatic) ? BASS.approachChromatic : BASS.approachDiatonic;
    let pitch: number;
    if (exact) pitch = target;
    else pitch = target === from ? from + rng.pick(BASS.approachSame) : target + rng.weighted(approach);
    while (pitch < Chord.BASS_LOW) pitch += 12;
    return cur.chordScale.degree(pitch - cur.rootMidi, this.key.usesFlats);
  }

  // Notes ring to the next one, or are cut short when the feel is
  // choppy; the gap becomes a rest. A pop is a ghost of the note before
  // it an octave away; a pushed root rings over the barline.
  private notes(
    steps: readonly Step[],
    degree: (tok: BassToken | 'A', start: number) => Degree,
    push: boolean,
  ): BassNote[] {
    const starts = steps.flatMap((tok, i) => (tok ? [{ start: i, tok }] : []));
    return starts.reduce<BassNote[]>((out, { start, tok }, k) => {
      if (tok === 'pop') {
        const prev = out.at(-1)?.degree ?? ROOT;
        const up = prev.step < BASS_DEGREES.O ? 1 : -1;
        return [...out, { start, len: BASS.popLen, degree: { ...prev, step: prev.step + up * BASS_DEGREES.O } }];
      }
      if (tok === 'A' && push) return [...out, { start, len: BASS.pushLen, degree: degree(tok, start) }];
      const gap = (starts[k + 1]?.start ?? 16) - start;
      const maxLen = this.grid === 16 ? 1 : 2;
      const len = this.rng.chance(this.legato) ? gap : Math.min(gap, maxLen);
      return [...out, { start, len, degree: degree(tok, start) }];
    }, []);
  }
}
