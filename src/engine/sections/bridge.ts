// A related key's progression, then the cadence home (into the key of
// whatever follows), on an arpeggio and strings, the lead doubled high on
// bells.

import { ADVENTUROUS, RHYTHM, tonalityOf } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Bridge extends Section<'bridge'> {
  readonly material: MaterialOf<'bridge'>;

  constructor(plan: SectionPlan<'bridge'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const key = new Harmonizer(ctx.key, rng.fork('key')).bridgeKey(ADVENTUROUS);
      const templates = tonalityOf(key.mode).templatesFor('bridge');
      const body = ctx.progress(rng.pick(templates), 6, rng.fork('harmony'), key);
      const cadence = new Harmonizer(
        ctx.key.transpose(ctx.plan.after(plan)?.shift ?? 0),
        rng.fork('cadence'),
      ).approach();
      const bars = [...body, ...cadence];
      return {
        ...ctx.band('bridge', key, bars, RHYTHM.bridge, rng.fork('groove')),
        melody: ctx.melody('bridge', key, bars, rng.fork('melody')),
      };
    });
  }

  play(ctx: PlayedScoreContext<'bridge'>): Parts {
    const { band, C, B } = ctx;
    const mat = this.material;
    return {
      drums: ctx.drums(),
      pitched: [
        B.gain(0.65),
        band.arp(C),
        band.strings(C),
        band.lead(ctx.line(mat.melody)),
        band.bell(ctx.line(mat.melody, 12)).gain(0.15),
      ],
    };
  }
}
