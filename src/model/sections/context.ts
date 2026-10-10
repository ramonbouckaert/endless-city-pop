// What a section's writer works with: the song's key and form, the
// material of other parts (written on first use, so one part can draw on
// another), the harmony several parts share, and the steps most writers
// take.

import type { Rng } from '../../lib/random';
import {
  tonalityOf,
  type GroovePlan,
  type Tonality,
  type MelodyKind,
  type PreMelody,
  type SectionType,
} from '../../style';
import type { Bar, Key } from '../../theory';
import { GrooveWriter } from '../groove';
import { Harmonizer } from '../harmony';
import { materialOf, type Material, type MaterialOf, type PlayedType } from '../material';
import { MelodyWriter, type Melody } from '../melody';
import type { Form } from '../form';
import type { Section, SectionOf } from '../section';
import { SharedHarmony } from './shared';

/**
 * Writes a section type's material, drawing on the part's own stream.
 * Like every function here that takes an Rng, it owns the stream it is
 * given: a caller hands on a fork, and never draws from it again.
 */
export type Writer<T extends SectionType> = (sec: SectionOf<T>, ctx: WriteContext, rng: Rng) => MaterialOf<T>;
export type Writers = { [T in SectionType]: Writer<T> };

export class WriteContext {
  readonly shared: SharedHarmony;
  private readonly written = new Map<string, Material>();

  constructor(
    readonly key: Key,
    readonly form: Form,
    private readonly rng: Rng,
    private readonly writers: Writers,
  ) {
    this.shared = new SharedHarmony(this, rng.fork('shared'));
  }

  /** A section's material: its part's, written on first use. */
  material<S extends Section>(sec: S): MaterialOf<S['type']> {
    let mat = this.written.get(sec.part);
    if (!mat) {
      // WRITERS gives each type its own writer, which takes sections of that type.
      const write = this.writers[sec.type] as (sec: S, ctx: WriteContext, rng: Rng) => Material;
      mat = write(sec, this, this.rng.fork(`part/${sec.part}`));
      this.written.set(sec.part, mat);
    }
    return materialOf<S['type']>(sec.type, mat);
  }

  /** The song's key's tonality. */
  get tonality(): Tonality {
    return tonalityOf(this.key.mode);
  }

  /** A template's progression, `bars` long, in a key (the song's unless given). */
  progress(template: string, bars: number, rng: Rng, key = this.key): Bar[] {
    return new Harmonizer(key, rng).progression(template, bars);
  }

  /** Four bars of one of the key's vamp or riff templates. */
  loop(kind: 'vamp' | 'riff', rng: Rng): Bar[] {
    return this.progress(rng.pick(this.tonality.templatesFor(kind)), 4, rng.fork('harmony'));
  }

  melody(kind: MelodyKind, key: Key, bars: Bar[], rng: Rng, style?: PreMelody): Melody {
    return new MelodyWriter(key, kind, rng, style).write(bars);
  }

  /** A section's chords in a key, with drums and a bass line to play them. */
  band<T extends PlayedType>(type: T, key: Key, bars: Bar[], plan: GroovePlan, rng: Rng) {
    return { type, key, bars, ...new GrooveWriter(plan, key, rng).write(bars) };
  }
}
