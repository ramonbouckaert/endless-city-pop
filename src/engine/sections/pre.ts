// One of the flavour's progressions, fitted to end on its cadence into
// the chorus (one as long as the section, if there is one), played in the
// flavour's texture. Later rounds add a layer.

import type { Rng } from '../../lib/random';
import { PRE_FLAVOURS } from '../../style';
import { RHYTHMS, spans } from '../figures';
import { Harmonizer } from '../harmony';
import { Part, rise } from '../score';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class PreChorus extends SectionBase<'pre'> {
  /** A later round adds a layer. */
  readonly later: boolean;

  constructor(bars: number, { later, ...placement }: { later: boolean } & Placement) {
    super('pre', bars, placement);
    this.later = later;
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'pre'> {
    const { key } = ctx;
    const variant = rng.weightedKey(PRE_FLAVOURS);
    const { groove, melody } = PRE_FLAVOURS[variant];
    const template = rng.pick(ctx.tonality.preTemplates(variant, this.bars));
    const bars = new Harmonizer(key, rng.fork('harmony')).progression(template, this.bars, { ending: true });
    return {
      ...ctx.band('pre', key, bars, groove, rng.fork('groove')),
      variant,
      melody: ctx.melody('pre', key, bars, rng.fork('melody'), melody),
    };
  }

  play(ctx: PlayedScoreContext<'pre'>): Parts {
    const { band, C, B, len, riser } = ctx;
    const drums = ctx.drums();
    const lead = band.lead(ctx.line(this.material.melody));
    const { later } = this;
    switch (this.material.variant) {
      case 'pedal':
        // Long notes over a held bass, strings swelling.
        return {
          drums: [...drums, riser],
          pitched: [B, band.softKeys(C).gain(0.26), ctx.swell(0.14), lead, later && band.choir(C)],
        };
      case 'drop':
        // The drums drop out, then come back halfway.
        return {
          drums: [Part.stack(...drums).mask(ctx.from(Math.floor(len / 2)))],
          pitched: [B.gain(0.6), band.pad(C), band.softKeys(C).gain(0.26), lead, later && band.strings(C)],
        };
      case 'stops': {
        // Stop-time hits under a free lead.
        const stop = ctx.stopTime(drums);
        return { drums: stop.drums, pitched: [...stop.pitched, lead, later && band.strings(C)] };
      }
      case 'borrowed':
        return {
          drums,
          pitched: [B, band.keys(C).gain(0.28), band.strings(C), band.choir(C), lead, later && band.pad(C)],
        };
      case 'climb':
        // Eighth-note keys opening up over a noise riser.
        return {
          drums: [...drums, riser],
          pitched: [
            B,
            band
              .keys(C, spans(RHYTHMS.eighths, len))
              .clip(0.4)
              .gain(0.3)
              .lpf(rise(800, 7000, len)),
            band.pad(C),
            lead,
            later && band.strings(C),
          ],
        };
    }
  }
}
