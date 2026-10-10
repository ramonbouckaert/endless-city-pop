import { chord, s, saw, type Pattern } from '@strudel/core';
import type { MaterialOf } from '../../model';
import { Chord } from '../../theory';
import { FIGURES } from '../figures';
import { bassScale } from '../notation';
import type { Parts, SectionContext } from './context';

// The last chord, rung out in the finale's style.
export function finale(ctx: SectionContext<MaterialOf<'finale'>>): Parts {
  const { band, mat } = ctx;
  const { chord: fin, key } = mat;
  const name = fin.name(key);
  const keys = (c: Pattern) => band.chords('keys', c, 0.4).room(0.5);
  const root = band.bass('0', bassScale(fin, key));
  // The ride swelling under the held chord, after a kick and crash.
  const ride = band.drum(s('rd*16').gain(0.09).velocity(saw.slow(2).range(0.3, 1)));
  const ring = [band.drum(s('[bd,cr]').slow(2).gain(0.55)), ride];
  switch (mat.ending) {
    case 'hits': {
      // The band hits the chord with the drums, then one last stab rings
      // out over the strings.
      const hits = FIGURES.finaleHits;
      return {
        drums: [band.drum(s('[bd,sd,cr]').struct(hits).gain(0.5))],
        pitched: [
          keys(chord(name).struct(hits)).clip(0.4),
          band.stabs(chord(name), hits),
          root.struct(hits).clip(0.4),
          band.strings(chord(name)).mask('<0 1>'),
        ],
      };
    }
    case 'slide': {
      // The same chord a semitone up, slipping down onto the last one
      // on the and of two.
      const above = new Chord(fin.root + 1, fin.symbol, fin.scale);
      const both = (a: string, b: string) => `[${a}@3 ${b}@13]`;
      const chords = chord(both(above.name(key), name)).slow(2);
      const scales = both(bassScale(above, key), bassScale(fin, key));
      return {
        drums: [band.drum(s('[~@3 [bd,cr]@13]').slow(2).gain(0.55)), ride],
        pitched: [keys(chords), band.strings(chords), band.bass('[0@3 0@13]', scales).slow(2)],
      };
    }
    case 'run':
      // A run up the chord on the keys, landing on it held.
      return {
        drums: ring,
        pitched: [
          band
            .voiced(band.line(FIGURES.finaleRun, bassScale(fin, key, 2)).slow(2), band.sounds.keys)
            .gain(0.32)
            .room(0.5),
          keys(chord(`[~ ${name}@3]`)).slow(2),
          band.strings(chord(name)).slow(2),
          root.slow(2),
        ],
      };
    case 'cascade': {
      // The band holds the chord as the voices stack up it.
      const voices = band.finaleVoices();
      const enters = FIGURES.finaleDegrees.map((d, i) => {
        const [sound, gain] = voices[i % voices.length];
        return band
          .voiced(band.line(`[${'~ '.repeat(i + 1)}${d}@${7 - i}]`, bassScale(fin, key, 2)).slow(2), sound)
          .gain(gain * 0.75)
          .room(0.5);
      });
      return {
        drums: ring,
        pitched: [keys(chord(name)).slow(2), band.strings(chord(name)).slow(2), root.slow(2), ...enters],
      };
    }
  }
}
