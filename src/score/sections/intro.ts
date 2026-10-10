import { drumHits } from '../drums';
import { Part } from '../score';
import type { Parts, PlayedScoreContext } from './context';

// The intro, in its texture; its teaser (if any) on bells over the top.
export function intro(ctx: PlayedScoreContext<'intro'>): Parts {
  const { band, C, B, len, mat } = ctx;
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
      const crash = drumHits('cr', [{ time: len / 2, dur: 1, gain: 0.2 }]);
      return {
        drums: [...drums, band.drum(crash)],
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
