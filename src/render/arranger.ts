// Turns a song into one Strudel pattern: each section of the form as a
// stack of drums and instruments (its type's recipe, in sections/),
// arranged end to end.

import './strudel-setup';
import { arrange, silence, stack, type Pattern } from '@strudel/core';
import type { Instruments, PartPath, Song } from '../model';
import type { SectionType } from '../style';
import { Band } from './band';
import { TAIL_SECONDS } from './figures';
import { sectionParts } from './sections';

export interface Arrangement {
  pattern: Pattern;
  cps: number; // cycles per second: a cycle is a bar
  cycles: number; // how long it lasts before it loops: the song's bars and TAIL_SECONDS of silence
  /** The section types each part of the band plays in, by its path in Sounds ("keys", "soloists.1", "kit"). */
  uses: ReadonlyMap<PartPath, ReadonlySet<SectionType>>;
}

// A section as played: its bars, its pattern, and the parts its band used.
interface Played {
  type: SectionType;
  bars: number;
  pattern: Pattern;
  uses: ReadonlySet<PartPath>;
}

export class Arranger {
  /** `instruments`: to play the song with in place of its own. */
  constructor(
    private readonly song: Song,
    private readonly instruments: Instruments = song.instruments,
  ) {}

  arrange(): Arrangement {
    const { song } = this;
    const cps = song.bpm / 4 / 60;
    const played = song.form.map((sec, index): Played => {
      const repeat = song.form.slice(0, index).filter((x) => x.part === sec.part).length;
      const band = new Band(this.instruments);
      const { drums, pitched } = sectionParts(song, sec, band, repeat);
      const tonal = pitched.filter((p): p is Pattern => !!p);
      const tonalPart = sec.shift ? [stack(...tonal).transpose(sec.shift)] : tonal;
      const pattern = stack(...drums, ...tonalPart).swingBy(song.swing, 8);
      return { type: sec.type, bars: sec.bars, pattern, uses: band.uses };
    });
    // The tail is a fraction of a bar. Coming last, it shifts no bar line
    // but the loop's own: the next time round starts a second later.
    const tail = TAIL_SECONDS * cps;
    return {
      pattern: arrange(...played.map((p): [number, Pattern] => [p.bars, p.pattern]), [tail, silence]),
      cps,
      cycles: song.bars + tail,
      uses: partUses(played),
    };
  }
}

// The section types each part plays in: parts in the order a section
// first used them, types in form order.
function partUses(played: readonly Played[]): Map<PartPath, ReadonlySet<SectionType>> {
  const paths = [...new Set(played.flatMap((p) => [...p.uses]))];
  return new Map(paths.map((path) => [path, new Set(played.filter((p) => p.uses.has(path)).map((p) => p.type))]));
}
