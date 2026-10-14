// Strings and a pad swelling on one held chord, the intro's first, before
// the intro (J-Cycle's), a reverse cymbal into it. The band never plays.

import { Changes, type ScoreBand } from '../score';
import type { Chord } from '../../theory';
import type { BuildContext } from './build-context';
import { ScoreContext, type Parts } from './score-context';
import { Section, type Plan } from './section';

// The chord it holds.
export interface SwellMaterial {
  chord: Chord;
}

export class Swell extends Section<SwellMaterial> {
  static readonly id = 'swell';
  static readonly short = 'w';

  readonly material: SwellMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, () => ({ chord: ctx.introBars().bars[0][0] }));
  }

  parts(band: ScoreBand, repeat: number): Parts {
    // The chord held through the section, not struck again each bar.
    const held = new Changes([{ time: 0, dur: this.bars, chord: this.material.chord }], this.bars);
    const { riser } = new ScoreContext(this, band, repeat);
    return [band.swell(held, 0.14), band.pad(held), riser];
  }
}
