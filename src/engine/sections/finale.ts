// The key's final chord (or one left open, or after the riff the bare
// tonic), rung out in the finale's style over its two bars, perhaps
// slower: a style that suits the chord. After some outros, the chord is
// one that suits them.

import { PERCUSSION } from '../../lib/general-midi';
import { only, type Odds, type Rng } from '../../lib/random';
import {
  FERMATA,
  FIGURES,
  FINALE_AFTER,
  FINALE_CHORDS,
  FINALE_DEGREES,
  FINALE_EASE,
  FINALE_HITS,
  FINALE_STYLES,
  FINALE_SUITS,
  type FinaleChord,
  type FinaleStyle,
} from '../../style';
import { Chord } from '../../theory';
import { Changes, onChord, rise, spans, timed, type NoteSpec, type ScoreBand, type Span } from '../score';
import type { BuildContext } from './build-context';
import { Outro } from './outro';
import { Riff } from './riff';
import type { Parts } from './score-context';
import { Section, type Plan, type TempoMark } from './section';

// The last chord (`ends` says which), rung out; `eases`, slower.
export interface FinaleMaterial {
  chord: Chord;
  ends: FinaleChord;
  variant: FinaleStyle;
  eases?: boolean;
}

export class Finale extends Section<FinaleMaterial> {
  static readonly id = 'finale';
  static readonly short = 'f';

  readonly material: FinaleMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const ends = this.ends(ctx, rng.fork('ends'));
      // (The bare tonic is always hit.)
      const variant = ends === 'unison' ? 'hits' : rng.weightedKey(suiting(ends));
      const chord = this.chord(ends, variant, ctx, rng.fork('chord'));
      const eases = variant !== 'fermata' && rng.fork('eases').chance(FINALE_EASE.chance);
      return { chord, ends, variant, ...(eases ? { eases } : {}) };
    });
  }

  // Which last chord: the bare tonic after the riff, one that suits the
  // outro before (FINALE_AFTER), or any.
  private ends(ctx: BuildContext, rng: Rng): FinaleChord {
    const before = ctx.before(this);
    if (before instanceof Riff) return 'unison';
    const after = before instanceof Outro ? FINALE_AFTER[before.variant] : undefined;
    return rng.weightedKey(after ?? FINALE_CHORDS);
  }

  // The last chord: the key's own, or one left open (a neapolitan's, the 9sus).
  private chord(ends: FinaleChord, variant: FinaleStyle, ctx: BuildContext, rng: Rng): Chord {
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
        return variant === 'neapolitan' ? new Chord(key.tonic, '9sus', 'mixolydian') : sus();
      case 'ii':
        return key.minor ? sus() : new Chord(key.tonic + 2, 'madd9', 'dorian');
      case 'V':
        return new Chord(key.tonic + 7, '9sus', 'mixolydian');
      case 'unison':
        return new Chord(key.tonic, '5');
      case 'section': {
        // The first chord of the section before, if the band played one.
        const before = ctx.before(this)?.material;
        return before && 'bars' in before ? before.bars[0][0] : tonic();
      }
    }
  }

  protected override get details(): string[] {
    const { ends, eases } = this.material;
    return [ends === 'tonic' ? '' : `on ${ends}`, eases ? 'easing' : ''].filter(Boolean);
  }

  // A fermata's first bar held at the fermata's tempo, then back to the
  // song's; or (easing) slower, and slower again halfway through its first bar.
  override get tempo(): readonly TempoMark[] {
    if (this.material.variant === 'fermata')
      return [
        { at: 0, scale: FERMATA.ending },
        { at: 1, scale: 1 },
      ];
    if (!this.material.eases) return [];
    const [first, then] = FINALE_EASE.scale;
    return [
      { at: 0, scale: first },
      { at: 0.5, scale: then },
    ];
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
    // A kick and crash at `at`, and the ride.
    const ring = (at = 0) => [band.kickCrash(at, 2 - at, 0.55), ride()];
    // A chord above sliding down onto the last one, landing at `lands`.
    const slide = (above: Chord, lands: number): Parts => {
      const both = changes({ time: 0, dur: lands, chord: above }, { time: lands, dur: 2 - lands });
      return [
        ...ring(lands),
        band.finaleKeys(both),
        band.strings(both),
        band.bass(both.spans.map(({ time, dur, chord }) => ({ time, dur, note: chord.bassMidi }))),
      ];
    };
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
      case 'slide':
        // The same chord a semitone up, slipping down onto the last one on the and of two.
        return slide(new Chord(fin.root + 1, fin.symbol, fin.scale), 3 / 8);
      case 'neapolitan':
        // A bar of the bIImaj7#11, then down onto the tonic suspended.
        return slide(new Chord(fin.root + 1, '^9#11', 'lydian'), 1);
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
          band.kickCrash(0, 1),
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

// The styles that suit a last chord (FINALE_SUITS).
function suiting(ends: FinaleChord): Odds<FinaleStyle> {
  return only(FINALE_STYLES, (style) => FINALE_SUITS[style]?.includes(ends) ?? true);
}
