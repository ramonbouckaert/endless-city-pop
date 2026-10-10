import { PERCUSSION } from '../../lib/general-midi';
import { Chord } from '../../theory';
import { drumHits } from '../drums';
import { FIGURES, FINALE_DEGREES, FINALE_HITS, spans, timed } from '../figures';
import { Changes, Part, rise, type Span } from '../score';
import type { NoteSpec } from '../band';
import { onChord, type Parts, type ScoreContext } from './context';

// The last chord, rung out in the finale's style, over its two bars.
export function finale(ctx: ScoreContext<'finale'>): Parts {
  const { band, mat } = ctx;
  const { chord: fin } = mat;
  // The chord over spans of time.
  const changes = (...spans: (Span & { chord?: Chord })[]) =>
    new Changes(
      spans.map(({ time, dur, chord = fin }) => ({ time, dur, chord })),
      2,
    );
  const eachBar = changes({ time: 0, dur: 1 }, { time: 1, dur: 1 });
  const held = changes({ time: 0, dur: 2 });
  const root = (dur: number) =>
    band.bass(Array.from({ length: 2 / dur }, (_, i) => ({ time: i * dur, dur, note: fin.bassMidi })));
  // The ride swelling under the held chord, after a kick and crash.
  const ride = () =>
    band.drum(
      drumHits(
        PERCUSSION.ride,
        Array.from({ length: 32 }, (_, i) => ({ time: i / 16, dur: 1 / 16, gain: 0.09 })),
      ).velocity(rise(0.3, 1, 2)),
    );
  const ring = () => [
    band.drum(
      Part.stack(
        drumHits(PERCUSSION.kick, [{ time: 0, dur: 2, gain: 0.55 }]),
        drumHits(PERCUSSION.crash, [{ time: 0, dur: 2, gain: 0.55 }]),
      ),
    ),
    ride(),
  ];
  // Degrees up the chord, from its root two octaves up.
  const line = (degrees: readonly { time: number; dur: number; value: number }[]): NoteSpec[] =>
    degrees.map(({ time, dur, value }) => ({ time, dur, note: onChord(fin, value) + 24 }));
  switch (mat.variant) {
    case 'hits': {
      // The band hits the chord with the drums, then one last stab rings
      // out over the strings.
      const hits = spans(FINALE_HITS, 2);
      const kit = [PERCUSSION.kick, PERCUSSION.snare, PERCUSSION.crash].map((drum) =>
        drumHits(
          drum,
          hits.map((h) => ({ ...h, gain: 0.5 })),
        ),
      );
      return {
        drums: [band.drum(Part.stack(...kit))],
        pitched: [
          band.finaleKeys(eachBar).struct(hits).clip(0.4),
          band.stabs(eachBar, hits),
          root(1).struct(hits).clip(0.4),
          band.strings(eachBar).mask((t) => t >= 1),
        ],
      };
    }
    case 'slide': {
      // The same chord a semitone up, slipping down onto the last one
      // on the and of two.
      const above = new Chord(fin.root + 1, fin.symbol, fin.scale);
      const both = changes({ time: 0, dur: 3 / 8, chord: above }, { time: 3 / 8, dur: 13 / 8 });
      const landing = { time: 3 / 8, dur: 13 / 8, gain: 0.55 };
      return {
        drums: [
          band.drum(Part.stack(drumHits(PERCUSSION.kick, [landing]), drumHits(PERCUSSION.crash, [landing]))),
          ride(),
        ],
        pitched: [
          band.finaleKeys(both),
          band.strings(both),
          band.bass(both.spans.map(({ time, dur, chord }) => ({ time, dur, note: chord.bassMidi }))),
        ],
      };
    }
    case 'run':
      // A run up the chord on the keys, landing on it held.
      return {
        drums: ring(),
        pitched: [
          band.keysRun(line(timed(FIGURES.finaleRun, 2))),
          band.finaleKeys(changes({ time: 0.5, dur: 1.5 })),
          band.strings(held),
          root(2),
        ],
      };
    case 'cascade': {
      // The band holds the chord as the voices stack up it.
      const voices = band.finaleVoices();
      const enters = FINALE_DEGREES.map((d, i) => {
        const voice = voices[i % voices.length];
        const entry = { time: (i + 1) / 4, dur: (7 - i) / 4, value: d };
        return band.voice({ ...voice, gain: voice.gain * 0.75 }, line([entry])).room(0.5);
      });
      return {
        drums: ring(),
        pitched: [band.finaleKeys(held), band.strings(held), root(2), ...enters],
      };
    }
  }
}
