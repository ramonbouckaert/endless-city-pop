// The key's final chord (or one left open), rung out in the finale's
// style over its two bars.

import { PERCUSSION } from '../../lib/general-midi';
import type { Odds, Rng } from '../../lib/random';
import {
  FERMATA,
  FIGURES,
  FINALE_CHORDS,
  FINALE_DEGREES,
  FINALE_HITS,
  FINALE_STYLES,
  RESOLVED_FINALES,
  type FinaleChord,
  type FinaleStyle,
} from '../../style';
import { Chord } from '../../theory';
import { Changes, onChord, rise, spans, timed, type NoteSpec, type ScoreBand, type Span } from '../score';
import type { BuildContext } from './build-context';
import type { Parts } from './score-context';
import { Section, type Plan, type TempoMark } from './section';

// The last chord (`ends` says which), rung out.
export interface FinaleMaterial {
  chord: Chord;
  ends: FinaleChord;
  variant: FinaleStyle;
}

export class Finale extends Section<FinaleMaterial> {
  static readonly id = 'finale';
  static readonly short = 'f';

  readonly material: FinaleMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const ends = rng.fork('ends').weightedKey(FINALE_CHORDS);
      const chord = this.chord(ends, ctx, rng.fork('chord'));
      const styles = ends === 'tonic' ? FINALE_STYLES : without(FINALE_STYLES, RESOLVED_FINALES);
      return { chord, ends, variant: rng.weightedKey(styles) };
    });
  }

  // The last chord: the key's own, or one left open.
  private chord(ends: FinaleChord, ctx: BuildContext, rng: Rng): Chord {
    const { key } = ctx;
    const tonic = () => {
      const [symbol, scale] = rng.pick(ctx.tonality.finale);
      return new Chord(key.tonic, symbol, scale);
    };
    const sus = () => (rng.chance(0.5) ? new Chord(key.tonic, 'sus2', key.mode) : new Chord(key.tonic, '9sus'));
    switch (ends) {
      case 'tonic':
        return tonic();
      case 'picardy':
        return key.minor ? new Chord(key.tonic, '^9', 'major') : tonic();
      case 'sus':
        return sus();
      case 'ii':
        return key.minor ? sus() : new Chord(key.tonic + 2, 'madd9', 'dorian');
      case 'V':
        return new Chord(key.tonic + 7, '9sus', 'mixolydian');
      case 'section': {
        // The first chord of the section before, if the band played one.
        const before = ctx.before(this)?.material;
        return before && 'bars' in before ? before.bars[0][0] : tonic();
      }
    }
  }

  protected override get details(): string[] {
    return this.material.ends === 'tonic' ? [] : [`on ${this.material.ends}`];
  }

  // A fermata's first bar held at the fermata's tempo, then back to the song's.
  override get tempo(): readonly TempoMark[] {
    return this.material.variant === 'fermata'
      ? [
          { at: 0, scale: FERMATA.ending },
          { at: 1, scale: 1 },
        ]
      : [];
  }

  parts(band: ScoreBand): Parts {
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
    // The ride swelling under the held chord, after a kick and crash.
    const ride = () =>
      band
        .kit(
          PERCUSSION.ride,
          Array.from({ length: 32 }, (_, i) => ({ time: i / 16, dur: 1 / 16, gain: 0.09 })),
        )
        .velocity(rise(0.3, 1, 2));
    const ring = () => [band.kit([PERCUSSION.kick, PERCUSSION.crash], [{ time: 0, dur: 2, gain: 0.55 }]), ride()];
    // Degrees up the chord, from its root two octaves up.
    const line = (degrees: readonly { time: number; dur: number; value: number }[]): NoteSpec[] =>
      degrees.map(({ time, dur, value }) => ({ time, dur, note: onChord(fin, value) + 24 }));
    switch (mat.variant) {
      case 'hits': {
        // The band hits the chord with the drums, then one last stab rings
        // out over the strings.
        const hits = spans(FINALE_HITS, 2);
        return [
          band.kit(
            [PERCUSSION.kick, PERCUSSION.snare, PERCUSSION.crash],
            hits.map((h) => ({ ...h, gain: 0.5 })),
          ),
          band.finaleKeys(eachBar).struct(hits).clip(0.4),
          band.stabs(eachBar, hits),
          root(1).struct(hits).clip(0.4),
          band.strings(eachBar).mask((t) => t >= 1),
        ];
      }
      case 'slide': {
        // The same chord a semitone up, slipping down onto the last one
        // on the and of two.
        const above = new Chord(fin.root + 1, fin.symbol, fin.scale);
        const both = changes({ time: 0, dur: 3 / 8, chord: above }, { time: 3 / 8, dur: 13 / 8 });
        const landing = { time: 3 / 8, dur: 13 / 8, gain: 0.55 };
        return [
          band.kit([PERCUSSION.kick, PERCUSSION.crash], [landing]),
          ride(),
          band.finaleKeys(both),
          band.strings(both),
          band.bass(both.spans.map(({ time, dur, chord }) => ({ time, dur, note: chord.bassMidi }))),
        ];
      }
      case 'run':
        // A run up the chord on the keys, landing on it held.
        return [
          ...ring(),
          band.keysRun(line(timed(FIGURES.finaleRun, 2))),
          band.finaleKeys(changes({ time: 0.5, dur: 1.5 })),
          band.strings(held),
          root(2),
        ];
      case 'fermata': {
        // A chord held long under a crash (in a minor key its bVImaj7,
        // else the V9sus), a run round the toms, then the band pushing
        // the bVII twice into the last chord.
        const minor = fin.cls === 'min';
        const held = minor ? new Chord(fin.root + 8, '^7') : new Chord(fin.root + 7, '9sus');
        const push = new Chord(fin.root + 10, 'add9');
        const hits = [
          { time: 1.5, dur: 1 / 8, chord: push },
          { time: 1.625, dur: 1 / 8, chord: push },
          { time: 1.75, dur: 1 / 4, chord: fin },
        ];
        const all = changes({ time: 0, dur: 1, chord: held }, { time: 1, dur: 0.5, chord: push }, ...hits);
        const toms = [PERCUSSION.highTom, PERCUSSION.highTom, PERCUSSION.midTom, PERCUSSION.midTom];
        return [
          band.kit([PERCUSSION.kick, PERCUSSION.crash], [{ time: 0, dur: 1, gain: 0.5 }]),
          ...[...toms, PERCUSSION.lowTom, PERCUSSION.lowTom, PERCUSSION.lowTom, PERCUSSION.lowTom].map((drum, i) =>
            band.kit(drum, [{ time: 1 + i / 16, dur: 1 / 16, gain: 0.25 + 0.03 * i }]),
          ),
          band.kit(
            [PERCUSSION.kick, PERCUSSION.snare],
            hits.map((h) => ({ ...h, gain: 0.5 })),
          ),
          band.kit(PERCUSSION.crash, [{ time: 1.75, dur: 1 / 4, gain: 0.5 }]),
          band.finaleKeys(all).mask((t) => t < 1 || t >= 1.5),
          band.strings(changes({ time: 0, dur: 1, chord: held })),
          band.stabs(all, hits),
          band.bass([
            { time: 0, dur: 1, note: held.bassMidi },
            ...hits.map(({ time, dur, chord }) => ({ time, dur, note: chord.bassMidi })),
          ]),
        ];
      }
      case 'cascade': {
        // The band holds the chord as the voices stack up it.
        const voices = band.finaleVoices();
        const enters = FINALE_DEGREES.map((d, i) => {
          const voice = voices[i % voices.length];
          const entry = { time: (i + 1) / 4, dur: (7 - i) / 4, value: d };
          return band.voice({ ...voice, gain: voice.gain * 0.75 }, line([entry])).room(0.5);
        });
        return [...ring(), band.finaleKeys(held), band.strings(held), root(2), ...enters];
      }
    }
  }
}

// Odds without some of their keys.
function without<K extends string>(odds: Odds<K>, keys: readonly K[]): Odds<K> {
  return Object.fromEntries(Object.entries(odds).filter(([k]) => !keys.includes(k as K))) as Odds<K>;
}
