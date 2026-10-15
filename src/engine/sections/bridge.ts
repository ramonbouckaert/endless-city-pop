// A related key's progression (six bars, or ten: a template that fills
// them, if any), then the cadence home (the key's approach, or V/V and V
// suspended: BRIDGE), on an arpeggio and strings, the lead doubled high
// on bells. (A key change after it is the lift's to make.)

import type { Program } from '../../lib/general-midi';
import { ADVENTUROUS, BRIDGE, GROOVES, MELODIES, tonalityOf } from '../../style';
import type { Sounds } from '../song';
import type { Melody } from '../writers';
import type { NoteSpec } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, swappedKeys, type Plan, type PlayedMaterial } from './section';

export interface BridgeMaterial extends PlayedMaterial {
  melody: Melody;
  /** Sounds for its keys of its own, in order of preference, if it has them (swappedKeys). */
  keys?: readonly Program[];
}

export class Bridge extends PlayedSection<BridgeMaterial> {
  static readonly id = 'bridge';
  static readonly short = 'b';
  static override readonly handsOver = true;

  readonly material: BridgeMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const key = ctx.harmonizer(rng.fork('key')).bridgeKey(ADVENTUROUS);
      const home = ctx.harmonizer(rng.fork('cadence'));
      const cadence = rng.fork('exit').chance(BRIDGE.susExit) ? home.into(BRIDGE.sus) : home.approach();
      const length = this.bars - cadence.length;
      const templates = tonalityOf(key.mode).bridgeTemplates(length);
      const body = ctx.progress(rng.pick(templates), length, rng.fork('harmony'), { key });
      const bars = [...body, ...cadence];
      const keys = ctx.swap(rng.fork('swap'));
      return {
        ...ctx.band(key, bars, GROOVES.bridge, rng.fork('groove')),
        melody: ctx.melody(MELODIES.bridge, key, bars, rng.fork('melody')),
        ...(keys === undefined ? {} : { keys }),
      };
    });
  }

  override sounds(song: Sounds): Partial<Sounds> | undefined {
    const own = { ...super.sounds(song), ...swappedKeys(this.material.keys, song) };
    return Object.keys(own).length ? own : undefined;
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return ctx.line(this.material.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, underB } = ctx;
    const line = ctx.line(this.material.melody);
    return [ctx.drums(), underB, band.arp(C), band.strings(C), band.lead(line), band.bellDouble(line)];
  }
}
