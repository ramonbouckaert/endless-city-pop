import { PitchClass } from './pitch';
import { LITERAL_SUFFIXES, MODES, NUMERALS, type ChordClass, type ChordSymbol, type NumeralName } from './tables';
import type { Chord } from './chord';
import type { Key } from './key';

/**
 * A slash chord's bass: an interval above its root (`I/3`, `i/b7`,
 * `i/7`: in major-scale steps, but a plain 3 is the chord's own third),
 * or a degree of the key (`IV/V`, `II/I`).
 */
export type SlashBass = { interval: number; ownThird?: true } | { offset: number };

/** A roman numeral: semitones above the tonic and a chord family, perhaps over a bass of its own. */
export class Roman {
  constructor(
    readonly offset: number,
    readonly cls: ChordClass,
    readonly text: string,
    readonly bass?: SlashBass,
    /** The chord symbol it names exactly (LITERAL_SUFFIXES), if it names one. */
    readonly symbol?: string,
  ) {}

  /** "I", "vi", "bVII", "V7", "ii7", "viiø", "#iv°", "IVmaj7", "Isus", "I5", "I+"; over a bass, "I/3", "IV/V". */
  static parse(text: string): Roman {
    const [head, over] = text.split('/');
    const m = /^([b#]?)(iii|ii|iv|i|vii|vi|v|III|II|IV|I|VII|VI|V)(.*)$/.exec(head);
    if (!m) throw new Error(`Not a roman numeral: ${text}`);
    const [, acc, numeral, suffix] = m;
    const upper = numeral === numeral.toUpperCase();
    const offset = Roman.numeral(acc, numeral);
    const bass = over === undefined ? undefined : Roman.slash(over, text);
    const symbol = LITERAL_SUFFIXES[upper ? 'upper' : 'lower'][suffix];
    return new Roman(PitchClass.of(offset), Roman.family(suffix, upper), text, bass, symbol);
  }

  // Semitones above the tonic of a numeral, sharpened or flattened.
  private static numeral(acc: string, numeral: string): number {
    let accOffset = 0;
    if (acc === 'b') accOffset = -1;
    else if (acc === '#') accOffset = 1;
    return NUMERALS[numeral.toLowerCase() as NumeralName] + accOffset;
  }

  // What follows a slash: a numeral, or an interval as a step number.
  private static slash(over: string, text: string): SlashBass {
    const numeral = /^([b#]?)(iii|ii|iv|i|vii|vi|v)$/i.exec(over);
    if (numeral) return { offset: PitchClass.of(Roman.numeral(numeral[1], numeral[2])) };
    const step = /^([b#]?)(\d+)$/.exec(over);
    if (!step) throw new Error(`Not a slash bass: ${text}`);
    const [, acc, digits] = step;
    const n = Number(digits) - 1;
    const semis = MODES.major[n % 7] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
    return { interval: PitchClass.of(semis), ...(acc === '' && n % 7 === 2 ? { ownThird: true as const } : {}) };
  }

  /**
   * The bass under a chord built on this numeral in a key, if it has a
   * slash bass: a plain 3 is the chord's own third (its family's, if it
   * has none).
   */
  bassOf(key: Key, chord: Chord): number | undefined {
    const { bass } = this;
    if (!bass) return undefined;
    if ('offset' in bass) return PitchClass.of(key.tonic + bass.offset);
    const third = () => chord.tones.map(PitchClass.of).find((t) => t === 3 || t === 4) ?? (chord.minorish ? 3 : 4);
    return PitchClass.of(chord.root + (bass.ownThird ? third() : bass.interval));
  }

  private static family(suffix: string, upper: boolean): ChordClass {
    if (/ø/.test(suffix)) return 'hdim';
    if (/[°o]/.test(suffix)) return 'dim';
    if (/sus/.test(suffix)) return 'sus';
    if (/\+|#5/.test(suffix)) return 'aug';
    if (suffix === '5') return 'power';
    if (/maj|\^/.test(suffix)) return 'maj';
    if (/7/.test(suffix) && upper) return 'dom';
    return upper ? 'maj' : 'min';
  }

  root(key: Key): number {
    return PitchClass.of(key.tonic + this.offset);
  }

  /** A chord spec's numeral, as semitones above the tonic, its symbols to pick from, and its slash bass if it has one. */
  static parseSpec(spec: ChordSpec): { offset: number; symbols: string[]; bass?: Roman } {
    const [chord, over] = spec.split('/');
    const [numeral, symbols] = chord.split(':');
    if (!symbols) throw new Error(`Not a chord spec: ${spec}`);
    const { offset } = Roman.parse(numeral);
    const bass = over === undefined ? undefined : Roman.parse(`${numeral}/${over}`);
    return { offset, symbols: symbols.split('|'), ...(bass ? { bass } : {}) };
  }
}

/** A progression template, such as `I vi [ii7 V7] IV`: one token per bar, with brackets around two chords sharing a bar. */
export class Template {
  readonly bars: Roman[][];

  constructor(text: string) {
    this.bars = (text.trim().match(/\[[^\]]+]|\S+/g) ?? []).map((bar) =>
      bar.replace(/[[\]]/g, '').trim().split(/\s+/).map(Roman.parse),
    );
  }

  get length(): number {
    return this.bars.length;
  }

  /** `n` bars of the template, repeating it as needed. */
  fit(n: number): Roman[][] {
    return Array.from({ length: n }, (_, i) => this.bars[i % this.bars.length]);
  }

  /**
   * `n` bars of the template two chords a bar where it can: two bars of
   * one chord each share a bar, a bar of two keeps its own (looping).
   */
  fitPaired(n: number): Roman[][] {
    const { bars } = this;
    const out: Roman[][] = [];
    for (let i = 0; out.length < n; ) {
      const [a, b] = [bars[i % bars.length], bars[(i + 1) % bars.length]];
      const pair = a.length === 1 && b.length === 1;
      out.push(pair ? [...a, ...b] : a);
      i += pair ? 2 : 1;
    }
    return out;
  }

  /** `n` bars that end where the template ends, on its cadence. */
  fitEnding(n: number): Roman[][] {
    const len = this.bars.length;
    return Array.from({ length: n }, (_, i) => this.bars[(((i - n) % len) + len) % len]);
  }
}

/** A numeral as a chord spec names it: "V", "bVII", "#iv". */
type Numeral = `${'' | 'b' | '#'}${NumeralName | Uppercase<NumeralName>}`;

/**
 * A chord as "numeral:symbol", with alternative symbols split by "|":
 * "V:7alt|13b9", perhaps over a slash bass: "V:9sus/IV". The type checks the numeral and the first symbol (every
 * combination of alternatives would be too many for TypeScript).
 */
export type ChordSpec =
  | `${Numeral}:${Exclude<ChordSymbol, ''>}`
  | `${Numeral}:${Exclude<ChordSymbol, ''>}|${string}`
  | `${Numeral}:${Exclude<ChordSymbol, ''>}/${string}`;
