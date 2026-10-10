// A mode's tonality as the writers ask of it: its data (TonalityDef),
// and the lookups on it that can fail or need fitting.

import { Template, type Chord, type Key, type Mode } from '../../theory';
import type { PreFlavour } from '../variants';
import type { TemplateKind, TonalityDef, Turnaround } from './types';

// A tonality has its data's fields (merged in from this interface), and
// the lookups below on them.
export interface Tonality extends Readonly<TonalityDef> {}

export class Tonality {
  constructor(
    readonly mode: Mode,
    def: TonalityDef,
  ) {
    Object.assign(this, def);
  }

  /** A kind of section's templates; a bridge's only where the mode has them. */
  templatesFor(kind: TemplateKind | 'bridge'): readonly string[] {
    const templates = this.templates[kind];
    if (!templates?.length) throw new Error(`No ${kind} templates in ${this.mode}`);
    return templates;
  }

  /** A pre-chorus flavour's templates: those `bars` long, if there are any, else all of them. */
  preTemplates(flavour: PreFlavour, bars: number): readonly string[] {
    const options = this.pre[flavour];
    const fitting = options.filter((t) => new Template(t).length === bars);
    return fitting.length ? fitting : options;
  }

  /** A named turnaround into the key's tonic. */
  turnaround(name: string): Turnaround {
    const turnaround = this.turnarounds[name];
    if (!turnaround) throw new Error(`No ${name} turnaround in ${this.mode}`);
    return turnaround;
  }

  /** The symbol of the final chord, the one other chords resolve to. */
  get finaleSymbol(): string {
    return this.finale[0][0];
  }

  /** Is a chord the key's own tonic chord (a mixolydian I7, not a secondary dominant)? */
  isTonic(chord: Chord, key: Key): boolean {
    return chord.root === key.tonic && chord.cls === this.tonic;
  }
}
