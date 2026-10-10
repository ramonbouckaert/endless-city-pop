// The key's final chord, rung out in the finale's style over its two bars.

import { PERCUSSION, type Percussion } from '../../lib/general-midi';
import { FINALE_STYLES } from '../../style';
import { Chord } from '../../theory';
import { FIGURES, FINALE_DEGREES, FINALE_HITS, spans, timed } from '../figures';
import { Changes, onChord, Part, rise, type NoteSpec, type Span } from '../score';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Parts, ScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Finale extends Section<'finale'> {
  readonly material: MaterialOf<'finale'>;

  constructor(plan: SectionPlan<'finale'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { key } = ctx;
      const [symbol, scale] = rng.pick(ctx.tonality.finale);
      return {
        type: 'finale',
        key,
        chord: new Chord(key.tonic, symbol, scale),
        variant: rng.weightedKey(FINALE_STYLES),
      };
    });
  }

  play(ctx: ScoreContext<'finale'>): Parts {
    const { band } = ctx;
    const mat = this.material;
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
    // Drums together on some hits.
    const kit = (drums: readonly Percussion[], hits: readonly (Span & { gain: number })[]) =>
      Part.stack(...drums.map((drum) => band.kit(drum, hits)));
    // The ride swelling under the held chord, after a kick and crash.
    const ride = () =>
      band
        .kit(
          PERCUSSION.ride,
          Array.from({ length: 32 }, (_, i) => ({ time: i / 16, dur: 1 / 16, gain: 0.09 })),
        )
        .velocity(rise(0.3, 1, 2));
    const ring = () => [kit([PERCUSSION.kick, PERCUSSION.crash], [{ time: 0, dur: 2, gain: 0.55 }]), ride()];
    // Degrees up the chord, from its root two octaves up.
    const line = (degrees: readonly { time: number; dur: number; value: number }[]): NoteSpec[] =>
      degrees.map(({ time, dur, value }) => ({ time, dur, note: onChord(fin, value) + 24 }));
    switch (mat.variant) {
      case 'hits': {
        // The band hits the chord with the drums, then one last stab rings
        // out over the strings.
        const hits = spans(FINALE_HITS, 2);
        return {
          drums: [
            kit(
              [PERCUSSION.kick, PERCUSSION.snare, PERCUSSION.crash],
              hits.map((h) => ({ ...h, gain: 0.5 })),
            ),
          ],
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
          drums: [kit([PERCUSSION.kick, PERCUSSION.crash], [landing]), ride()],
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
}
