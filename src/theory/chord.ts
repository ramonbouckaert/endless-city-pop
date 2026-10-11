import type { Key } from './key';
import { PitchClass } from './pitch';
import { Scale, type Degree } from './scale';
import { CHORDS, DOM_TO_MINOR_SCALE, FAMILY_SCALES, SYMBOL_SCALES, TRITONE_SUB_SCALE, type ChordClass } from './tables';

/** The chords of one bar: one, or two splitting it. */
export type Bar = readonly Chord[];

export class Chord {
  /** E1: bass roots sit from here to Eb2, and no bass note goes below. */
  static readonly BASS_LOW = 28;

  readonly root: number;
  readonly cls: ChordClass;
  readonly tones: readonly number[];
  readonly scale?: string; // chord-scale, a name in MODES
  /** A slash chord's bass (a pitch class), if it isn't the root: E under C for C/E. */
  readonly bass?: number;

  constructor(
    root: number,
    readonly symbol: string,
    scale?: string,
    bass?: number,
  ) {
    const def = CHORDS[symbol];
    if (!def) throw new Error(`Unknown chord symbol: ${symbol}`);
    this.root = PitchClass.of(root);
    this.cls = def.cls;
    this.tones = def.tones;
    if (scale) this.scale = scale;
    if (bass !== undefined && PitchClass.of(bass) !== this.root) this.bass = PitchClass.of(bass);
  }

  /** Its chord-scale: the one fitted to it, or failing that its family's usual one. */
  get chordScale(): Scale {
    return Scale.named(this.scale ?? FAMILY_SCALES[this.cls]);
  }

  withScale(scale: string): Chord {
    return new Chord(this.root, this.symbol, scale, this.bass);
  }

  /** The same chord moved up `semis` semitones, its bass with it. */
  transpose(semis: number): Chord {
    return new Chord(
      this.root + semis,
      this.symbol,
      this.scale,
      this.bass === undefined ? undefined : this.bass + semis,
    );
  }

  /** The note the bass plays: its slash bass, else its root. */
  get bassPc(): number {
    return this.bass ?? this.root;
  }

  /** Each chord as a new chord with its scale set, given the one after it (wrapping round). */
  static fitScales(chords: Chord[], key: Key): Chord[] {
    return chords.map((c, i) => c.withScale(c.fitScale(key, chords[(i + 1) % chords.length])));
  }

  /** Chords from a flat list, regrouped bar by bar like `like` (extra chords are left over). */
  static inBars(chords: readonly Chord[], like: readonly (readonly unknown[])[]): Bar[] {
    const starts = like.map((_, b) => like.slice(0, b).reduce((n, bar) => n + bar.length, 0));
    return like.map((bar, b) => chords.slice(starts[b], starts[b] + bar.length));
  }

  /** The chord sounding at a sixteenth of a bar. */
  static at(bar: Bar, step: number): Chord {
    return bar[Math.min(bar.length - 1, Math.floor((step * bar.length) / 16))];
  }

  get pcs(): number[] {
    return this.tones.map((t) => PitchClass.of(this.root + t));
  }

  /** Its tones no other is a semitone from, which a note can hold without rubbing. */
  get clean(): number[] {
    const { pcs } = this;
    return pcs.filter((pc) => !pcs.some((o) => [1, 11].includes(PitchClass.of(o - pc))));
  }

  get minorish(): boolean {
    return this.cls === 'min' || this.cls === 'hdim';
  }

  get dominant(): boolean {
    return this.cls === 'dom';
  }

  /** The chord symbol spelled in a key: "Bbm7". */
  name(key: Key): string {
    const over = this.bass === undefined ? '' : `/${key.spell(this.bass)}`;
    return `${key.spell(this.root)}${this.symbol}${over}`;
  }

  /** A tritone substitute's resolution: down a half step. */
  fallsSemitoneTo(other: Chord): boolean {
    return PitchClass.of(this.root - other.root) === 1;
  }

