// What a section's writer works with: the song's key and form, the
// material of other parts (written on first use, so one part can draw on
// another), the harmony several parts share, and the steps most writers
// take.

import type { Rng } from '../../lib/random';
import { TONALITIES, type GroovePlan, type MelodyKind, type PreMelody, type SectionType } from '../../style';
import type { Bar, Key } from '../../theory';
import { writeGroove } from '../groove';
import { Harmonizer } from '../harmony';
import { materialOf, type Material, type MaterialOf, type PlayedType } from '../material';
import { MelodyWriter, type Melody } from '../melody';
import { isSection, type Section, type SectionOf } from '../section';
import { SharedHarmony } from './shared';

/** Writes a section type's material, drawing on the part's own stream. */
export type Writer<T extends SectionType> = (sec: SectionOf<T>, ctx: WriteContext, rng: Rng) => MaterialOf<T>;
export type Writers = { [T in SectionType]: Writer<T> };

export class WriteContext {
  readonly shared: SharedHarmony;
  private readonly written = new Map<string, Material>();

  constructor(
    readonly key: Key,
    readonly form: readonly Section[],
    private readonly rng: Rng,
    private readonly writers: Writers,
  ) {
    this.shared = new SharedHarmony(this, rng);
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

  // ---- The form ---------------------------------------------------------

  /** The first section of a type, if the form has one. */
  first<T extends SectionType>(type: T): SectionOf<T> | undefined {
    return this.form.find(isSection(type));
  }

  /** The section after `sec`. */
  next(sec: Section): Section | undefined {
    return this.form[this.form.indexOf(sec) + 1];
  }

  /** The section after `sec`, not counting a drum break. */
  after(sec: Section): Section | undefined {
    return this.form.slice(this.form.indexOf(sec) + 1).find((s) => s.type !== 'drumBreak');
  }

  /** The last section of `sec`'s type before it. */
  previous<S extends Section>(sec: S): S | undefined {
    return this.form.slice(0, this.form.indexOf(sec)).findLast((s): s is S => s.type === sec.type);
  }

  // ---- Writing ----------------------------------------------------------

  get templates() {
    return TONALITIES[this.key.mode].templates;
  }

  /** A template's progression, `bars` long, in a key (the song's unless given). */
  progress(template: string, bars: number, rng: Rng, key = this.key): Bar[] {
    return new Harmonizer(key, rng.fork('harmony')).progression(template, bars);
  }

  /** Four bars of one of the key's vamp or riff templates. */
  loop(kind: 'vamp' | 'riff', rng: Rng): Bar[] {
    return this.progress(rng.pick(this.templates[kind]), 4, rng);
  }

  melody(kind: MelodyKind, key: Key, bars: Bar[], rng: Rng, style?: PreMelody): Melody {
    return new MelodyWriter(key, kind, rng.fork('melody'), style).write(bars);
  }

  /** A section's chords in a key, with drums and a bass line to play them. */
  band<T extends PlayedType>(type: T, key: Key, bars: Bar[], plan: GroovePlan, rng: Rng) {
    return { type, key, bars, ...writeGroove(plan, bars, key, rng.fork('groove')) };
  }
}
