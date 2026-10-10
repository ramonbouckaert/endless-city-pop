import { mod12 } from './pitch';
import { NUMERALS, type ChordClass } from './tables';
import type { Key } from './key';

/** A roman numeral: semitones above the tonic and a chord family. */
export class Roman {
  constructor(
    readonly offset: number,
    readonly cls: ChordClass,
    readonly text: string,
  ) {}

  /** "I", "vi", "bVII", "V7", "ii7", "viiø", "#iv°", "IVmaj7", "Isus", "I5". */
  static parse(text: string): Roman {
    const m = /^([b#]?)(iii|ii|iv|i|vii|vi|v|III|II|IV|I|VII|VI|V)(.*)$/.exec(text);
    if (!m) throw new Error(`Not a roman numeral: ${text}`);
    const [, acc, numeral, suffix] = m;
    const upper = numeral === numeral.toUpperCase();
    let accOffset = 0;
    if (acc === 'b') accOffset = -1;
    else if (acc === '#') accOffset = 1;
    const offset = NUMERALS[numeral.toLowerCase()] + accOffset;
    return new Roman(mod12(offset), Roman.family(suffix, upper), text);
  }

  private static family(suffix: string, upper: boolean): ChordClass {
    if (/ø/.test(suffix)) return 'hdim';
    if (/[°o]/.test(suffix)) return 'dim';
    if (/sus/.test(suffix)) return 'sus';
    if (suffix === '5') return 'power';
    if (/maj|\^/.test(suffix)) return 'maj';
    if (/7/.test(suffix) && upper) return 'dom';
    return upper ? 'maj' : 'min';
  }

  root(key: Key): number {
    return mod12(key.tonic + this.offset);
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

  /** `n` bars that end where the template ends, on its cadence. */
  fitEnding(n: number): Roman[][] {
    const len = this.bars.length;
    return Array.from({ length: n }, (_, i) => this.bars[(((i - n) % len) + len) % len]);
  }
}

/** A chord as "numeral:symbol", with alternative symbols split by "|": "V:7alt|13b9". */
export type ChordSpec = string;

/** A chord spec's numeral, as semitones above the tonic, and its symbols to pick from. */
export function parseChordSpec(spec: ChordSpec): { offset: number; symbols: string[] } {
  const [numeral, symbols] = spec.split(':');
  if (!symbols) throw new Error(`Not a chord spec: ${spec}`);
  return { offset: Roman.parse(numeral).offset, symbols: symbols.split('|') };
}
