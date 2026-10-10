// What a section's recipe works with: its material, the band, and the
// patterns most recipes share (chords, scales and bass; drums; masks).

import { s, saw, stack, type Pattern } from '@strudel/core';
import type { Material, Melody, Section, Solo, Song } from '../../model';
import type { DrumRole } from '../../style';
import type { Key } from '../../theory';
import { Band, chords, perBar, scales } from '../band';
import { renderDrums } from '../drums';
import { DOUBLE_TOP, FIGURES, SLIDE_SECONDS } from '../figures';
import { bassDegrees, from, keyScale, lastBar, melodyDegrees, soloDegrees, soloSlides } from '../notation';

/** A section's drums, and its pitched parts (falsy ones left out). */
export type Parts = { drums: Pattern[]; pitched: (Pattern | null | false | undefined)[] };

/** Chords, chord-scales and bass for some bars in a key. */
export interface Harmony {
  C: Pattern;
  S: Pattern;
  B: Pattern;
}

export class SectionContext<M extends Material = Material> {
  constructor(
    readonly song: Song,
    readonly sec: Section,
    readonly mat: M,
    readonly band: Band,
    readonly repeat: number, // earlier sections of this part
  ) {}

  get len(): number {
    return this.sec.bars;
  }

  // The band's chords, scales and bass, built on first use.
  private harmonyMemo?: Harmony;
  get harmony(): Harmony {
    if (this.harmonyMemo) return this.harmonyMemo;
    const { mat } = this;
    if (!('bass' in mat)) throw new Error(`A ${mat.type} has no band part`);
    return (this.harmonyMemo = this.harmonyOf(mat));
  }
  get C(): Pattern {
    return this.harmony.C;
  }
  get S(): Pattern {
    return this.harmony.S;
  }
  get B(): Pattern {
    return this.harmony.B;
  }

  harmonyOf({ bars, key, bass }: Extract<Material, { bass: unknown }>): Harmony {
    const S = scales(bars, key);
    return { C: chords(bars, key), S, B: this.band.bass(perBar(bassDegrees(bass)), S) };
  }

  /** The section's key's scale, from octave 4: melodies count up from its tonic. */
  get scale(): string {
    return keyScale(this.mat.key);
  }

  /** A melody as degrees of its key. */
  degrees(melody: Melody, key: Key = this.mat.key): Pattern {
    return perBar(melodyDegrees(melody, key));
  }

  /** A melody as a line in this section's key, optionally shifted up. */
  line(melody: Melody, up = 0): Pattern {
    return this.band.line(this.degrees(melody), this.scale, up);
  }

  // 12 to play a melody an octave up, or 0 if that would take it too high
  // (melody notes count up from the tonic in octave 4).
  octaveUp(melody: Melody): number {
    return 60 + this.mat.key.tonic + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
  }

  /** The intro's line on bells, if it has one: an octave up, if it fits. */
  teaser(melody: Melody | undefined): Pattern | undefined {
    return melody && this.band.bell(this.line(melody, this.octaveUp(melody)));
  }

  /** A mask that plays from bar `start`. */
  from(start: number): string {
    return from(this.len, start);
  }

  /** The section's drums; `enter` may hold a part back, by role, with a mask. */
  drums(enter?: (role: DrumRole) => string | undefined): Pattern[] {
    const { mat } = this;
    if (!('drums' in mat)) throw new Error(`A ${mat.type} has no drums`);
    return renderDrums(this.band, mat.drums, this.len, this.repeat, enter);
  }

  /** Stop-time: the band and drums hit together, then drive the last bar. */
  stopTime(drums: Pattern[], C: Pattern, B: Pattern): Parts & { pitched: Pattern[] } {
    const { band, len } = this;
    const hits = (last: string) => lastBar(len, last, FIGURES.stops);
    return {
      drums: [stack(...drums).mask(hits('x'))],
      pitched: [B.struct(hits('x*8')), band.keys(C, hits('[~ x]*4')).clip(0.3), band.stabs(C, hits('~'))],
    };
  }

  /** Strings swelling through the section, up to `top`. */
  swell(C: Pattern, top: number): Pattern {
    return this.band.strings(C).gain(saw.slow(this.len).range(0.04, top));
  }

  /** White noise rising through the section. */
  get riser(): Pattern {
    return s('white').gain(saw.slow(this.len).range(0, 0.07)).hpf(3000);
  }

  /** An improvised line, slurs and all, against the section's chord-scales. */
  soloLine(solo: Solo): Pattern {
    return this.band
      .line(perBar(soloDegrees(solo)), this.S, 24)
      .penv(perBar(soloSlides(solo)))
      .pattack(SLIDE_SECONDS);
  }
}
