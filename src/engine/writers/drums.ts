// Drums. A writer picks a feel from a section's plan and rolls its own
// groove by running the feel's recipe (style/drums.ts): where the kicks fall, ghost notes,
// hi-hat or ride, eighths or sixteenths, accents, open hats and extra
// percussion. The fourth bar of each phrase varies, and a section that
// ends in a fill gets a few (snare rolls, tom runs, unison hits, stops)
// for its repeats to pick from. A bar is 16 steps of gains (0 = silent).
//
// Played, a section's drums are the groove, maybe a crash on the first
// bar, and maybe a fill over the end of the last bar (a different one for
// each repeat). The fill replaces the kick and snare from where it
// starts, or everything for a stop.

import { PERCUSSION, type Percussion } from '../../lib/general-midi';
import type { Rng } from '../../lib/random';
import { at, empty, loopBars, steps, type StepGains } from '../../lib/steps';
import {
  BACKBEATS,
  DRUM_FEELS,
  DRUMS,
  EIGHTH_OFFS,
  FILLS,
  type DrumFeel,
  type DrumPlan,
  type DrumRecipe,
  type DrumRole,
  type DrumStep,
  type FillKind,
} from '../../style';
import { Part, type ScoreBand } from '../score';

export interface DrumPart {
  drum: Percussion;
  role: DrumRole;
  bars: readonly StepGains[]; // four bars, the fourth a variation
}
export interface DrumHit {
  step: number;
  drum: Percussion;
  gain: number;
}
// A fill over the end of a section's last bar, from `start`: replacing
// the kick and snare from there, or everything (`stop`).
export interface DrumFill {
  start: number;
  stop: boolean;
  hits: readonly DrumHit[];
}
// A section's drums: its groove, perhaps a crash on the first bar, and
// perhaps a fill (a different one of `fills` each repeat; none if empty).
export interface Drums {
  feel: DrumFeel;
  parts: readonly DrumPart[];
  fills: readonly DrumFill[];
  crash: boolean;
}

type Op<K extends DrumStep['op']> = Extract<DrumStep, { op: K }>;

/** Writes a section's drums from its plan: one of its feels, perhaps with a crash and fills. */
export class DrumWriter {
  readonly feel: DrumFeel;
  private readonly recipe: DrumRecipe;
  private readonly crash: boolean;
  private readonly fill: boolean;

  constructor(
    plan: DrumPlan,
    private readonly rng: Rng,
  ) {
    this.feel = rng.weightedKey(plan.feels);
    this.crash = rng.chance(plan.crash);
    this.fill = rng.chance(plan.fill);
    this.recipe = DRUM_FEELS[this.feel];
  }

  /**
   * The groove as four-bar parts, with a crash and fills if the plan
   * rolled them; `kicks`, a bar of kicks to play in place of the recipe's.
   */
  write(kicks?: StepGains): Drums {
    const { rng, recipe, feel, crash, fill } = this;
    const groove = new RecipeRun(recipe, rng.fork('groove'), kicks).run();
    const vary = !recipe.steady && rng.chance(DRUMS.vary.chance);
    const parts: DrumPart[] = groove.voices.map(({ drum, role, bar }) => {
      const fourthBar = vary && role === 'kick' ? this.varyKick(bar) : bar;
      return { drum, role, bars: [bar, bar, bar, fourthBar] };
    });
    if (groove.openOnFour && rng.chance(DRUMS.openOnFour.chance)) {
      parts.push({
        drum: PERCUSSION.openHat,
        role: 'hat',
        bars: [empty(), empty(), empty(), at({ 14: DRUMS.openOnFour.gain })],
      });
    }
    const fills = fill
      ? Array.from({ length: FILLS.count }, (_, i) => new FillWriter(rng.fork(`fill/${i}`), !!recipe.quiet).write())
      : [];
    return { feel, parts, fills, crash };
  }

  // Bar four of a phrase: a kick dropped (perhaps) and one added.
  private varyKick(bar: StepGains): StepGains {
    const v = DRUMS.vary;
    const hits = bar.flatMap((g, i) => (g && i ? [i] : []));
    const dropped = hits.length && this.rng.chance(v.drop) ? bar.with(this.rng.pick(hits), 0) : bar;
    return dropped.with(this.rng.pick(v.steps), this.rng.pick(v.gains));
  }
}

// One bar of a drum part, as the recipe made it.
interface VoiceBar {
  drum: Percussion;
  role: DrumRole;
  bar: StepGains;
}

