// Drums. A writer takes a feel and rolls its own groove by running the
// feel's recipe (style/drums.ts): where the kicks fall, ghost notes,
// hi-hat or ride, eighths or sixteenths, accents, open hats and extra
// percussion. The fourth bar of each phrase varies, and a section that
// ends in a fill gets a few (snare rolls, tom runs, unison hits, stops)
// for its repeats to pick from. A bar is 16 steps of gains (0 = silent).

import type { Rng } from '../lib/random';
import { at, empty, steps, type StepGains } from '../lib/steps';
import {
  BACKBEATS,
  DRUM_FEELS,
  DRUMS,
  EIGHTH_OFFS,
  FILLS,
  type DrumFeel,
  type DrumRecipe,
  type DrumRole,
  type DrumStep,
  type FillKind,
} from '../style';

export interface DrumPart {
  sound: string;
  role: DrumRole;
  bars: readonly StepGains[]; // four bars, the fourth a variation
}
export interface DrumHit {
  step: number;
  sound: string;
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
// perhaps a fill (a different one of `fills` each repeat).
export interface Drums {
  feel: DrumFeel;
  parts: readonly DrumPart[];
  fills: readonly DrumFill[];
  crash: boolean;
  fill: boolean;
}

type Op<K extends DrumStep['op']> = Extract<DrumStep, { op: K }>;

export class DrumWriter {
  private readonly recipe: DrumRecipe;
  private readonly voices: { sound: string; role: DrumRole; bar: StepGains }[] = [];
  private openOnFour: boolean;
  private cymbalSound = 'hh';

  constructor(
    readonly feel: DrumFeel,
    private readonly rng: Rng,
  ) {
    this.recipe = DRUM_FEELS[feel];
    this.openOnFour = !!this.recipe.openOnFour;
  }

  /** The groove as four-bar parts, with a crash and fills if asked for. */
  write(crash: boolean, fill: boolean): Drums {
    for (const step of this.recipe.steps) this.run(step);
    const vary = !this.recipe.steady && this.rng.chance(DRUMS.vary.chance);
    const parts: DrumPart[] = this.voices.map(({ sound, role, bar }) => {
      const fourthBar = vary && role === 'kick' ? this.varyKick(bar) : bar;
      return { sound, role, bars: [bar, bar, bar, fourthBar] };
    });
    if (this.openOnFour && this.rng.chance(DRUMS.openOnFour.chance)) {
      parts.push({ sound: 'oh', role: 'hat', bars: [empty(), empty(), empty(), at({ 14: DRUMS.openOnFour.gain })] });
    }
    const fills = fill
      ? Array.from({ length: FILLS.count }, () => new FillWriter(this.rng, !!this.recipe.quiet).write())
      : [];
    return { feel: this.feel, parts, fills, crash, fill };
  }

  private add(sound: string, role: DrumRole, bar: StepGains): void {
    this.voices.push({ sound, role, bar });
  }

  private run(step: DrumStep): void {
    switch (step.op) {
      case 'kicks':
        return this.kicks(step);
      case 'backbeat':
        return this.backbeat(step);
      case 'ghosts':
        return this.ghosts(step);
      case 'cymbal':
        return this.cymbal(step);
      case 'openHats':
        return this.openHats(step);
      case 'voice':
        return this.voice(step);
    }
  }

  private kicks({ required, optional, gain }: Op<'kicks'>): void {
    const density = optional.length ? this.rng.range(DRUMS.kickDensity) : 0;
    const soft = optional.flatMap(([i, p]) =>
      this.rng.chance(p * density) ? [[i, gain * this.rng.range(DRUMS.kickSoft)]] : [],
    );
    this.add('bd', 'kick', at({ ...Object.fromEntries(required.map((i) => [i, gain])), ...Object.fromEntries(soft) }));
  }

  // Snare, clap or both; a rim click plays softer.
  private backbeat({ steps: beats, gain, orElse }: Op<'backbeat'>): void {
    const hits = orElse && !this.rng.chance(orElse.keep) ? orElse.steps : beats;
    const sounds = this.rng.weighted(BACKBEATS);
    for (const sound of sounds) {
      let level: number;
      if (sound === 'rim') level = gain * 0.4;
      else if (sound === 'cp' && sounds.length > 1) level = gain * 0.8;
      else level = gain;
      this.add(sound, 'snare', steps(hits, level));
    }
  }

