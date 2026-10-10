// A section's groove: drums from its plan, and a bass line in a feel
// that sits with them.

import type { Rng } from '../lib/random';
import { BASS_WITH, type GroovePlan } from '../style';
import type { Bar, Key } from '../theory';
import { BassWriter, type BassLine } from './bass';
import { DrumWriter, type Drums } from './drums';

export interface Groove {
  drums: Drums;
  /** A bass line for some bars in a key, in a feel that suits the drums. */
  bass(bars: Bar[], key: Key, rng?: Rng): BassLine;
}

export function writeGroove({ drums: plan, bass: feels }: GroovePlan, rng: Rng): Groove {
  const r = rng.fork('drums');
  const feel = r.pick(plan.feels);
  const crash = r.chance(plan.crash);
  const fill = r.chance(plan.fill);
  const drums = new DrumWriter(feel, r).write(crash, fill);
  // A quiet drum feel limits the bass to feels that suit it.
  const fits = BASS_WITH[feel];
  const matching = fits ? feels.filter((f) => fits.includes(f)) : feels;
  const bassFeels = matching.length ? matching : (fits ?? feels);
  return {
    drums,
    bass: (bars, key, bassRng = rng.fork('bass')) => new BassWriter(bassFeels, key, bassRng).write(bars),
  };
}
