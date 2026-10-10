// A section's groove: drums from its plan, and a bass line in a feel
// that sits with them.

import type { Odds, Rng } from '../lib/random';
import { BASS_WITH, type BassFeel, type DrumFeel, type GroovePlan } from '../style';
import type { Bar, Key } from '../theory';
import { BassWriter, type BassLine } from './bass';
import { DrumWriter, type Drums } from './drums';

/** Writes a section's drums from its plan, and a bass line in `key` that suits them. */
export class GrooveWriter {
  constructor(
    private readonly plan: GroovePlan,
    private readonly key: Key,
    private readonly rng: Rng,
  ) {}

  write(bars: Bar[]): { drums: Drums; bass: BassLine } {
    const { plan, key, rng } = this;
    const drums = new DrumWriter(plan.drums, rng.fork('drums')).write();
    const bass = new BassWriter(bassFeels(plan.bass, drums.feel), key, rng.fork('bass')).write(bars);
    return { drums, bass };
  }
}

// A quiet drum feel limits the bass to feels that suit it (any of them,
// if none of the plan's does).
function bassFeels(feels: Odds<BassFeel>, drums: DrumFeel): Odds<BassFeel> {
  const fits = BASS_WITH[drums];
  if (!fits) return feels;
  const matching = Object.entries(feels).filter(([f]) => fits.includes(f as BassFeel));
  return Object.fromEntries(matching.length ? matching : fits.map((f) => [f, 1]));
}
