// Bass lines. A writer picks a feel and rolls its own settings for it:
// how busy, how syncopated, how many octave pops, how long notes ring.
// It writes a one-bar groove, then varies it bar by bar, with a busier
// end to each four-bar phrase. Notes are chord-scale degrees, so the
// groove follows the changes, and a bar's last note can approach the
// next chord's root.

import type { Odds, Rng } from '../lib/random';
import { BASS, BASS_DEGREES, BASS_FEELS, BASS_NOTES, type BassFeel, type BassFeelDef, type BassToken } from '../style';
import { BASS_LOW, type Bar, type Chord, type Degree, type Key } from '../theory';
import { Line, type Note } from './line';

/** A note in the chord-scale of the chord it sounds over (the bar's last, for an approach note). */
export interface BassNote extends Note {
  degree: Degree;
}

/** A bass line on a sixteenth grid, in one feel. */
export class BassLine extends Line<BassNote> {
  constructor(
    readonly feel: BassFeel,
    bars: BassNote[][],
  ) {
    super(bars, 16);
  }
}

type Step = BassToken | 'A' | null; // A: the approach note

const ROOT: Degree = { step: 0, alter: 0 };

export class BassWriter {
  readonly feel: BassFeel;
  private readonly def: BassFeelDef;
  private readonly density: number;
  private readonly sync: number;
  private readonly octave: number;
  private readonly legato: number;
  private readonly variety: number;

  constructor(
    feels: Odds<BassFeel>,
    private readonly key: Key,
    private readonly rng: Rng,
  ) {
    this.feel = rng.weightedKey(feels);
    this.def = BASS_FEELS[this.feel];
    this.density = rng.range(this.def.density);
    this.sync = rng.range(this.def.sync);
    this.octave = rng.range(this.def.octave);
    this.legato = rng.range(this.def.legato);
    this.variety = rng.range(BASS.variety);
  }

  write(bars: Bar[]): BassLine {
    const groove = this.groove();
    const lines = bars.map((bar, b) => {
      // Where the approach into the next chord starts (16: none). A chord
      // change mid-bar lands on the new root. Those steps are set, so only
      // the others are rolled.
      const approachStep = this.grid === 16 && this.rng.chance(0.5) ? 15 : 14;
      const at = this.rng.chance(this.def.approach) ? approachStep : 16;
      const split = bar.length > 1;
      const free = (i: number) => i !== 0 && !this.anchor(i) && i < at && !(split && i === 8);
      const varied = b === 0 ? groove : this.vary(groove, free);
      const played = b === bars.length - 1 || b % 4 === 3 ? this.fill(varied, free) : varied;
      // The approach note, then silence to the barline.
      const steps = played.map((tok, i): Step => {
        if (i === at) return 'A';
        if (i > at) return null;
        return split && i === 8 ? 'R' : tok;
      });
      // The approach into the next bar's first chord (with no chords to
      // go between, the root).
      const last = bar.at(-1);
      const next = bars[(b + 1) % bars.length]?.[0];
      const target = at < 16 && last && next ? this.approach(last, next) : ROOT;
      return this.notes(steps, (tok) => (tok === 'A' ? target : { step: BASS_DEGREES[tok], alter: 0 }));
    });
    return new BassLine(this.feel, lines);
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

  // One bar as 16 steps: a note where one starts, null elsewhere.
  private groove(): readonly Step[] {
    return Array.from({ length: 16 }, (_, i) =>
      i === 0 || this.anchor(i) || this.sounds(i) ? (this.anchor(i) ?? this.note(i)) : null,
    );
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
    const density = Math.min(1, this.density + BASS.fill.density);
    const sync = Math.min(1, this.sync + BASS.fill.sync);
    return steps.map((tok, i) => {
      if (i < 8 || !free(i)) return tok;
      return this.rng.chance(density * this.strength(i, sync)) ? this.note(i) : null;
    });
  }

  // The note from `cur` into `next`'s root, as a degree of cur's scale.
  private approach(cur: Chord, next: Chord): Degree {
    const root = cur.bassMidi;
    let target = next.bassMidi;
    if (target - root > 6) target -= 12;
    if (root - target > 6) target += 12;
    const { rng } = this;
    const approach = rng.chance(BASS.chromatic) ? BASS.approachChromatic : BASS.approachDiatonic;
    let pitch = target === root ? root + rng.pick(BASS.approachSame) : target + rng.weighted(approach);
    while (pitch < BASS_LOW) pitch += 12;
    return cur.chordScale.degree(pitch - root, this.key.usesFlats);
  }

  // Notes ring to the next one, or are cut short when the feel is
  // choppy; the gap becomes a rest.
  private notes(steps: readonly Step[], degree: (tok: BassToken | 'A') => Degree): BassNote[] {
    const starts = steps.flatMap((tok, i) => (tok ? [{ start: i, tok }] : []));
    return starts.map(({ start, tok }, k) => {
      const gap = (starts[k + 1]?.start ?? 16) - start;
      const maxLen = this.grid === 16 ? 1 : 2;
      const len = this.rng.chance(this.legato) ? gap : Math.min(gap, maxLen);
      return { start, len, degree: degree(tok) };
    });
  }
}
