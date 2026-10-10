import { mod12, pcName } from './pitch';
import { Scale } from './scale';
import {
  CHURCH_MODES,
  DEGREE_OF_OFFSET,
  FLAT_TONICS,
  LETTER_PCS,
  LETTERS,
  MODES,
  RARE_SPELLINGS,
  type Mode,
} from './tables';

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
