import type { Key } from './key';
import { mod12 } from './pitch';
import { Scale } from './scale';
import { CHORDS, DOM_TO_MINOR_SCALE, FAMILY_SCALES, SYMBOL_SCALES, type ChordClass } from './tables';

// E1: bass roots sit from here to Eb2, and no bass note goes below.
export const BASS_LOW = 28;

export class Chord {
  readonly root: number;
  readonly cls: ChordClass;
  readonly tones: readonly number[];
  readonly scale?: string; // chord-scale, a name in MODES

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

  /** Its chord-scale: the one fitted to it, or failing that its family's usual one. */
  get chordScale(): Scale {
    return Scale.named(this.scale ?? FAMILY_SCALES[this.cls]);
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

  /** The chord symbol spelled in a key: "Bbm7". */
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
    const mode = key.modeAt(this.root);
    if (mode !== undefined && this.pcs.every((pc) => key.has(pc))) return mode;
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
}

/** The chords of one bar: one, or two splitting it. */
export type Bar = readonly Chord[];

/** The chord sounding at a slot of a bar divided into `grid` slots. */
export const chordAt = (bar: Bar, slot: number, grid: number): Chord =>
  bar[Math.min(bar.length - 1, Math.floor((slot * bar.length) / grid))];
