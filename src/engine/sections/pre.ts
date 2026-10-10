// One of the flavour's progressions, fitted to end on its cadence into
// the chorus (one as long as the section, if there is one), played in the
// flavour's texture. Later rounds add a layer.

import { PRE_FLAVOURS, RHYTHM, RHYTHMS } from '../../style';
import { spans } from '../figures';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import { Part, rise } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class PreChorus extends PlayedSection<'pre'> implements Readonly<SectionFields['pre']> {
  readonly later: boolean;
  readonly material: MaterialOf<'pre'>;

  constructor(plan: SectionPlan<'pre'>, ctx: BuildContext) {
    super(plan);
    this.later = plan.later;
    this.material = ctx.material(this, (rng) => {
      const { key } = ctx;
      const variant = rng.weightedKey(PRE_FLAVOURS);
      const template = rng.pick(ctx.tonality.preTemplates(variant, this.bars));
      const bars = ctx.progress(template, this.bars, rng.fork('harmony'), { ending: true });
      return {
        ...ctx.band('pre', key, bars, RHYTHM.pre[variant], rng.fork('groove')),
        variant,
        melody: ctx.melody('pre', key, bars, rng.fork('melody'), PRE_FLAVOURS[variant].melody),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'pre'>): Parts {
    const { band, C, B, underB, len, riser } = ctx;
    const drums = ctx.drums();
    const lead = band.lead(ctx.line(this.material.melody));
    const { later } = this;
    switch (this.material.variant) {
      case 'pedal':
        // Long notes over a held bass, strings swelling.
        return {
          drums: [...drums, riser],
          pitched: [B, band.softKeysUnder(C), ctx.swell(0.14), lead, later && band.choir(C)],
        };
      case 'drop':
        // The drums drop out, then come back halfway.
        return {
          drums: [Part.stack(...drums).mask(ctx.from(Math.floor(len / 2)))],
          pitched: [underB, band.pad(C), band.softKeysUnder(C), lead, later && band.strings(C)],
        };
      case 'stops': {
        // Stop-time hits under a free lead.
        const stop = ctx.stopTime(drums);
        return { drums: stop.drums, pitched: [...stop.pitched, lead, later && band.strings(C)] };
      }
      case 'borrowed':
        return {
          drums,
          pitched: [B, band.keysUnder(C), band.strings(C), band.choir(C), lead, later && band.pad(C)],
        };
      case 'climb':
        // Eighth-note keys opening up over a noise riser.
        return {
          drums: [...drums, riser],
          pitched: [
            B,
            band.comp(C, spans(RHYTHMS.eighths, len)).lpf(rise(800, 7000, len)),
            band.pad(C),
            lead,
            later && band.strings(C),
          ],
        };
    }
  }
}
