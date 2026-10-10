// A section's groove: drums from its plan, and a bass line in a feel
// that sits with them.

import type { Rng } from '../lib/random';
import { BASS_WITH, type BassFeel, type DrumFeel, type DrumPlan, type GroovePlan } from '../style';
import type { Bar, Key } from '../theory';
import { BassWriter, type BassLine } from './bass';
import { DrumWriter, type Drums } from './drums';

/** Drums from a plan: one of its feels, perhaps with a crash and fills. */
export function writeDrums(plan: DrumPlan, rng: Rng): Drums {
  const feel = rng.pick(plan.feels);
  const crash = rng.chance(plan.crash);
  const fill = rng.chance(plan.fill);
  return new DrumWriter(feel, rng.fork('writer')).write(crash, fill);
}

/** Drums from a plan, and a bass line for `bars` in `key` that suits them. */
export function writeGroove(plan: GroovePlan, bars: Bar[], key: Key, rng: Rng): { drums: Drums; bass: BassLine } {
  const drums = writeDrums(plan.drums, rng.fork('drums'));
  const bass = new BassWriter(bassFeels(plan.bass, drums.feel), key, rng.fork('bass')).write(bars);
  return { drums, bass };
}

// A quiet drum feel limits the bass to feels that suit it.
function bassFeels(feels: readonly BassFeel[], drums: DrumFeel): readonly BassFeel[] {
  const fits = BASS_WITH[drums];
  if (!fits) return feels;
  const matching = feels.filter((f) => fits.includes(f));
  return matching.length ? matching : fits;
}
