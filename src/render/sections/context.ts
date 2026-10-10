// What a section's recipe works with: its section and material, the
// band, and the patterns most recipes share. Sections the band plays
// through get a PlayedContext: their chords, scales and bass, drums,
// lines and the figures built on them.

import { s, saw, stack, type Pattern } from '@strudel/core';
import { lazy } from '../../lib/lazy';
import type { MaterialOf, Melody, PlayedMaterial, PlayedType, SectionOf, Solo, Song } from '../../model';
import type { DrumRole, SectionType } from '../../style';
import type { Key } from '../../theory';
import { Band, chords, perBar, scales } from '../band';
import { renderDrums } from '../drums';
import { DOUBLE_TOP, FIGURES, SLIDE_SECONDS } from '../figures';
import { bassDegrees, from, keyScale, lastBar, melodyDegrees, soloDegrees, soloSlides } from '../notation';

/** A section's drums, and its pitched parts (falsy ones left out). */
export type Parts = { drums: Pattern[]; pitched: (Pattern | null | false | undefined)[] };

export class SectionContext<T extends SectionType = SectionType> {
  constructor(
    readonly song: Song,
    readonly sec: SectionOf<T>,
    readonly mat: MaterialOf<T>,
    readonly band: Band,
    readonly repeat: number, // earlier sections of this part
  ) {}

  get len(): number {
    return this.sec.bars;
  }

  /** A mask that plays from bar `start`. */
  from(start: number): string {
    return from(this.len, start);
  }

  /** White noise rising through the section. */
  get riser(): Pattern {
    return s('white').gain(saw.slow(this.len).range(0, 0.07)).hpf(3000);
  }
}

export class PlayedContext<T extends PlayedType = PlayedType> extends SectionContext<T> {
  // The material, as every played section has it.
  private get played(): PlayedMaterial {
    return this.mat as PlayedMaterial;
  }

  // The section's chords and scales, and the band's bass line over them,
  // each built on first use (so the band notes the bass only if it plays).
  private readonly harmony = lazy(() => {
    const { bars, key } = this.played;
    return { C: chords(bars, key), S: scales(bars, key) };
  });
  private readonly bassLine = lazy(() => this.band.bass(perBar(bassDegrees(this.played.bass)), this.S));

  /** The section's chords. */
  get C(): Pattern {
    return this.harmony().C;
  }
  /** Each chord's chord-scale, from its bass root. */
  get S(): Pattern {
    return this.harmony().S;
  }
  /** The bass line. */
  get B(): Pattern {
    return this.bassLine();
  }

  /** The section's key's scale, from octave 4: melodies count up from its tonic. */
  get scale(): string {
    return keyScale(this.played.key);
  }

  /** A melody as degrees of its key. */
  degrees(melody: Melody, key: Key = this.played.key): Pattern {
    return perBar(melodyDegrees(melody, key));
  }

  /** A melody as a line in this section's key, optionally shifted up. */
  line(melody: Melody, up = 0): Pattern {
    return this.band.line(this.degrees(melody), this.scale, up);
  }

  // 12 to play a melody an octave up, or 0 if that would take it too high
  // (melody notes count up from the tonic in octave 4).
  octaveUp(melody: Melody): number {
    return 60 + this.played.key.tonic + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
  }

  /** The intro's line on bells, if it has one: an octave up, if it fits. */
  teaser(melody: Melody | undefined): Pattern | undefined {
    return melody && this.band.bell(this.line(melody, this.octaveUp(melody)));
  }

  /** The section's drums; `enter` may hold a part back, by role, with a mask. */
  drums(enter?: (role: DrumRole) => string | undefined): Pattern[] {
    return renderDrums(this.band, this.played.drums, this.len, this.repeat, enter);
  }

  /** Stop-time: the band and drums hit together, then drive the last bar. */
  stopTime(drums: Pattern[]): Parts & { pitched: Pattern[] } {
    const { band, len, C, B } = this;
    const hits = (last: string) => lastBar(len, last, FIGURES.stops);
    return {
      drums: [stack(...drums).mask(hits('x'))],
      pitched: [B.struct(hits('x*8')), band.keys(C, hits('[~ x]*4')).clip(0.3), band.stabs(C, hits('~'))],
    };
  }

  /** Strings swelling through the section, up to `top`. */
  swell(top: number): Pattern {
    return this.band.strings(this.C).gain(saw.slow(this.len).range(0.04, top));
  }

  /** An improvised line, slurs and all, against the section's chord-scales. */
  soloLine(solo: Solo): Pattern {
    return this.band
      .line(perBar(soloDegrees(solo)), this.S, 24)
      .penv(perBar(soloSlides(solo)))
      .pattack(SLIDE_SECONDS);
  }
}

/** The context a section type's recipe gets. */
export type ContextOf<T extends SectionType> = T extends PlayedType ? PlayedContext<T> : SectionContext<T>;
