// A related key's progression, then the cadence home, on an arpeggio and
// strings, the lead doubled high on bells. (A key change after it is the
// lift's to make.)

import { ADVENTUROUS, GROOVES, MELODIES, tonalityOf } from '../../style';
import { Harmonizer } from '../harmony';
import type { PlayedMaterial } from '../material';
import type { Melody } from '../melody';
import type { Plan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export interface BridgeMaterial extends PlayedMaterial {
  melody: Melody;
}

export class Bridge extends PlayedSection<BridgeMaterial> {
  static readonly id = 'bridge';
  static readonly short = 'b';
  static override readonly handsOver = true;

  readonly material: BridgeMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const key = new Harmonizer(ctx.key, rng.fork('key')).bridgeKey(ADVENTUROUS);
      const templates = tonalityOf(key.mode).bridges;
      const body = ctx.progress(rng.pick(templates), 6, rng.fork('harmony'), { key });
      const cadence = new Harmonizer(ctx.key, rng.fork('cadence')).approach();
      const bars = [...body, ...cadence];
      return {
        ...ctx.band(key, bars, GROOVES.bridge, rng.fork('groove')),
        melody: ctx.melody(MELODIES.bridge, key, bars, rng.fork('melody')),
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, underB } = ctx;
    const line = ctx.line(this.material.melody);
    return [ctx.drums(), underB, band.arp(C), band.strings(C), band.lead(line), band.bellDouble(line)];
  }
}
