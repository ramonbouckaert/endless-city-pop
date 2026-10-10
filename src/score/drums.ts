// A section's drums as notes: the groove, maybe a crash on the first
// bar, and maybe a fill over the end of the last bar (a different one for
// each repeat). The fill replaces the kick and snare from where it
// starts, or everything for a stop. As render/drums.ts plays them.

import type { Drums } from '../model';
import type { DrumRole, DrumSound } from '../style';
import type { ScoreBand } from './band';
import { Part, type ScoreNote, type Span } from './score';

/** Drum hits, each at its gain. */
export function drumHits(sound: DrumSound, hits: readonly (Span & { gain: number })[]): Part {
  return new Part(
    hits.map(
      ({ time, dur, gain }): ScoreNote => ({
        time,
        dur,
        path: 'kit',
        sound,
        gain,
        velocity: 1,
        postgain: 1,
        clip: 1,
        controls: {},
      }),
    ),
  );
}

// Hits on a 16-step bar of gains, `bar` bars in.
const barHits = (gains: readonly number[], bar: number) =>
  gains.flatMap((gain, i) => (gain ? [{ time: bar + i / 16, dur: 1 / 16, gain }] : []));

/**
 * `len` bars of drums, for the `repeat`th time the part plays. `enter`
 * may hold a part back, by role: it keeps the notes it is true for.
 */
export function drumNotes(
  band: ScoreBand,
  d: Drums,
  len: number,
  repeat: number,
  enter?: (role: DrumRole) => ((time: number) => boolean) | undefined,
): Part {
  const fill = d.fill ? d.fills[repeat % d.fills.length] : null;
  // The fill takes over the last bar from its start.
  const beforeFill = (time: number) => !fill || time < len - 1 + fill.start / 16;
  const groove = d.parts.map(({ sound, role, bars }) => {
    const part = drumHits(sound, Array.from({ length: len }, (_, b) => barHits(bars[b % bars.length], b)).flat());
    const held = enter?.(role);
    const entered = held ? part.mask(held) : part;
    return fill && (fill.stop || role === 'kick' || role === 'snare' || role === 'ghost')
      ? entered.mask(beforeFill)
      : entered;
  });
  const fillHits = (fill?.hits ?? []).map((h) =>
    drumHits(h.sound, [{ time: len - 1 + h.step / 16, dur: 1 / 16, gain: h.gain }]),
  );
  const crash = d.crash ? drumHits('cr', [{ time: 0, dur: 1, gain: 0.2 }]) : null;
  return band.drum(Part.stack(...groove, ...fillHits, crash));
}
