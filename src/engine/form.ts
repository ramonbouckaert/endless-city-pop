// Song form: the ordered sections, their lengths, and what a repeat
// changes. Every song has an intro, a verse, a chorus
// and a final chord; the rest is optional, so songs range from a short
// verse-chorus-solo tune to a long one with several rounds, two
// soloists, a bridge, a breakdown and a key change. Every instance of a
// type plays the same material; a section longer than it loops it.

import { FORM } from './constants';
import type { Rng } from './random';
import type { SectionOpts, SectionType, Turnaround } from './types';

export class Section {
  constructor(
    readonly type: SectionType,
    readonly bars: number,
    readonly opts: SectionOpts = {},
  ) {}

  /** Semitones up, for sections after a key change. */
  get shift(): number {
    return this.opts.shift ?? 0;
  }

  describe(): string {
    const { liftTo, turnaround } = this.opts;
    if (liftTo) return `${this.type} (to +${liftTo}, ${turnaround}) ${this.bars}`;
    return `${this.type}${this.shift ? ` (+${this.shift})` : ''} ${this.bars}`;
  }
}

export class FormPlanner {
  private readonly preBars: number;
  private readonly chorusBars: number;

  /** `turnarounds`: the lifts into a final chorus the song's tonality offers. */
  constructor(
    private readonly rng: Rng,
    private readonly turnarounds: Readonly<Record<string, Turnaround>>,
  ) {
    this.preBars = rng.pick(FORM.preBars); // 0: no pre-chorus
    this.chorusBars = rng.chance(FORM.chorusTag) ? 10 : 8;
  }

  plan(): Section[] {
    return [...this.opening(), ...this.rounds(), ...this.middle(), ...this.ending()];
  }

  private opening(): Section[] {
    const { rng } = this;
    const s = [new Section('intro', rng.pick(FORM.introBars))];
    if (rng.chance(FORM.vamp.chance)) s.push(new Section('vamp', rng.pick(FORM.vamp.bars)));
    return s;
  }

  // Verse / pre-chorus / chorus rounds.
  private rounds(): Section[] {
    const { rng } = this;
    const riffChance = rng.pick(FORM.riffChance);
    return Array.from({ length: rng.weighted(FORM.rounds) }, (_, r) => {
      const round = [new Section('verse', rng.pick(FORM.verseBars), r ? { second: true } : {})];
      if (this.preBars) round.push(new Section('pre', this.preBars, r ? { second: true } : {}));
      round.push(new Section('chorus', this.chorusBars, r ? { answer: true } : {}));
      if (rng.chance(riffChance)) round.push(new Section('riff', 4));
      return round;
    }).flat();
  }

  // A bridge and up to two solos, in either order, then perhaps a
  // breakdown, and perhaps a drum break into a solo or the last choruses.
  private middle(): Section[] {
    const { rng } = this;
    const parts: Section[][] = [];
    if (rng.chance(FORM.bridgeChance)) parts.push([new Section('bridge', 8)]);
    const soloCount = rng.weighted(FORM.soloCount);
    if (soloCount) {
      const soloists = rng.shuffle(FORM.soloists);
      parts.push(
        (['solo', 'solo2'] as const)
          .slice(0, soloCount)
          .map((type, i) => new Section(type, rng.pick(FORM.soloBars), { soloist: soloists[i] })),
      );
    }
    const body = rng.shuffle(parts).flat();
    if (rng.chance(FORM.breakdown.chance)) {
      body.push(new Section('breakdown', rng.pick(FORM.breakdown.bars)));
    }
    if (rng.chance(FORM.drumBreakChance)) {
      const spots = body.flatMap((x, i) => (x.type.startsWith('solo') ? [i] : []));
      body.splice(rng.pick([...spots, body.length]), 0, new Section('drumBreak', 2));
    }
    return body;
  }

  // The last choruses, each perhaps lifted a key by a turnaround,
  // then the ending.
  private ending(): Section[] {
    const { rng } = this;
    const { lift } = FORM;
    const turnarounds = Object.entries(this.turnarounds).map(([name, t]) => [name, t.weight] as const);
    const s: Section[] = [];
    let shift = 0;
    const finals = rng.weighted(FORM.finalChoruses);
    for (let i = 0; i < finals; i++) {
      const step = rng.weighted(lift.steps);
      if (shift + step <= lift.maxShift && rng.chance(i ? lift.again : lift.first)) {
        shift += step;
        const turnaround = rng.weighted(turnarounds);
        const bars = this.turnarounds[turnaround].bars.length;
        s.push(new Section('lift', bars, { liftTo: shift, turnaround }));
      }
      const big = i === finals - 1;
      s.push(new Section('chorus', this.chorusBars, { answer: true, big, shift }));
    }
    if (rng.chance(FORM.outroChance)) s.push(new Section('outro', 4, { shift }));
    s.push(new Section('finale', 2, { shift }));
    return s;
  }
}
