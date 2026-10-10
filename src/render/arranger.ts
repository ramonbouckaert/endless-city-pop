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

export class Arranger {
  private readonly band: Band;

  /** `instruments`: to play the song with in place of its own. */
  constructor(
    private readonly song: Song,
    instruments: Instruments = song.instruments,
  ) {
    this.band = new Band(instruments);
  }

  arrange(): Arrangement {
    const { song } = this;
    const cps = song.bpm / 4 / 60;
    const sections = song.form.map((sec, index): [number, Pattern] => {
      const repeat = song.form.slice(0, index).filter((x) => x.part === sec.part).length;
      this.band.playing(sec.type);
      const { drums, pitched } = sectionParts(song, sec, this.band, repeat);
      const tonal = pitched.filter((p): p is Pattern => !!p);
      const tonalPart = sec.shift ? [stack(...tonal).transpose(sec.shift)] : tonal;
      return [sec.bars, stack(...drums, ...tonalPart).swingBy(song.swing, 8)];
    });
    // The tail is a fraction of a bar. Coming last, it shifts no bar line
    // but the loop's own: the next time round starts a second later.
    const tail = TAIL_SECONDS * cps;
    return {
      pattern: arrange(...sections, [tail, silence]),
      cps,
      cycles: song.bars + tail,
      uses: this.band.uses,
    };
  }
}