// What a recipe's steps have made so far: the voices they add, whether an
// open hat may close the phrase, and the timekeeper (the hi-hat or ride).
interface RecipeState {
  readonly voices: readonly VoiceBar[];
  readonly openOnFour: boolean;
  readonly timekeeper: Percussion;
}

/** One run of a recipe's steps, in order: the voices they add, and whether an open hat may close the phrase. */
class RecipeRun {
  /** `kicks`: a bar of kicks to play in place of the recipe's own. */
  constructor(
    private readonly recipe: DrumRecipe,
    private readonly rng: Rng,
    private readonly kicksGiven?: StepGains,
  ) {}

  run(): { voices: readonly VoiceBar[]; openOnFour: boolean } {
    const start: RecipeState = { voices: [], openOnFour: !!this.recipe.openOnFour, timekeeper: PERCUSSION.closedHat };
    const { voices, openOnFour } = this.recipe.steps.reduce((state, step) => this.step(state, step), start);
    return { voices, openOnFour };
  }

  private step(state: RecipeState, step: DrumStep): RecipeState {
    switch (step.op) {
      case 'kicks':
        return added(state, this.kicks(step));
      case 'backbeat':
        return added(state, ...this.backbeat(step));
      case 'ghosts':
        return added(state, ...this.ghosts(step));
      case 'cymbal':
        return this.cymbal(state, step);
      case 'openHats':
        return this.openHats(state, step);
      case 'voice':
        return added(state, ...this.voice(step));
    }
  }

  private kicks({ required, optional, gain }: Op<'kicks'>): VoiceBar {
    if (this.kicksGiven) return { drum: PERCUSSION.kick, role: 'kick', bar: this.kicksGiven };
    const density = optional.length ? this.rng.range(DRUMS.kickDensity) : 0;
    const soft = optional.flatMap(([i, p]) =>
      this.rng.chance(p * density) ? [[i, gain * this.rng.range(DRUMS.kickSoft)]] : [],
    );
    return {
      drum: PERCUSSION.kick,
      role: 'kick',
      bar: at({ ...Object.fromEntries(required.map((i) => [i, gain])), ...Object.fromEntries(soft) }),
    };
  }

  // Snare, clap or both; a rim click plays softer.
  private backbeat({ steps: beats, gain, orElse }: Op<'backbeat'>): VoiceBar[] {
    const hits = orElse && !this.rng.chance(orElse.keep) ? orElse.steps : beats;
    const drums = this.rng.weighted(BACKBEATS);
    return drums.map((drum) => {
      let level: number;
      if (drum === PERCUSSION.sideStick) level = gain * 0.4;
      else if (drum === PERCUSSION.clap && drums.length > 1) level = gain * 0.8;
      else level = gain;
      return { drum, role: 'snare', bar: steps(hits, level) };
    });
  }

  // Soft snare hits between the backbeats, if any fall.
  private ghosts({ density, avoid }: Op<'ghosts'>): VoiceBar[] {
    const d = this.rng.range(density);
    const bar = empty().map((_, i) => {
      const weight = i % 2 === 0 ? 0.6 : 1;
      return avoid.includes(i) || !this.rng.chance(d * weight) ? 0 : this.rng.range(DRUMS.ghostGain);
    });
    return bar.some(Boolean) ? [{ drum: PERCUSSION.snare, role: 'ghost', bar }] : [];
  }

  // Hi-hat or ride, eighths or sixteenths, accented on the beat or, for
  // a pushier feel, the offbeat: the timekeeper from here on.
  private cymbal(state: RecipeState, { ride, sixteenths, loud }: Op<'cymbal'>): RecipeState {
    const { rng } = this;
    const c = DRUMS.cymbal;
    const drum = rng.chance(ride) ? PERCUSSION.ride : PERCUSSION.closedHat;
    const sixteen = rng.chance(sixteenths);
    const accent = rng.range(c.accent) * loud * (drum === PERCUSSION.ride ? DRUMS.rideLevel : 1);
    const mid = accent * rng.range(c.mid);
    const weak = accent * rng.range(c.weak);
    const [on, off] = rng.chance(c.offbeat) ? [mid, accent] : [accent, mid];
    const cymbalGain = (i: number): number => {
      if (!sixteen && i % 2) return 0;
      if (i % 4 === 0) return on;
      if (i % 4 === 2) return off;
      return weak;
    };
    const bar = empty().map((_, i) => cymbalGain(i));
    return { ...added(state, { drum, role: 'hat', bar }), timekeeper: drum };
  }

