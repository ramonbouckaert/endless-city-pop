// Turns a song into its score: each section of the form by its type's
// recipe (in sections/), shifted into its key, swung, and placed at the
// bar it starts on.

import { Rng } from '../lib/random';
import type { Instruments, PartPath, Song } from '../model';
import type { SectionType } from '../style';
import { ScoreBand } from './band';
import { Part, type Score, type ScoreNote } from './score';
import { sectionParts } from './sections';

export class ScoreArranger {
  /** `instruments`: to play the song with in place of its own. */
  constructor(
    private readonly song: Song,
    private readonly instruments: Instruments = song.instruments,
  ) {}

  arrange(): Score {
    const { song } = this;
    const rng = new Rng(song.seed).fork('score');
    const uses = new Map<PartPath, Set<SectionType>>();
    const notes = song.form.sections.flatMap((sec, index) => {
      const band = new ScoreBand(this.instruments, rng.fork(`section/${index}`));
      const { drums, pitched } = sectionParts(song, sec, band, song.form.repeatOf(index));
      for (const path of band.uses) uses.set(path, (uses.get(path) ?? new Set()).add(sec.type));
      return Part.stack(...drums, Part.stack(...pitched).transpose(sec.shift))
        .map((n) => this.swung(n))
        .late(song.form.starts[index]).notes;
    });
    return { notes: notes.toSorted((a, b) => a.time - b.time), bars: song.bars, uses };
  }

  // Swing: a note starting in the second half of an eighth moves later
  // by half the swing of an eighth.
  private swung(n: ScoreNote): ScoreNote {
    const eighths = n.time * 8;
    if (eighths - Math.floor(eighths) < 0.5) return n;
    return { ...n, time: n.time + this.song.swing / 2 / 8 };
  }
}
