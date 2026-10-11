// One of the flavour's progressions, fitted to end on its cadence into
// the chorus (one as long as the section, if there is one), played in the
// flavour's texture. Later rounds add a layer.

import { PRE_FLAVOURS, RHYTHMS, type PreFlavour } from '../../style';
import type { Melody } from '../writers';
import { rise, spans, type NoteSpec } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export interface PreChorusFields {
  /** A later round adds a layer. */
  later: boolean;
}

export interface PreChorusMaterial extends PlayedMaterial {
  variant: PreFlavour;
  melody: Melody;
}

export interface PreChorus extends Readonly<PreChorusFields> {}

export class PreChorus extends PlayedSection<PreChorusMaterial> {
  static readonly id = 'pre';
  static readonly short = 'p';

  readonly material: PreChorusMaterial;

  constructor(plan: Plan<PreChorusFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { key } = ctx;
      const variant = rng.weightedKey(PRE_FLAVOURS);
      const flavour = PRE_FLAVOURS[variant];
      const template = rng.pick(ctx.tonality.preTemplates(variant, this.bars));
      const bars = ctx.progress(template, this.bars, rng.fork('harmony'), { ending: true });
      return {
        ...ctx.band(key, bars, flavour.groove, rng.fork('groove')),
        variant,
        melody: ctx.melody(flavour.melody, key, bars, rng.fork('melody')),
      };
    });
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return ctx.line(this.material.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, underB, len, riser } = ctx;
    const drums = ctx.drums();
    const lead = band.lead(ctx.line(this.material.melody));
    const { later } = this;
    switch (this.material.variant) {
      case 'pedal':
        // Long notes over a held bass, strings swelling.
        return [drums, riser, B, band.softKeysUnder(C), ctx.swell(0.14), lead, later && band.choir(C)];
      case 'drop':
        // The drums drop out, then come back halfway.
        return [
          drums.mask(ctx.from(Math.floor(len / 2))),
          underB,
          band.pad(C),
          band.softKeysUnder(C),
          lead,
          later && band.strings(C),
        ];
      case 'stops':
        // Stop-time hits under a free lead.
        return [...ctx.stopTime(drums), lead, later && band.strings(C)];
      case 'borrowed':
        return [drums, B, band.keysUnder(C), band.strings(C), band.choir(C), lead, later && band.pad(C)];
      case 'climb':
        // Eighth-note keys opening up over a noise riser.
        return [
          drums,
          riser,
          B,
          band.comp(C, spans(RHYTHMS.eighths, len)).lpf(rise(800, 7000, len)),
          band.pad(C),
          lead,
          later && band.strings(C),
        ];
    }
  }
}