  private openHats(state: RecipeState, { chance }: Op<'openHats'>): RecipeState {
    if (state.timekeeper === PERCUSSION.closedHat && this.rng.chance(chance)) {
      return added(state, { drum: PERCUSSION.openHat, role: 'hat', bar: steps(EIGHTH_OFFS, DRUMS.openHatGain) });
    }
    return { ...state, openOnFour: true };
  }

  private voice({ chance, voices }: Op<'voice'>): VoiceBar[] {
    if (chance !== undefined && !this.rng.chance(chance)) return [];
    const { drum, role, bars } = this.rng.weighted(voices.map((v) => [v, v.weight ?? 1] as const));
    return [{ drum, role, bar: this.rng.pick(bars) }];
  }
}

// A recipe's state with voices added.
const added = (state: RecipeState, ...voices: VoiceBar[]): RecipeState => ({
  ...state,
  voices: [...state.voices, ...voices],
});

/** A fill over the end of a bar, from where it starts to the barline. */
class FillWriter {
  private readonly start: number;
  private readonly kind: FillKind;
  private readonly level: number;

  constructor(
    private readonly rng: Rng,
    quiet: boolean,
  ) {
    const loudness = quiet ? 'quiet' : 'loud';
    this.start = rng.weighted(FILLS.starts[loudness]);
    this.kind = rng.weightedKey(FILLS.kinds[loudness]);
    this.level = quiet ? FILLS.quietLevel : 1;
  }

  write(): DrumFill {
    const { rng, start, level } = this;
    const hits: DrumHit[] = [];
    const hit = (step: number, drum: Percussion, gain: number) => hits.push({ step, drum, gain });
    switch (this.kind) {
      case 'roll':
        this.run((i) => hit(i, PERCUSSION.snare, this.ramp(i)));
        break;
      case 'toms':
        this.run((i) =>
          hit(
            i,
            [PERCUSSION.highTom, PERCUSSION.midTom, PERCUSSION.lowTom][Math.min(2, Math.floor(this.progress(i) * 3))],
            this.ramp(i) * 1.4,
          ),
        );
        if (rng.chance(0.5)) hit(15, PERCUSSION.kick, 0.6 * level);
        break;
      case 'mixed':
        this.run((i) => {
          if (i > start && rng.chance(0.2)) return;
          const drum = rng.weighted(FILLS.mixed);
          hit(i, drum, this.ramp(i) * (drum === PERCUSSION.snare ? 1 : 1.3));
        });
        break;
      case 'unison':
        // Kick and snare together on a syncopated figure.
        for (let i = start; i < 16; i += 3) {
          hit(i, PERCUSSION.snare, 0.4 * level);
          hit(i, PERCUSSION.kick, 0.6 * level);
        }
        break;
      case 'stop':
        // Everything stops, then a snare pickup.
        hit(rng.pick([14, 15]), PERCUSSION.snare, 0.35 * level);
    }
    return { start, stop: this.kind === 'stop', hits };
  }

  private progress(i: number): number {
    return (i - this.start) / (16 - this.start);
  }

  // Getting louder towards the barline.
  private ramp(i: number): number {
    return (0.2 + 0.25 * this.progress(i)) * this.level;
  }

  // Each sixteenth or eighth from the start.
  private run(each: (i: number) => void): void {
    const rate = this.rng.chance(FILLS.sixteenths) ? 1 : 2;
    for (let i = this.start; i < 16; i += rate) each(i);
  }
}

// ---- As notes

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
  const fill = d.fills.length ? d.fills[repeat % d.fills.length] : null;
  // The fill takes over the last bar from its start.
  const beforeFill = (time: number) => !fill || time < len - 1 + fill.start / 16;
  const groove = d.parts.map(({ drum, role, bars }) => {
    const hits = loopBars(bars, len, (gain, b, i) => ({ time: b + i / 16, dur: 1 / 16, gain }));
    const part = band.kit(
      drum,
      hits.filter((h) => h.gain),
    );
    const held = enter?.(role);
    const entered = held ? part.mask(held) : part;
    return fill && (fill.stop || role === 'kick' || role === 'snare' || role === 'ghost')
      ? entered.mask(beforeFill)
      : entered;
  });
  const fillHits = (fill?.hits ?? []).map((h) =>
    band.kit(h.drum, [{ time: len - 1 + h.step / 16, dur: 1 / 16, gain: h.gain }]),
  );
  return Part.stack(...groove, ...fillHits, d.crash && band.crash());
}