  // Soft snare hits between the backbeats.
  private ghosts({ density, avoid }: Op<'ghosts'>): void {
    const d = this.rng.range(density);
    const bar = empty().map((_, i) => {
      const weight = i % 2 === 0 ? 0.6 : 1;
      return avoid.includes(i) || !this.rng.chance(d * weight) ? 0 : this.rng.range(DRUMS.ghostGain);
    });
    if (bar.some(Boolean)) this.add('sd', 'ghost', bar);
  }

  // Hi-hat or ride, eighths or sixteenths, accented on the beat or, for
  // a pushier feel, the offbeat.
  private cymbal({ ride, sixteenths, loud }: Op<'cymbal'>): void {
    const { rng } = this;
    const c = DRUMS.cymbal;
    const sound = rng.chance(ride) ? 'rd' : 'hh';
    const sixteen = rng.chance(sixteenths);
    const accent = rng.range(c.accent) * loud * (sound === 'rd' ? DRUMS.rideLevel : 1);
    const mid = accent * rng.range(c.mid);
    const weak = accent * rng.range(c.weak);
    const [on, off] = rng.chance(c.offbeat) ? [mid, accent] : [accent, mid];
    this.cymbalSound = sound;
    const cymbalGain = (i: number): number => {
      if (!sixteen && i % 2) return 0;
      if (i % 4 === 0) return on;
      if (i % 4 === 2) return off;
      return weak;
    };
    this.add(
      sound,
      'hat',
      empty().map((_, i) => cymbalGain(i)),
    );
  }

  private openHats({ chance }: Op<'openHats'>): void {
    if (this.cymbalSound === 'hh' && this.rng.chance(chance)) {
      this.add('oh', 'hat', steps(EIGHTH_OFFS, DRUMS.openHatGain));
    } else this.openOnFour = true;
  }

  private voice({ chance, voices }: Op<'voice'>): void {
    if (chance !== undefined && !this.rng.chance(chance)) return;
    const { sound, role, bars } = this.rng.pick(voices);
    this.add(sound, role, this.rng.pick(bars));
  }

  // Bar four of a phrase: a kick dropped (perhaps) and one added.
  private varyKick(bar: StepGains): StepGains {
    const v = DRUMS.vary;
    const hits = bar.flatMap((g, i) => (g && i ? [i] : []));
    const dropped = hits.length && this.rng.chance(v.drop) ? bar.with(this.rng.pick(hits), 0) : bar;
    return dropped.with(this.rng.pick(v.steps), this.rng.pick(v.gains));
  }
}

/** A fill over the end of a bar, from where it starts to the barline. */
class FillWriter {
  private readonly hits: DrumHit[] = [];
  private readonly start: number;
  private readonly kind: FillKind;
  private readonly level: number;

  constructor(
    private readonly rng: Rng,
    quiet: boolean,
  ) {
    const weight = <T>([v, loud, soft]: readonly [T, number, number]) => [v, quiet ? soft : loud] as const;
    this.start = rng.weighted(FILLS.starts.map(weight));
    this.kind = rng.weighted(FILLS.kinds.map(weight));
    this.level = quiet ? FILLS.quietLevel : 1;
  }

  write(): DrumFill {
    const { rng, start, level } = this;
    switch (this.kind) {
      case 'roll':
        this.run((i) => this.hit(i, 'sd', this.ramp(i)));
        break;
      case 'toms':
        this.run((i) =>
          this.hit(i, ['ht', 'mt', 'lt'][Math.min(2, Math.floor(this.progress(i) * 3))], this.ramp(i) * 1.4),
        );
        if (rng.chance(0.5)) this.hit(15, 'bd', 0.6 * level);
        break;
      case 'mixed':
        this.run((i) => {
          if (i > start && rng.chance(0.2)) return;
          const sound = rng.weighted(FILLS.mixed);
          this.hit(i, sound, this.ramp(i) * (sound === 'sd' ? 1 : 1.3));
        });
        break;
      case 'unison':
        // Kick and snare together on a syncopated figure.
        for (let i = start; i < 16; i += 3) {
          this.hit(i, 'sd', 0.4 * level);
          this.hit(i, 'bd', 0.6 * level);
        }
        break;
      case 'stop':
        // Everything stops, then a snare pickup.
        this.hit(rng.pick([14, 15]), 'sd', 0.35 * level);
    }
    return { start, stop: this.kind === 'stop', hits: this.hits };
  }

  private hit(step: number, sound: string, gain: number): void {
    this.hits.push({ step, sound, gain });
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
