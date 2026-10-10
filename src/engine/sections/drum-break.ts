// Drums alone, then a bass pickup into the next section's first chord.

import { DRUM_BREAK } from '../../style';
import type { Chord } from '../../theory';
import type { ScoreBand } from '../band';
import { DrumWriter, drumNotes, type Drums } from '../drums';
import type { Plan } from '../plan';
import type { BuildContext } from './build-context';
import { ScoreContext, type Parts } from './score-context';
import { Section } from './section';

// Drums alone, then a bass pickup into `into`, the next section's first
// chord, played `shift` semitones up (that section's shift).
export interface DrumBreakMaterial {
  drums: Drums;
  pickup: { into: Chord; shift: number };
}

export class DrumBreak extends Section<DrumBreakMaterial> {
  static readonly id = 'drumBreak';
  static readonly short = 'd';
  static override get label(): string {
    return 'drum break';
  }

  readonly material: DrumBreakMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { chord: into, shift } = ctx.firstChordAfter(this);
      return { drums: new DrumWriter(DRUM_BREAK, rng.fork('drums')).write(), pickup: { into, shift } };
    });
  }

  parts(band: ScoreBand, repeat: number): Parts {
    const ctx = new ScoreContext(this, band, repeat);
    const { into, shift } = this.material.pickup;
    return [drumNotes(band, this.material.drums, ctx.len, repeat), ctx.pickupInto(into).transpose(shift - this.shift)];
  }
}
