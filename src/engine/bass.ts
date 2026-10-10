// Bass lines. A writer picks a feel and rolls its own settings for it:
// how busy, how syncopated, how many octave pops, how long notes ring.
// It writes a one-bar groove, then varies it bar by bar, with a busier
// end to each four-bar phrase. Notes are chord-scale degrees, so the
// groove follows the changes, and a bar's last note can approach the
// next chord's root.

import { Line } from './line';
import { BASS, type Chord, type Key, Scale } from './music';
import type { Rng } from './random';
import type { Bar, Bass, BassFeel, BassFeelDef, BassToken } from './types';

const BASS_FEELS: Readonly<Record<BassFeel, BassFeelDef>> = {
  pedal: { grid: 8, density: [0.05, 0.25], sync: [0, 0.3], octave: [0, 0.3], legato: [0.7, 1], approach: 0.6 },
  funk: { grid: 16, density: [0.35, 0.65], sync: [0.4, 0.9], octave: [0.3, 0.8], legato: [0.1, 0.5], approach: 0.9 },
  drive: { grid: 8, density: [0.75, 1], sync: [0, 0.2], octave: [0.1, 0.4], legato: [0.5, 0.9], approach: 0.8 },
  disco: { grid: 8, density: [0.6, 1], sync: [0.1, 0.4], octave: [0.6, 1], legato: [0.2, 0.6], approach: 0.8 },
  halfTime: { grid: 16, density: [0.1, 0.3], sync: [0.3, 0.7], octave: [0.1, 0.4], legato: [0.6, 1], approach: 0.7 },
  bossa: {
    grid: 8,
    density: [0.1, 0.3],
    sync: [0.1, 0.3],
    octave: [0, 0.2],
    legato: [0.6, 0.9],
    approach: 0.7,
    anchors: { 6: 'F', 8: 'F' },
  },
};

const BASS_DEGREES: Readonly<Record<BassToken, string>> = {
  R: '0', T: '2', F: '4', S: '6', O: '7',
  two: '1', four: '3', six: '5', below: '-1',
};

type NoteWeights = readonly (readonly [BassToken, number, number])[];
const BASS_NOTES: { onBeat: NoteWeights; offBeat: NoteWeights } = {
  onBeat: [
    ['R', 3, 0], ['F', 2, 0], ['O', 1, 3], ['T', 1, 0], ['S', 0.5, 0],
  ],
  offBeat: [
    ['O', 0.5, 4], ['R', 1.5, 0], ['F', 1, 0], ['S', 1, 0], ['T', 0.7, 0],
    ['two', 0.4, 0], ['four', 0.4, 0], ['six', 0.3, 0], ['below', 0.3, 0],
  ],
};

type Step = BassToken | 'A' | null; // A: the approach note

export class BassWriter {
  readonly feel: BassFeel;
  private readonly def: BassFeelDef;
  private readonly density: number;
  private readonly sync: number;
  private readonly octave: number;
  private readonly legato: number;
  private readonly variety: number;

  constructor(
    feels: readonly BassFeel[],
    private readonly key: Key,
    private readonly rng: Rng,
    private readonly chromatic: number,
  ) {
    this.feel = rng.pick(feels);
    this.def = BASS_FEELS[this.feel];
    this.density = rng.range(this.def.density);
    this.sync = rng.range(this.def.sync);
    this.octave = rng.range(this.def.octave);
    this.legato = rng.range(this.def.legato);
    this.variety = rng.range(BASS.variety);
  }

  /** "<D2:dorian G1:mixolydian [A1:dorian Ab1:lydian:dominant] ...>" */
  static scales(bars: Bar[], key: Key): string {
    const items = bars.map((bar) =>
      bar.length === 1 ? bar[0].bassScale(key) : `[${bar.map((c) => c.bassScale(key)).join(' ')}]`,
    );
    return `<${items.join(' ')}>`;
  }

  write(bars: Bar[]): Bass {
    const groove = this.groove();
    const items = bars.map((bar, b) => {
      // Where the approach into the next chord starts (16: none). A chord
      // change mid-bar lands on the new root. Those steps are set, so only
      // the others are rolled.
      const approachStep = this.grid === 16 && this.rng.chance(0.5) ? 15 : 14;
      const at = this.rng.chance(this.def.approach) ? approachStep : 16;
      const split = bar.length > 1;
      const free = (i: number) => i !== 0 && !this.anchor(i) && i < at && !(split && i === 8);
      let steps = b === 0 ? [...groove] : this.vary(groove, free);
      if (b === bars.length - 1 || b % 4 === 3) steps = this.fill(steps, free);
      if (split) steps[8] = 'R';
      let target = '';
      if (at < 16) {
        steps.fill(null, at);
        steps[at] = 'A';
        target = this.approach(bar.at(-1)!, bars[(b + 1) % bars.length][0]);
      }
      return this.render(steps, (tok) => (tok === 'A' ? target : BASS_DEGREES[tok]));
    });
    return { feel: this.feel, pattern: `<${items.join(' ')}>`, scales: BassWriter.scales(bars, this.key) };
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
  private groove(): Step[] {
    return Array.from({ length: 16 }, (_, i) =>
      i === 0 || this.anchor(i) || this.sounds(i) ? (this.anchor(i) ?? this.note(i)) : null,
    );
  }

  // The groove with a few free steps re-rolled.
  private vary(groove: Step[], free: (i: number) => boolean): Step[] {
    return groove.map((tok, i) => {
      if (!free(i) || !this.rng.chance(this.variety)) return tok;
      return this.sounds(i) ? this.note(i) : null;
    });
  }

  // A busier second half to close a phrase.
  private fill(steps: Step[], free: (i: number) => boolean): Step[] {
    const density = Math.min(1, this.density + BASS.fill.density);
    const sync = Math.min(1, this.sync + BASS.fill.sync);
    return steps.map((tok, i) => {
      if (i < 8 || !free(i)) return tok;
      return this.rng.chance(density * this.strength(i, sync)) ? this.note(i) : null;
    });
  }

  // The note from `cur` into `next`'s root, as a degree of cur's scale.
  private approach(cur: Chord, next: Chord): string {
    const root = cur.bassMidi;
    let target = next.bassMidi;
    if (target - root > 6) target -= 12;
    if (root - target > 6) target += 12;
    const { rng } = this;
    const approach = rng.chance(this.chromatic) ? BASS.approachChromatic : BASS.approachDiatonic;
    let pitch =
      target === root
        ? root + rng.pick(BASS.approachSame)
        : target + rng.pick(approach);
    while (pitch < BASS.low) pitch += 12;
    return Scale.named(cur.scale!).degree(pitch - root, this.key.usesFlats);
  }

  // Notes ring to the next one, or are cut short when the feel is
  // choppy; the gap becomes a rest.
  private render(steps: Step[], degree: (tok: BassToken | 'A') => string): string {
    const starts = steps.flatMap((tok, i) => (tok ? [i] : []));
    const notes = starts.map((start, k) => {
      const gap = (starts[k + 1] ?? 16) - start;
      const maxLen = this.grid === 16 ? 1 : 2;
      const len = this.rng.chance(this.legato) ? gap : Math.min(gap, maxLen);
      return { start, len, degree: degree(steps[start]!) };
    });
    return Line.renderBar(notes, 16, (n) => n.degree);
  }
}
