// A related key's progression, then the cadence home, on an arpeggio and
// strings, the lead doubled high on bells. (A key change after it is the
// lift's to make.)

import { ADVENTUROUS, RHYTHM, tonalityOf } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Bridge extends PlayedSection<'bridge'> {
  readonly material: MaterialOf<'bridge'>;

  constructor(plan: SectionPlan<'bridge'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const key = new Harmonizer(ctx.key, rng.fork('key')).bridgeKey(ADVENTUROUS);
      const templates = tonalityOf(key.mode).templatesFor('bridge');
      const body = ctx.progress(rng.pick(templates), 6, rng.fork('harmony'), { key });
      const cadence = new Harmonizer(ctx.key, rng.fork('cadence')).approach();
      const bars = [...body, ...cadence];
      return {
        ...ctx.band('bridge', key, bars, RHYTHM.bridge, rng.fork('groove')),
        melody: ctx.melody('bridge', key, bars, rng.fork('melody')),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'bridge'>): Parts {
    const { band, C, underB } = ctx;
    const line = ctx.line(this.material.melody);
    return {
      drums: ctx.drums(),
      pitched: [underB, band.arp(C), band.strings(C), band.lead(line), band.bellDouble(line)],
    };
  }
}
