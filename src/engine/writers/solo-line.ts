// Solos: bebop-ish runs in chord-scale degrees, with grace notes flicked
// or slid into, played against a section's changes.

import type { Rng } from '../../lib/random';
import { SLIDE_SECONDS, SOLO } from '../../style';
import { Chord, Scale, type Bar } from '../../theory';
import { Line, type Note } from './line';
import { onChord, type Changes, type NoteSpec } from '../score';

export interface SoloNote extends Note {
  degree: number; // chord-scale degree
  grace?: Grace;
}
// A grace note into a note from above (1) or below (-1), the side the
// line comes from: a semitone
// away if chromatic, else the next degree. Flicked as a note of its own,
// or slurred: the note starts at its pitch and slides.
export interface Grace {
  from: 1 | -1;
  chromatic: boolean;
  semis: number; // the grace note's pitch, from the note's
  slur: boolean;
}

/** A line in chord-scale degrees. */
export class Solo extends Line<SoloNote> {
  /** The line over `bars` bars against some changes, two octaves up: grace notes flicked or slid into. */
  play(changes: Changes, bars: number): NoteSpec[] {
    return this.over(bars).flatMap(({ time, dur, note: n }): NoteSpec[] => {
      const chord = changes.at(time);
      const note = onChord(chord, n.degree) + 24;
      const { grace } = n;
      if (!grace) return [{ time, dur, note }];
      if (grace.slur) return [{ time, dur, note, slide: { semis: grace.semis, seconds: SLIDE_SECONDS } }];
      // A flick: a third of a sixteenth, then the note.
      const flick = dur / (3 * n.len);
      const from = grace.chromatic ? note + grace.from : onChord(chord, n.degree + grace.from) + 24;
      return [
        { time, dur: flick, note: from },
        { time: time + flick, dur: dur - flick, note },
      ];
    });
  }
}

/** Improvises a solo. Chord tones are the even degrees, and beats land on them. */
export class SoloWriter {
  constructor(private readonly rng: Rng) {}

  write(bars: Bar[]): Solo {
    const { rng } = this;
    const { lo } = SOLO;
    // Each bar carries on from where the last left the line: its degree and direction.
    const { lines } = bars.reduce<{ deg: number; dir: number; lines: SoloNote[][] }>(
      ({ deg, dir, lines }, bar, b) => {
        // Breathe at the end of every other bar.
        const picked = rng.pick(SOLO.rhythms);
        const rhythm = b % 2 ? picked.slice(0, 12) + '....' : picked;
        const line = [...rhythm].reduce(
          (at, ch, s) => {
            if (ch !== 'x') return at;
            const r = this.advance(rhythm, s, at.deg, at.dir);
            const graced = (s % 4 === 0 || rhythm[s - 1] !== 'x') && rng.chance(SOLO.grace.chance);
            const note = graced ? { ...r.note, grace: this.grace(Chord.at(bar, s), r.deg, at.deg, r.dir) } : r.note;
            return { deg: r.deg, dir: r.dir, notes: [...at.notes, note] };
          },
          { deg, dir, notes: [] as SoloNote[] },
        );
        return { deg: line.deg, dir: line.dir, lines: [...lines, line.notes] };
      },
      { deg: rng.int(lo + 2, lo + 6), dir: 1, lines: [] },
    );
    return new Solo(lines);
  }

  // A grace note into `target` in the direction of the phrase: from below
  // on the way up from `prev`, the note just played, from above on the way
  // down (on a repeated note, the way the line is heading, `dir`). Never
  // from `prev` itself.
  private grace(chord: Chord, target: number, prev: number, dir: number): Grace {
    const { rng } = this;
    const from = (target === prev ? -Math.sign(dir) : Math.sign(prev - target)) as 1 | -1;
    let chromatic = rng.chance(SOLO.grace.chromatic);
    if (!chromatic && target + from === prev) chromatic = true;
    const scale = chord.scale && Scale.named(chord.scale);
    const semis = chromatic || !scale ? from : scale.semis(target + from) - scale.semis(target);
    return { from, chromatic, semis, slur: rng.chance(SOLO.grace.slur) };
  }

  private advance(rhythm: string, s: number, deg: number, dir: number): { note: SoloNote; deg: number; dir: number } {
    const { rng } = this;
    const { lo, hi } = SOLO;
    if (rng.chance(SOLO.turn)) dir = -dir;
    deg += dir * (rhythm[s + 1] === 'x' ? 1 : rng.weighted(SOLO.leaps));
    if (deg > hi) [deg, dir] = [hi - 1, -1];
    if (deg < lo) [deg, dir] = [lo + 1, 1];
    if (s % 4 === 0 && deg % 2 !== 0) deg += dir;
    return { note: { start: s, len: rhythm[s + 1] === '.' ? 2 : 1, degree: deg }, deg, dir };
  }
}
