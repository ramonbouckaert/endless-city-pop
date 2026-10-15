// Turns a song into its score: each section of the form by its type's
// recipe (in sections/), shifted into its key, swung, and placed at the
// bar it starts on; and where the song fades out, if it does.

import { Rng } from '../../lib/random';
import { ScoreBand } from './band';
import type { Instruments, Song } from '../song';
import { Part, type Score, type ScoreNote } from './score';

export class ScoreArranger {
  /** `instruments`: to play the song with in place of its own. */
  constructor(
    private readonly song: Song,
    private readonly instruments: Instruments = song.instruments,
  ) {}

  arrange(): Score {
    const { song } = this;
    const rng = new Rng(song.seed).fork('score');
    const notes = song.form.sections.flatMap((sec, index) => {
      const sounds = sec.sounds(this.instruments.sounds);
      const instruments = sounds ? this.instruments.with(sounds) : this.instruments;
      const own = instruments.kitAt(index);
      const band = new ScoreBand(instruments, song.bpm, song.voicings, rng.fork(`section/${index}`), own);
      return Part.stack(...sec.parts(band, song.form.repeatOf(index)))
        .transpose(sec.shift)
        .map((n) => this.swung(n))
        .late(song.form.starts[index]).notes;
    });
    const { fadeFrom } = song.form;
    return {
      notes: notes.toSorted((a, b) => a.time - b.time),
      bars: song.bars,
      ...(fadeFrom === undefined ? {} : { fade: { from: fadeFrom, to: song.bars } }),
    };
  }

  // Swing: a note's start and end placed on swung time (warp), so a note
  // on an eighth's second sixteenth moves later by half the swing of an
  // eighth, and ornaments between the sixteenths (trills, glissandos,
  // flicks, triplets) move with the notes around them, never into each
  // other. An echo swings as the line it echoes does; and effects (notes
  // with no path, such as the riser) are timed to land on a beat, and
  // stay put, as do parts a song plays straight (Song.swingOnly).
  private swung(n: ScoreNote): ScoreNote {
    if (!n.path || !this.song.swings(n.path)) return n;
    const delay = n.delay ?? 0;
    const at = (time: number) => this.warp(time - delay) + delay;
    const time = at(n.time);
    return { ...n, time, dur: at(n.time + n.dur) - time };
  }

  // Where a time (in bars) falls, swung: in each eighth, the first
  // sixteenth stretched and the second squeezed, so a note on the second
  // lands `swing` of a sixteenth late and everything between moves with
  // it (in a ballad's eighths' swing, the same on the eighths of a beat).
  private warp(time: number): number {
    const { swing: s, swingUnit: unit } = this.song;
    const x = time * unit;
    const pair = Math.floor(x / 2) * 2;
    const p = x - pair;
    return (pair + (p < 1 ? p * (1 + s) : 1 + s + (p - 1) * (1 - s))) / unit;
  }
}
