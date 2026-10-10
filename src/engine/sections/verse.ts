// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.

import { GROOVES, MELODIES } from '../../style';
import type { PlayedMaterial } from '../material';
import type { Melody } from '../melody';
import type { Plan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export interface VerseFields {
  /** A later round adds a layer. */
  later: boolean;
}

export interface VerseMaterial extends PlayedMaterial {
  melody: Melody;
}

export interface Verse extends Readonly<VerseFields> {}

export class Verse extends PlayedSection<VerseMaterial> {
  static readonly id = 'verse';
  static readonly short = 'v';

  readonly material: VerseMaterial;

  constructor(plan: Plan<VerseFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.progress(rng.pick(ctx.tonality.templates.verse), 8, rng.fork('harmony'));
      return {
        ...ctx.band(ctx.key, bars, GROOVES.verse, rng.fork('groove')),
        melody: ctx.melody(MELODIES.verse, ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B } = ctx;
    const { later } = this;
    return [
      ctx.drums(),
      B,
      band.keys(C),
      band.clav(C),
      band.lead(ctx.line(this.material.melody)),
      later && band.scratch(C),
      later && band.pad(C),
    ];
  }
}
