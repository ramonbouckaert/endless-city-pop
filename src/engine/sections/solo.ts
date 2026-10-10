// Changes as long as the section, and the line over them: the first solo
// over the band, a later one never over what the one before had (a bossa
// comp, perhaps).

import { COMP, SOLO_COMPS, type SoloComp } from '../../style';
import { spans } from '../figures';
import type { PlayedMaterial } from '../material';
import type { Plan } from '../plan';
import { SoloChangesWriter } from '../solo-changes';
import { SoloWriter, type Solo } from '../solo-line';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export interface SoloFields {
  /** Its soloist, as an index into the song's soloists. */
  soloist: number;
}

export interface SoloMaterial extends PlayedMaterial {
  variant: SoloComp;
  solo: Solo;
}

export interface SoloSection extends Readonly<SoloFields> {}

export class SoloSection extends PlayedSection<SoloMaterial> {
  static readonly id = 'solo';
  static readonly short = 's';
  static override readonly handsOver = true;

  readonly material: SoloMaterial;

  constructor(plan: Plan<SoloFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const before = ctx.previous(this);
      const variant = before ? rng.weightedKey(SOLO_COMPS, before.material.variant) : 'band';
      const bars = new SoloChangesWriter(ctx.key, rng.fork('changes')).write(this.bars);
      return {
        ...ctx.band(ctx.key, bars, SOLO_COMPS[variant].groove, rng.fork('groove')),
        variant,
        solo: new SoloWriter(rng.fork('line')).write(bars),
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return [
      ctx.drums(),
      B,
      bossa ? band.keysUnder(C, spans(COMP.bossa, len)) : band.keysUnder(C),
      bossa ? band.strings(C) : band.clav(C),
      band.soloist(this.soloist, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
    ];
  }
}
