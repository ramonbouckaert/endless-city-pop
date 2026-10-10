// Music theory as values: scales, keys, chords and roman numerals.
// Pitch classes are integers 0-11 (C = 0).

import {
  CHORDS,
  CHURCH_MODES,
  DEGREE_OF_OFFSET,
  DOM_TO_MINOR_SCALE,
  FAMILY_SCALES,
  FLAT_NAMES,
  FLAT_TONICS,
  LETTERS,
  LETTER_PCS,
  MODES,
  NUMERALS,
  RARE_SPELLINGS,
  SHARP_NAMES,
  SYMBOL_SCALES,
} from './constants';
import type { Bar, ChordClass, Mode } from './types';

// E1: bass roots sit from here to Eb2, and no bass note goes below.
export const BASS_LOW = 28;

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
export const pcName = (pc: number, flats = true): string => (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];

/** One mini-notation item per bar: a chord's token, or two sharing a bar in brackets. */
export const barTokens = (bars: Bar[], token: (c: Chord) => string): string[] =>
  bars.map((bar) => (bar.length === 1 ? token(bar[0]) : `[${bar.map(token).join(' ')}]`));

/** Items from a flat list, regrouped bar by bar like `like` (extra items are left over). */
export function reshape<T>(flat: readonly T[], like: readonly (readonly unknown[])[]): T[][] {
  const starts = like.map((_, b) => like.slice(0, b).reduce((n, bar) => n + bar.length, 0));
  return like.map((bar, b) => flat.slice(starts[b], starts[b] + bar.length));
}

/** A scale as semitone steps, counted in (possibly negative) degrees. */
export class Scale {
  constructor(readonly steps: readonly number[]) {}

  static named(name: string): Scale {
    const steps = MODES[name];
    if (!steps) throw new Error(`Unknown scale: ${name}`);
    return new Scale(steps);
  }

  /** Semitones above the tonic for a degree. */
  semis(degree: number): number {
    const n = this.steps.length;
    const octave = Math.floor(degree / n);
    return this.steps[degree - octave * n] + 12 * octave;
  }

  /**
   * The inverse, as a degree string Strudel's scale() understands: with
   * # or b suffixes between scale notes ("4#", "6b").
   */
  degree(semis: number, flats = false): string {
    let d = Math.floor(semis / 12) * this.steps.length;
    while (this.semis(d + 1) <= semis) d++;
    while (this.semis(d) > semis) d--;
    const below = semis - this.semis(d);
    if (below === 0) return String(d);
    const above = this.semis(d + 1) - semis;
    if (below < above || (below === above && !flats)) return `${d}${'#'.repeat(below)}`;
    return `${d + 1}${'b'.repeat(above)}`;
  }

  has(semis: number): boolean {
    return this.steps.includes(mod12(semis));
  }
}

export class Key {
  readonly tonic: number;

  constructor(
    tonic: number,
    readonly mode: Mode = 'major',
  ) {
    this.tonic = mod12(tonic);
  }

  get scale(): Scale {
    return Scale.named(this.mode);
  }

  // Spelled like its relative major: D dorian and A minor as C major.
  get usesFlats(): boolean {
    return FLAT_TONICS.has(this.majorTonic);
  }

  get tonicName(): string {
    return pcName(this.tonic, this.usesFlats);
  }

  get name(): string {
    return `${this.tonicName} ${this.mode}`;
  }

  transpose(semis: number): Key {
    return new Key(this.tonic + semis, this.mode);
  }

  /** Is its tonic chord minor (minor, dorian)? Then its V is a minor key's dominant. */
  get minor(): boolean {
    return this.scale.has(3);
  }

  /** Is a pitch class in the key? */
  has(pc: number): boolean {
    return this.scale.has(pc - this.tonic);
  }

  /** The mode a diatonic root takes in this key (D: dorian in C major), or undefined off the key. */
  modeAt(pc: number): string | undefined {
    return CHURCH_MODES[MODES.major.indexOf(mod12(pc - this.majorTonic))];
  }

  /**
   * Spell a pitch class by its degree in the key: chromatic notes are
   * flattened degrees except the raised fourth, so C major spells Eb,
   * Ab, Bb and F#.
   */
  spell(pc: number): string {
    const letter = (LETTERS.indexOf(this.tonicName[0]) + DEGREE_OF_OFFSET[mod12(pc - this.tonic)]) % 7;
    let acc = mod12(pc - LETTER_PCS[letter]);
    if (acc > 6) acc -= 12;
    const name = LETTERS[letter] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
    // Avoid double accidentals and the rarely-seen Cb, Fb, E#, B#.
    return Math.abs(acc) > 1 || RARE_SPELLINGS.includes(name) ? pcName(pc, true) : name;
  }

