// A short bar: a 2/4 break before a chorus (Stay With Me's, Sea Line's),
// the band hitting the next section's first chord and stopping for a
// snare pickup, or the drums alone round the toms; or a 1/4 pickup into
// the song (Sparkle's), on the snare or a horn run up into the downbeat.
// Times are still in 4/4 bars: a 2/4 bar is half of one, a 1/4 bar a
// quarter.

import { PERCUSSION, type Percussion } from '../../lib/general-midi';
import { SHORT_BARS, type ShortBarStyle } from '../../style';
import type { Chord } from '../../theory';
import { Changes, onChord, type ScoreBand } from '../score';
import type { BuildContext } from './build-context';
import type { Parts } from './score-context';
import { Section, type Plan } from './section';

// How it plays (`variant`), into `into`, the next section's first chord.
export interface ShortBarMaterial {
  variant: ShortBarStyle;
  into: Chord;
}

export class ShortBar extends Section<ShortBarMaterial> {
  static readonly id = 'break';
  static readonly short = 'x';

  readonly material: ShortBarMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { chord: into } = ctx.firstChordAfter(this);
      const styles = this.bars < 0.5 ? SHORT_BARS.pickup : SHORT_BARS.break;
      return { variant: rng.weightedKey(styles), into };
    });
  }

  /** Its beats, as a time signature's numerator: 2 for a 2/4 bar. */
  get beats(): number {
    return this.bars * 4;
  }

  // describe() gives its meter in place of its length.
  protected override get length(): string {
    return `${this.beats}/4`;
  }

  parts(band: ScoreBand): Parts {
    const { variant, into } = this.material;
    const len = this.bars;
    // Sixteenths from `from` to the bar's end, getting louder.
    const roll = (from: number, drums: readonly Percussion[] = [PERCUSSION.snare]) =>
      Array.from({ length: Math.round(len * 16 - from) }, (_, i) =>
        band.kit(drums[Math.floor((i * drums.length) / (len * 16 - from))], [
          { time: (from + i) / 16, dur: 1 / 16, gain: 0.2 + (0.25 * i) / (len * 16) },
        ]),
      );
    switch (variant) {
      case 'hit': {
        // The band hits the chord on the downbeat, then a snare pickup through the last beat.
        const hit = [{ time: 0, dur: 1 / 8 }];
        const chord = new Changes([{ time: 0, dur: len, chord: into }], len);
        return [
          band.kit([PERCUSSION.kick, PERCUSSION.crash], [{ ...hit[0], gain: 0.5 }]),
          band.keys(chord, hit),
          band.stabs(chord, hit),
          band.bass([{ ...hit[0], note: into.bassMidi }]),
          ...roll(len * 16 - 4),
        ];
      }
      case 'toms':
        // Round the toms, high to low.
        return [
          band.kit(PERCUSSION.kick, [{ time: 0, dur: 1 / 16, gain: 0.5 }]),
          ...roll(0, [PERCUSSION.highTom, PERCUSSION.midTom, PERCUSSION.lowTom]),
        ];
      case 'snare':
        return roll(0);
      case 'run':
        // The horns up the scale into the next chord, from a fourth below its root.
        return [
          band.horns(
            [-4, -3, -2, -1].map((step, i) => ({ time: i / 16, dur: 1 / 16, note: onChord(into, step) + 36 })),
          ),
          ...roll(0),
        ];
    }
  }
}
