// Solo changes, in eights that each end with the cadence home: the
// mode's pairs moving through keys, a stretch on the home tonic first, or
// one of its vamps (Tonality.solo). Reharmonised like any section; each
// chord's scale is the one it has in the key of its bar (a pair's own
// key, or home).

import type { Rng } from '../lib/random';
import { SOLO_CHANGES, TONIC_CHORDS } from '../style';
import { Template, type Bar, type Key } from '../theory';
import { Harmonizer } from './harmony';

// Bars, each with the key its chord-scales come from.
interface Keyed {
  bars: Bar[];
  key: Key;
}

export class SoloChangesWriter {
  private readonly harmony: Harmonizer;

  constructor(
    private readonly key: Key,
    private readonly rng: Rng,
  ) {
    this.harmony = new Harmonizer(key, rng.fork('harmony'));
  }

  /** Changes `bars` long. */
  write(bars: number): Bar[] {
    const keyed = Array.from({ length: Math.ceil(bars / 8) }, () => this.eight()).flat();
    const out = keyed.flatMap((k) => k.bars);
    const keys = keyed.flatMap((k) => k.bars.map(() => k.key));
    const changes = this.harmony.reharmonize(out);
    return changes.map((bar, b) =>
      bar.map((chord, i) =>
        chord.withScale(chord.fitScale(keys[b], bar[i + 1] ?? changes[(b + 1) % changes.length][0])),
      ),
    );
  }

  // Eight bars: a shape's lead-in, then the cadence home.
  private eight(): Keyed[] {
    const { harmony, rng, key: home } = this;
    const { solo, templates, tonic } = harmony.tonality;
    const shape = rng.weighted(solo.shapes);
    let lead: Keyed[];
    if (shape === 'cycle') lead = this.pairs(3);
    else if (shape === 'home')
      lead = [{ bars: harmony.realize(new Template(TONIC_CHORDS[tonic]).fit(2)), key: home }, ...this.pairs(2)];
    else lead = [{ bars: harmony.realize(new Template(rng.pick(templates.vamp)).fit(6)), key: home }];
    return [...lead, { bars: harmony.approach(), key: home }];
  }

  // `n` of the mode's pairs, each in a key a step on from the one before.
  private pairs(n: number): Keyed[] {
    const { harmony, rng, key: home } = this;
    const { solo } = harmony.tonality;
    const step = rng.weighted(solo.steps ?? SOLO_CHANGES.steps);
    const start = home.tonic + rng.pick(SOLO_CHANGES.starts);
    return Array.from({ length: n }, (_, p) => {
      const key = home.transpose(start - home.tonic + p * step);
      return { bars: harmony.into(solo.pair, key), key };
    });
  }
}
