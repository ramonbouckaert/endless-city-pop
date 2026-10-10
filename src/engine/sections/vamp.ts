// The vamp's chords, and how its drums come in: after two bars, with kick
// and hats alone at first, or throughout. When the vamp comes back, the
// band is already going.

import { GROOVES, VAMP_ENTRIES, type VampEntry } from '../../style';
import { rise } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export interface VampFields {
  /** The opening vamp back: the band already going. */
  returning: boolean;
}

export interface VampMaterial extends PlayedMaterial {
  variant: VampEntry;
}

export interface Vamp extends Readonly<VampFields> {}

export class Vamp extends PlayedSection<VampMaterial> {
  static readonly id = 'vamp';
  static readonly short = 'vp';

  readonly material: VampMaterial;

  constructor(plan: Plan<VampFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => ({
      ...ctx.band(ctx.key, ctx.vampBars(), GROOVES.vamp, rng.fork('groove')),
      variant: rng.weightedKey(VAMP_ENTRIES),
    }));
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len } = ctx;
    const entry = this.returning ? 'full' : this.material.variant;
    let drums;
    if (entry === 'late') drums = ctx.drums().mask(ctx.from(2));
    else if (entry === 'light')
      drums = ctx.drums((role) => (role === 'kick' || role === 'hat' ? undefined : ctx.from(2)));
    else drums = ctx.drums();
    return [drums, B, band.keys(C).lpf(rise(700, 8000, len))];
  }
}