  fallsFifthTo(other: Chord): boolean {
    return PitchClass.of(this.root - other.root) === 7;
  }

  /** A dominant into a minor chord, or the V of a minor key wherever it goes. */
  resolvesToMinor(key: Key, next: Chord): boolean {
    return (this.fallsFifthTo(next) && next.minorish) || (key.minor && PitchClass.of(this.root - key.tonic) === 7);
  }

  // Does a scale hold every chord tone? (A 13 has no place in phrygian dominant.)
  private fits(scale: string): boolean {
    const s = Scale.named(scale);
    return this.tones.every((t) => s.has(t));
  }

  /**
   * The chord-scale in a key: the symbol's own, else the key's mode when
   * the chord is diatonic, else lydian dominant for a dominant falling a
   * half step (a tritone sub), else the usual one for its family.
   */
  fitScale(key: Key, next: Chord): string {
    if (SYMBOL_SCALES[this.symbol]) return SYMBOL_SCALES[this.symbol];
    const mode = key.modeAt(this.root);
    if (mode !== undefined && this.pcs.every((pc) => key.has(pc))) return mode;
    if (this.dominant && this.resolvesToMinor(key, next) && this.fits(DOM_TO_MINOR_SCALE)) return DOM_TO_MINOR_SCALE;
    if (this.dominant && this.fallsSemitoneTo(next) && this.fits(TRITONE_SUB_SCALE)) return TRITONE_SUB_SCALE;
    return FAMILY_SCALES[this.cls];
  }

  /**
   * Move a note (semitones above the key's tonic) onto a chord tone: the
   * nearest, unless that repeats `prev` when the line is moving in `dir`.
   * `diatonic` keeps to tones in the key; `clean` to its clean tones, if any of
   * those are left.
   */
  snap(
    semis: number,
    key: Key,
    {
      prev,
      dir = 0,
      diatonic = false,
      clean = false,
    }: { prev?: number; dir?: number; diatonic?: boolean; clean?: boolean } = {},
  ): number {
    const allowed = (pcs: number[]) => (diatonic ? pcs.filter((pc) => key.has(pc)) : pcs);
    const cleanTones = clean ? allowed(this.clean) : [];
    const near = this.tonesNear(semis, key, cleanTones.length ? cleanTones : allowed(this.pcs));
    const best = near[0];
    if (prev === undefined || best !== prev || dir === 0) return best;
    return near.find((c) => c !== prev && Math.sign(c - prev) === dir && Math.abs(c - semis) <= 4) ?? best;
  }

  // Tones (pitch classes `pcs`) within an octave of `semis`, nearest first.
  private tonesNear(semis: number, key: Key, pcs: readonly number[]): number[] {
    const base = semis - PitchClass.of(semis);
    const out = pcs.flatMap((pc) => [-12, 0, 12].map((octave) => base + PitchClass.of(pc - key.tonic) + octave));
    if (!out.length) return [semis];
    return [...new Set(out)].sort((a, b) => Math.abs(a - semis) - Math.abs(b - semis) || a - b);
  }

  /** The root's MIDI note in a bass's low range, E1 to Eb2: what chord-scale degrees count up from. */
  get rootMidi(): number {
    return Chord.low(this.root);
  }

  /** The note the bass plays (a slash chord's bass, else its root), in its low range, E1 to Eb2. */
  get bassMidi(): number {
    return Chord.low(this.bassPc);
  }

  /** A slash chord's bass as a degree of its chord-scale, from its root (in their low range): the root's, for others. */
  get bassDegree(): Degree {
    return this.chordScale.degree(this.bassMidi - this.rootMidi);
  }

  // A pitch class's MIDI note in a bass's low range.
  private static low(pc: number): number {
    const m = 24 + pc;
    return m < Chord.BASS_LOW ? m + 12 : m;
  }
}
