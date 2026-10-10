import { mod12 } from './pitch';
import { MODES } from './tables';

/** A scale degree, raised (alter > 0) or lowered (alter < 0) by semitones: 4# is { step: 4, alter: 1 }. */
export interface Degree {
  step: number;
  alter: number;
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
   * The inverse: the degree at or nearest below `semis`, raised, or the
   * one above, lowered (ties: raised, unless `flats`).
   */
  degree(semis: number, flats = false): Degree {
    let d = Math.floor(semis / 12) * this.steps.length;
    while (this.semis(d + 1) <= semis) d++;
    while (this.semis(d) > semis) d--;
    const below = semis - this.semis(d);
    if (below === 0) return { step: d, alter: 0 };
    const above = this.semis(d + 1) - semis;
    if (below < above || (below === above && !flats)) return { step: d, alter: below };
    return { step: d + 1, alter: -above };
  }

  has(semis: number): boolean {
    return this.steps.includes(mod12(semis));
  }
}