  /** Steps round the circle of fifths to another key. */
  fifthsTo(other: Key): number {
    const d = Math.abs(this.fifthsPosition - other.fifthsPosition);
    return Math.min(d, 12 - d);
  }

  // C = 0, G = 1, F = -1 ...; other modes at their relative major.
  private get fifthsPosition(): number {
    const pos = mod12(this.majorTonic * 7);
    return pos > 6 ? pos - 12 : pos;
  }

  /** The tonic of the major key with the same notes: C for A minor, D dorian or G mixolydian. */
  get majorTonic(): number {
    return mod12(this.tonic - MODES.major[CHURCH_MODES.indexOf(this.mode)]);
  }
}

export class Chord {
  readonly root: number;
  readonly cls: ChordClass;
  readonly tones: readonly number[];
  readonly scale?: string; // chord-scale, named as Strudel's scale() wants it

  constructor(
    root: number,
    readonly symbol: string,
    scale?: string,
  ) {
    const def = CHORDS[symbol];
    if (!def) throw new Error(`Unknown chord symbol: ${symbol}`);
    this.root = mod12(root);
    this.cls = def.cls;
    this.tones = def.tones;
    if (scale) this.scale = scale;
  }

  withScale(scale: string): Chord {
    return new Chord(this.root, this.symbol, scale);
  }

  /** Each chord as a new chord with its scale set, given the one after it (wrapping round). */
  static fitScales(chords: Chord[], key: Key): Chord[] {
    return chords.map((c, i) => c.withScale(c.fitScale(key, chords[(i + 1) % chords.length])));
  }

  get pcs(): number[] {
    return this.tones.map((t) => mod12(this.root + t));
  }

  get minorish(): boolean {
    return this.cls === 'min' || this.cls === 'hdim';
  }

  get dominant(): boolean {
    return this.cls === 'dom';
  }

  name(key: Key): string {
    return `${key.spell(this.root)}${this.symbol}`;
  }

  fallsFifthTo(other: Chord): boolean {
    return mod12(this.root - other.root) === 7;
  }

  /** A dominant into a minor chord, or the V of a minor key wherever it goes. */
  resolvesToMinor(key: Key, next: Chord): boolean {
    return (this.fallsFifthTo(next) && next.minorish) || (key.minor && mod12(this.root - key.tonic) === 7);
  }

  // Does a scale hold every chord tone? (A 13 has no place in phrygian dominant.)
  private fits(scale: string): boolean {
    const s = Scale.named(scale);
    return this.tones.every((t) => s.has(t));
  }

  /**
   * The chord-scale in a key: the symbol's own, else the key's mode when
   * the chord is diatonic, else the usual one for its family.
   */
  fitScale(key: Key, next: Chord): string {
    if (SYMBOL_SCALES[this.symbol]) return SYMBOL_SCALES[this.symbol];
    if (this.pcs.every((pc) => key.has(pc))) return key.modeAt(this.root)!;
    if (this.dominant && this.resolvesToMinor(key, next) && this.fits(DOM_TO_MINOR_SCALE)) return DOM_TO_MINOR_SCALE;
    return FAMILY_SCALES[this.cls];
  }

  /**
   * Move a note (semitones above the key's tonic) onto a chord tone: the
   * nearest, unless that repeats `prev` when the line is moving in `dir`.
   * `diatonic` keeps to tones in the key.
   */
  snap(
    semis: number,
    key: Key,
    { prev, dir = 0, diatonic = false }: { prev?: number; dir?: number; diatonic?: boolean } = {},
  ): number {
    const near = this.tonesNear(semis, key, diatonic);
    const best = near[0];
    if (prev === undefined || best !== prev || dir === 0) return best;
    return near.find((c) => c !== prev && Math.sign(c - prev) === dir && Math.abs(c - semis) <= 4) ?? best;
  }

  // Chord tones within an octave of `semis`, nearest first.
  private tonesNear(semis: number, key: Key, diatonic: boolean): number[] {
    const base = semis - mod12(semis);
    const out = this.pcs
      .filter((pc) => !diatonic || key.has(pc))
      .flatMap((pc) => [-12, 0, 12].map((octave) => base + mod12(pc - key.tonic) + octave));
    if (!out.length) return [semis];
    return [...new Set(out)].sort((a, b) => Math.abs(a - semis) - Math.abs(b - semis) || a - b);
  }

  /** The root's MIDI note in a bass's low range, E1 to Eb2. */
  get bassMidi(): number {
    const m = 24 + this.root;
    return m < BASS_LOW ? m + 12 : m;
  }

  /** The chord-scale from the bass root, e.g. "D2:dorian". */
  bassScale(key: Key, octaveUp = 0): string {
    return `${key.spell(this.root)}${Math.floor(this.bassMidi / 12) - 1 + octaveUp}:${this.scale}`;
  }
}

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
