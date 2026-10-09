// Chord progressions: roman-numeral templates realised in a key as
// extended jazz chords, reharmonised with the usual substitutions. The
// key's mode decides its tonality (TONALITIES): its tonic chord, how it
// cadences, where its bridges go and how it lifts.

import { PALETTE, PLANING_STARTS, REHARM, SOLO_CHANGES, TONALITIES } from './constants';

// A bar on a mode's tonic chord, as a template.
const TONIC_CHORDS: Readonly<Record<string, string>> = { maj: 'Imaj7', min: 'i7', dom: 'I7' };
import { Chord, Key, Roman } from './music';
import type { Rng } from './random';
import type { Bar, ChordSpec, Tonality } from './types';

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

  get tonality(): Tonality {
    return TONALITIES[this.key.mode];
  }

  /**
   * A template filled to `bars` bars (ending on its cadence if
   * `ending`), coloured and reharmonised by `reharm` (0..1).
   */
  progression(template: string, bars: number, reharm = 0, ending = false): Bar[] {
    const t = new Template(template);
    const realized = this.realize(ending ? t.fitEnding(bars) : t.fit(bars));
    return reharm ? this.reharmonize(realized, reharm * this.tonality.reharm) : realized;
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
      const { tonic, tonicPalette } = this.tonality;
      // A minor key's V is altered wherever it goes, even into the next section.
      const minorV = this.key.minor && rn.offset === 7;
      const palette =
        rn.offset === 0 && cls === tonic && tonicPalette
          ? tonicPalette
          : cls === 'dom' && ((down5 && (next.cls === 'min' || next.cls === 'hdim')) || minorV)
            ? 'domToMinor'
            : cls === 'sus' && minorV
              ? 'susToMinor'
              : cls === 'maj' && this.key.modeAt(root) !== 'major'
                ? 'majLydian' // major chords take #11 unless they are the key's ionian chord
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
      if (
        last.dominant &&
        last.fallsFifthTo(target) &&
        !this.isTonic(last) &&
        this.rng.chance(amount * REHARM.tritone)
      ) {
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

  // The key's own tonic chord (a mixolydian I7, not a secondary dominant).
  private isTonic(chord: Chord): boolean {
    return chord.root === this.key.tonic && chord.cls === this.tonality.tonic;
  }

  /** Two bars leading into the key's tonic: ii-V in major, iiø-V7alt in minor, bVII-IV in dorian. */
  approach(): Bar[] {
    return this.into(this.tonality.approach);
  }

  /** A named turnaround (the tonality's turnarounds) into the key's tonic. */
  turnaround(name: string): Bar[] {
    const turnaround = this.tonality.turnarounds[name];
    if (!turnaround) throw new Error(`No ${name} turnaround in ${this.key.mode}`);
    return this.into(turnaround.bars);
  }

  // Bars of "numeral:symbol|symbol" chords in a key (this one unless
  // given), with chord-scales as they resolve to its tonic.
  private into(specs: readonly (readonly ChordSpec[])[], key = this.key): Bar[] {
    const bars = specs.map((bar) =>
      bar.map((chord) => {
        const [numeral, symbols] = chord.split(':');
        return new Chord(key.tonic + Roman.parse(numeral).offset, this.rng.pick(symbols.split('|')));
      }),
    );
    Chord.fitScales([...bars.flat(), new Chord(key.tonic, TONALITIES[key.mode].finale[0][0])], key);
    return bars;
  }

  /**
   * Solo changes, `bars` long, in eights that each end with the cadence
   * home: the mode's pairs moving through keys, a stretch on the home
   * tonic first, or one of its vamps (Tonality.solo). Reharmonised by
   * `reharm` (0..1) like any section; each chord's scale is the one it
   * has in the key of its bar (a pair's own key, or home).
   */
  solo(bars: number, reharm = 0): Bar[] {
    const { solo, templates, tonic } = this.tonality;
    const home = this.key;
    const out: Bar[] = [];
    const keys: Key[] = [];
    const add = (chords: Bar[], key: Key) => {
      out.push(...chords);
      keys.push(...chords.map(() => key));
    };
    const pairs = (n: number) => {
      const step = this.rng.weighted(solo.steps ?? SOLO_CHANGES.steps);
      const start = home.tonic + this.rng.pick(SOLO_CHANGES.starts);
      for (let p = 0; p < n; p++) {
        const key = home.transpose(start - home.tonic + p * step);
        add(this.into(solo.pair, key), key);
      }
    };
    for (let eight = 0; eight < bars / 8; eight++) {
      const shape = this.rng.weighted(solo.shapes);
      if (shape === 'cycle') pairs(3);
      else if (shape === 'home') {
        add(this.realize(new Template(TONIC_CHORDS[tonic]).fit(2)), home);
        pairs(2);
      } else add(this.realize(new Template(this.rng.pick(templates.vamp)).fit(6)), home);
      add(this.approach(), home);
    }
    const changes = reharm ? this.reharmonize(out, reharm * this.tonality.reharm) : out;
    changes.forEach((bar, b) =>
      bar.forEach((chord, i) => chord.fitScale(keys[b], bar[i + 1] ?? changes[(b + 1) % changes.length][0])),
    );
    return changes;
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
   * A key for a bridge (major, unless the tonality says otherwise).
   * Closely related keys suit a cautious bridge; distant ones add colour
   * to an adventurous one.
   */
  bridgeKey(adventurous: number): Key {
    return this.rng.weighted(
      this.tonality.bridgeKeys.map(({ offset, weight, adventurous: bold, mode = 'major' }) => {
        const key = new Key(this.key.tonic + offset, mode);
        const w = (bold ? weight * adventurous : weight) * (this.key.fifthsTo(key) <= 1 ? 1.5 - adventurous : 1);
        return [key, w] as const;
      }),
    );
  }

  // The bars, with chord-scales fitted in this key.
  private scaled(bars: Bar[]): Bar[] {
    Chord.fitScales(bars.flat(), this.key);
    return bars;
  }
}
