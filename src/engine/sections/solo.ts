// Changes as long as the section, and the line over them: the first solo
// over the band, a later one never over what the one before had (a bossa
// comp, perhaps).

import type { Program } from '../../lib/general-midi';
import { COMP, RUN_INTO, SOLO_COMPS, type SoloComp } from '../../style';
import type { Sounds } from '../song';
import { SoloChangesWriter, SoloWriter, type Solo } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, swappedKeys, type Plan, type PlayedMaterial } from './section';
import { spans } from '../score';

export interface SoloFields {
  /** Its soloist, as an index into the song's soloists. */
  soloist: number;
}

export interface SoloMaterial extends PlayedMaterial {
  variant: SoloComp;
  solo: Solo;
  /** Sounds for its keys of its own, in order of preference, if it has them (swappedKeys). */
  keys?: readonly Program[];
  /** Whether it ends with the horns running up into the next downbeat. */
  run: boolean;
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
      const keys = ctx.swap(rng.fork('swap'));
      return {
        ...ctx.band(ctx.key, bars, SOLO_COMPS[variant].groove, rng.fork('groove')),
        variant,
        solo: new SoloWriter(rng.fork('line')).write(bars),
        ...(keys === undefined ? {} : { keys }),
        run: rng.fork('run').chance(RUN_INTO),
      };
    });
  }

  override sounds(song: Sounds): Partial<Sounds> | undefined {
    return swappedKeys(this.material.keys, song);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return [
      ctx.drums(),
      B,
      bossa ? band.keysUnder(C, spans(COMP.bossa, len)) : band.keysUnder(C),
      // (No clavinet over keys swapped to one.)
      bossa ? band.strings(C) : !band.shares('keys', 'clav') && ctx.clav,
      band.soloist(this.soloist, ctx.soloLine(mat.solo, band.chordal(this.soloist))).pan(bossa ? 0.42 : 0.55),
      mat.run && ctx.runInto(),
    ];
  }
}
