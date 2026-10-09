// Chord progressions: roman-numeral templates realised in a key as
// extended jazz chords, reharmonised with the usual substitutions.

import { APPROACH, BRIDGE_KEYS, LIFT_TURNAROUNDS, PALETTE, PLANING_STARTS, REHARM, SOLO_CHANGES } from './constants';
import { Chord, Key, Roman } from './music';
import type { Rng } from './random';
import type { Bar } from './types';

/** A progression template, such as `I vi [ii7 V7] IV`: one token per bar, with brackets around two chords sharing a bar. */
export class Template {
  readonly bars: Roman[][];

  constructor(text: string) {
    this.bars = text
      .trim()
      .match(/\[[^\]]+]|\S+/g)!
      .map((bar) => bar.replace(/[[\]]/g, '').trim().split(/\s+/).map(Roman.parse));
  }

  get length(): number {
    return this.bars.length;
  }

  /** `n` bars of the template, repeating it as needed. */
  fit(n: number): Roman[][] {
    return Array.from({ length: n }, (_, i) => this.bars[i % this.bars.length]);
  }

  /** `n` bars that end where the template ends, on its cadence. */
  fitEnding(n: number): Roman[][] {
    const len = this.bars.length;
    return Array.from({ length: n }, (_, i) => this.bars[(((i - n) % len) + len) % len]);
  }
}

/** Writes harmony in a key, drawing on one random stream. */
export class Harmonizer {
  constructor(
    readonly key: Key,
    private readonly rng: Rng,
  ) {}

  /**
   * A template filled to `bars` bars (ending on its cadence if
   * `ending`), coloured and reharmonised by `reharm` (0..1).
   */
  progression(template: string, bars: number, reharm = 0, ending = false): Bar[] {
    const t = new Template(template);
    const realized = this.realize(ending ? t.fitEnding(bars) : t.fit(bars));
    return reharm ? this.reharmonize(realized, reharm) : realized;
  }

  /** Each numeral as a concrete extended chord. */
  realize(bars: Roman[][]): Bar[] {
    const flat = bars.flat();
    const chords = flat.map((rn, i) => {
      const next = flat[(i + 1) % flat.length];
      const root = rn.root(this.key);
      const down5 = (root - next.root(this.key) + 12) % 12 === 7;
      // In jazz harmony an unadorned V is still a dominant.
      const cls = rn.cls === 'maj' && rn.offset === 7 && down5 ? 'dom' : rn.cls;
      const palette =
        cls === 'dom' && down5 && (next.cls === 'min' || next.cls === 'hdim')
          ? 'domToMinor'
          : cls === 'maj' && rn.offset !== 0
            ? 'majLydian' // major chords away from the tonic take #11
            : cls;
      return new Chord(root, this.rng.weighted(PALETTE[palette]));
    });
    let i = 0;
    return this.scaled(bars.map((bar) => bar.map(() => chords[i++])));
  }

  /** Tritone subs, related ii chords and secondary dominants. */
  reharmonize(bars: Bar[], amount: number): Bar[] {
    const out = bars.map((bar) => [...bar]);
    out.forEach((bar, b) => {
      const target = out[(b + 1) % out.length][0];
      const last = bar[bar.length - 1];
      if (last.dominant && last.fallsFifthTo(target) && this.rng.chance(amount * REHARM.tritone)) {
        bar[bar.length - 1] = new Chord(last.root + 6, '13#11');
      } else if (bar.length === 1) {
        out[b] = this.substitute(bar[0], target, amount) ?? bar;
      }
    });
    return this.scaled(out);
  }

  // A whole-bar chord split in two, or nothing.
  private substitute(only: Chord, target: Chord, amount: number): Bar | undefined {
    const { rng } = this;
    // Related ii: a dominant becomes ii-V.
    if (only.dominant) {
      if (!rng.chance(amount * REHARM.relatedII)) return;
      const minorTarget = only.fallsFifthTo(target) && target.minorish;
      return [new Chord(only.root + 7, minorTarget ? 'm7b5' : rng.pick(REHARM.iiSymbols)), only];
    }
    // Secondary dominant: the bar's second half points at the next
    // chord, sometimes as its tritone sub.
    if (target.root === only.root || !rng.chance(amount * REHARM.secondary)) return;
    if (rng.chance(REHARM.secondaryTritone)) return [only, new Chord(target.root + 1, '13#11')];
    return [only, new Chord(target.root + 7, rng.pick(target.minorish ? REHARM.toMinor : REHARM.toMajor))];
  }

  /** Two bars leading into the key's tonic: ii-V. */
  approach(): Bar[] {
    const t = this.key.tonic;
    return this.scaled([[new Chord(t + 2, this.rng.pick(APPROACH.ii))], [new Chord(t + 7, this.rng.pick(APPROACH.V))]]);
  }

  /** A named turnaround (LIFT_TURNAROUNDS) into the key's tonic. */
  turnaround(name: string): Bar[] {
    const bars = LIFT_TURNAROUNDS[name].bars.map((bar) =>
      bar.map((chord) => {
        const [numeral, symbols] = chord.split(':');
        return new Chord(this.key.tonic + Roman.parse(numeral).offset, this.rng.pick(symbols.split('|')));
      }),
    );
    // Chord-scales as it resolves to the tonic.
    Chord.fitScales([...bars.flat(), new Chord(this.key.tonic, '^9')], this.key);
    return bars;
  }

  /** Solo changes: ii-V pairs moving through keys a fixed interval apart, then home. */
  soloCycle(bars: number): Bar[] {
    const step = this.rng.weighted(SOLO_CHANGES.steps);
    const start = this.key.tonic + this.rng.pick(SOLO_CHANGES.starts);
    const out: Bar[] = [];
    for (let p = 0; p < bars / 2 - 1; p++) {
      const t = start + p * step;
      out.push([new Chord(t + 2, this.rng.pick(SOLO_CHANGES.ii))], [new Chord(t + 7, this.rng.pick(SOLO_CHANGES.V))]);
    }
    out.push(...this.approach());
    const chords = out.flat();
    Chord.fitScales(chords, this.key);
    // Each pair is diatonic to its own key, not the home key.
    for (const c of chords) {
      if (c.symbol.startsWith('m') && c.cls === 'min') c.scale = 'dorian';
      if (c.symbol === '13' || c.symbol === '9') c.scale = 'mixolydian';
    }
    return out;
  }

  /** add9 chords planing down in whole steps from bIII or bVI, then a sus dominant. */
  planing(): Bar[] {
    const start = this.key.tonic + this.rng.pick(PLANING_STARTS);
    const add9 = (root: number) => new Chord(root, 'add9', 'major');
    return [
      [add9(start)],
      [add9(start - 2)],
      [add9(start - 4)],
      [add9(start - 6), new Chord(this.key.tonic + 7, '9sus', 'mixolydian')],
    ];
  }

  /**
   * A major key for a bridge. Closely related keys suit a cautious
   * bridge; distant ones add colour to an adventurous one.
   */
  bridgeKey(adventurous: number): Key {
    return this.rng.weighted(
      BRIDGE_KEYS.map(({ offset, weight, adventurous: bold }) => {
        const key = this.key.transpose(offset);
        const w = (bold ? weight * adventurous : weight) * (this.key.fifthsTo(key) <= 1 ? 1.5 - adventurous : 1);
        return [new Key(key.tonic), w] as const;
      }),
    );
  }

  // The bars, with chord-scales fitted in this key.
  private scaled(bars: Bar[]): Bar[] {
    Chord.fitScales(bars.flat(), this.key);
    return bars;
  }
}
