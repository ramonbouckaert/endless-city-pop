// The intro's chords in one of its textures, with the hook as a teaser,
// or perhaps a riff of its own; the teaser (if any) on bells over the top.

import { PERCUSSION } from '../../lib/general-midi';
import type { Rng } from '../../lib/random';
import { INTRO, INTRO_TEXTURES } from '../../style';
import type { Melody } from '../melody';
import { Part } from '../score';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class Intro extends SectionBase<'intro'> {
  constructor(bars: number, placement?: Placement) {
    super('intro', bars, placement);
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'intro'> {
    const { harmony, bars } = ctx.introBars();
    const variant = rng.weightedKey(INTRO_TEXTURES);
    let melody: Melody | undefined;
    if (harmony === 'chorus') melody = ctx.hook().take(4);
    else if (harmony === 'template' && rng.chance(INTRO.melodyChance))
      melody = ctx.melody('riff', ctx.key, bars, rng.fork('melody'));
    return {
      ...ctx.band('intro', ctx.key, bars, INTRO_TEXTURES[variant].groove, rng.fork('groove')),
      harmony,
      variant,
      ...(melody ? { melody } : {}),
    };
  }

  play(ctx: PlayedScoreContext<'intro'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const drums = ctx.drums();
    const halfway = (p: Part) => p.mask(ctx.from(len / 2));
    switch (mat.variant) {
      case 'arp':
        // A keyboard arpeggio over a pad; bass and drums join halfway.
        return {
          drums: [halfway(Part.stack(...drums))],
          pitched: [band.arp(C), band.pad(C), halfway(B.gain(0.7)), ctx.teaser(mat.melody)],
        };
      case 'drumsFirst': {
        // The drums alone, then the band in halfway on a crash.
        const crash = band.kit(PERCUSSION.crash, [{ time: len / 2, dur: 1, gain: 0.2 }]);
        return {
          drums: [...drums, crash],
          pitched: [halfway(B), halfway(band.keys(C).gain(0.26)), halfway(band.clav(C)), ctx.teaser(mat.melody)],
        };
      }
      case 'fanfare': {
        // The band hits together, horns playing the teaser over it, then
        // grooves in the last bar.
        const stop = ctx.stopTime(drums);
        return { drums: stop.drums, pitched: [...stop.pitched, mat.melody && band.horns(ctx.line(mat.melody))] };
      }
      case 'keys':
        return {
          drums: [halfway(Part.stack(...drums))],
          pitched: [band.keys(C).room(0.35), halfway(B.gain(0.6)), ctx.teaser(mat.melody)],
        };
      case 'groove':
        return { drums, pitched: [B, band.keys(C).gain(0.26), band.clav(C), ctx.teaser(mat.melody)] };
      case 'bassFirst':
        return { drums, pitched: [B, halfway(band.softKeys(C)), halfway(band.pad(C)), ctx.teaser(mat.melody)] };
      case 'pads':
        return { drums, pitched: [band.softKeys(C), band.strings(C), B.gain(0.6), ctx.teaser(mat.melody)] };
    }
  }
}
