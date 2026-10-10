// Drums. A writer takes a feel and rolls its own groove by running the
// feel's recipe (constants.ts): where the kicks fall, ghost notes,
// hi-hat or ride, eighths or sixteenths, accents, open hats and extra
// percussion. The fourth bar of each phrase varies, and a section that
// ends in a fill gets a few (snare rolls, tom runs, unison hits, stops)
// for its repeats to pick from. A bar is 16 steps of gains (0 = silent).

import type { Rng } from './random';
import type { DrumFeel, DrumFill, DrumHit, DrumPart, DrumRecipe, DrumRole, DrumStep, DrumVoice, Range, StepGains, Weighted } from './types';

export const empty = (): StepGains => new Array(16).fill(0);
export const at = (hits: Record<number, number>): StepGains => {
  const bar = empty();
  for (const [i, v] of Object.entries(hits)) bar[Number(i)] = v;
  return bar;
};
const steps = (list: readonly number[], gain: number | ((i: number) => number)) =>
  at(Object.fromEntries(list.map((i) => [i, typeof gain === 'number' ? gain : gain(i)])));

const BEATS = [0, 4, 8, 12];
export const EIGHTH_OFFS = [2, 6, 10, 14];

// Extra percussion: shaker, tambourine or cowbell.
const shaker: DrumVoice = { sound: 'sh', role: 'perc', bars: [empty().map((_, i) => (i % 2 ? 0.06 : 0.1))] };
const PERCUSSION: readonly DrumVoice[] = [
  shaker,
  shaker,
  { sound: 'tb', role: 'perc', bars: [at({ 4: 0.12, 12: 0.12 }), at({ 2: 0.1, 6: 0.1, 10: 0.1, 14: 0.1 })] },
  { sound: 'cb', role: 'perc', bars: [BEATS, [0, 6, 10], [2, 8, 14]].map((list) => steps(list, 0.08)) },
];
const percussion = (chance: number) => ({ op: 'voice', chance, voices: PERCUSSION }) as const;

// The backbeat's sound(s), and how the level scales for each.
export const BACKBEATS: Weighted<string[]> = [
  [['sd'], 4],
  [['sd', 'cp'], 2],
  [['cp'], 1],
  [['rim'], 0.5],
];

// Each feel's groove, as steps rolled in order.
export const DRUM_FEELS: Readonly<Record<DrumFeel, DrumRecipe>> = {
  funk: {
    openOnFour: true,
    steps: [
      {
        op: 'kicks',
        required: [0],
        optional: [
          [3, 0.4],
          [6, 0.35],
          [7, 0.2],
          [8, 0.4],
          [10, 0.55],
          [11, 0.3],
          [14, 0.3],
          [15, 0.15],
        ],
        gain: 0.75,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.5, orElse: { keep: 0.85, steps: [4, 12, 15] } },
      { op: 'ghosts', density: [0.05, 0.35], avoid: [4, 12] },
      { op: 'cymbal', sixteenths: 0.7, ride: 0.15, loud: 1 },
      percussion(0.3),
    ],
  },
  disco: {
    steps: [
      {
        op: 'kicks',
        required: BEATS,
        optional: [
          [3, 0.15],
          [7, 0.1],
          [14, 0.15],
          [15, 0.15],
        ],
        gain: 0.78,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.48 },
      { op: 'cymbal', sixteenths: 0.6, ride: 0.1, loud: 0.8 },
      { op: 'openHats', chance: 0.75 }, // the disco signature
      percussion(0.45),
    ],
  },
  halfTime: {
    quiet: true,
    steps: [
      {
        op: 'kicks',
        required: [0],
        optional: [
          [3, 0.2],
          [6, 0.3],
          [10, 0.4],
          [11, 0.3],
          [14, 0.25],
        ],
        gain: 0.6,
      },
      { op: 'backbeat', steps: [8], gain: 0.45 },
      { op: 'ghosts', density: [0, 0.2], avoid: [8] },
      { op: 'voice', chance: 0.5, voices: [{ sound: 'rim', role: 'perc', bars: [at({ 4: 0.08, 12: 0.08 })] }] },
      { op: 'cymbal', sixteenths: 0.3, ride: 0.35, loud: 0.7 },
      percussion(0.25),
    ],
  },
  bossa: {
    quiet: true,
    steps: [
      {
        op: 'voice',
        voices: [
          {
            sound: 'bd',
            role: 'kick',
            bars: [
              [0, 6, 8, 14],
              [0, 3, 4, 7, 8, 11, 12, 15],
              [0, 8],
            ].map((list) => steps(list, (i) => (i % 4 ? 0.4 : 0.55))),
          },
        ],
      },
      // Cross-stick on a clave figure.
      {
        op: 'voice',
        voices: [
          {
            sound: 'rim',
            role: 'snare',
            bars: [
              [0, 3, 6, 10, 13],
              [0, 3, 7, 10, 12],
              [2, 6, 10, 12],
              [3, 6, 10, 14],
            ].map((list) => steps(list, 0.2)),
          },
        ],
      },
      { op: 'cymbal', sixteenths: 0, ride: 0.6, loud: 0.6 },
      {
        op: 'voice',
        chance: 0.5,
        voices: [{ sound: 'sh', role: 'perc', bars: [empty().map((_, i) => { if (i % 2) { return 0; } return i % 4 ? 0.06 : 0.1; })] }],
      },
    ],
  },
  introRide: {
    quiet: true,
    steady: true,
    steps: [
      { op: 'cymbal', sixteenths: 0, ride: 0.75, loud: 0.45 },
      {
        op: 'voice',
        chance: 0.6,
        voices: [{ sound: 'rim', role: 'snare', bars: [at({ 12: 0.1 }), at({ 4: 0.08, 12: 0.1 })] }],
      },
      { op: 'voice', chance: 0.4, voices: [{ sound: 'bd', role: 'kick', bars: [at({ 0: 0.35 })] }] },
    ],
  },
  claps: {
    steps: [
      { op: 'kicks', required: BEATS, optional: [], gain: 0.55 },
      { op: 'voice', voices: [{ sound: 'cp', role: 'snare', bars: [at({ 4: 0.45, 12: 0.45 })] }] },
      percussion(0.5),
    ],
  },
  build: {
    steps: [
      { op: 'kicks', required: BEATS, optional: [], gain: 0.7 },
      // Snare in eighths or quarters, getting louder.
      {
        op: 'voice',
        voices: [
          {
            sound: 'sd',
            role: 'snare',
            bars: [2, 4].map((every) => empty().map((_, i) => (i % every ? 0 : 0.18 + (i / 16) * 0.2))),
          },
        ],
      },
      { op: 'cymbal', sixteenths: 0.3, ride: 0, loud: 0.6 },
    ],
  },
  // Drums alone: a busy funk groove.
  break: {
    openOnFour: true,
    steps: [
      {
        op: 'kicks',
        required: [0, 10],
        optional: [
          [3, 0.6],
          [6, 0.5],
          [7, 0.4],
          [8, 0.4],
          [11, 0.4],
          [14, 0.4],
        ],
        gain: 0.75,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.5 },
      { op: 'ghosts', density: [0.25, 0.5], avoid: [4, 12] },
      { op: 'cymbal', sixteenths: 0.85, ride: 0.1, loud: 1.1 },
    ],
  },
};

export const DRUMS = {
  kickDensity: [0.4, 1] as Range,
  kickSoft: [0.7, 0.95] as Range,
  ghostGain: [0.05, 0.1] as Range,
  cymbal: { accent: [0.14, 0.24] as Range, mid: [0.4, 0.7] as Range, weak: [0.2, 0.45] as Range, offbeat: 0.25 },
  rideLevel: 0.7,
  vary: { chance: 0.7, drop: 0.5, steps: [3, 7, 10, 11, 14, 15], gains: [0.5, 0.6, 0.7] },
  openOnFour: { chance: 0.6, gain: 0.14 },
  openHatGain: 0.13,
};

// Fills: [value, weight, weight in a quiet feel].
export const FILLS = {
  count: 3,
  starts: [
    [12, 3, 3],
    [8, 4, 4],
    [0, 1, 0],
  ] as readonly (readonly [number, number, number])[],
  kinds: [
    ['roll', 3, 3],
    ['toms', 3, 1],
    ['mixed', 2, 0.5],
    ['unison', 1, 1],
    ['stop', 1, 0.3],
  ] as readonly (readonly [string, number, number])[],
  mixed: [
    ['sd', 3],
    ['ht', 1],
    ['mt', 1],
    ['lt', 1],
    ['bd', 1],
  ] as Weighted<string>,
  sixteenths: 0.65,
  quietLevel: 0.6,
};

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

  /** The groove as four-bar parts, and fills if the section ends in one. */
  write(withFills: boolean): { feel: DrumFeel; parts: DrumPart[]; fills: DrumFill[] } {
    for (const step of this.recipe.steps) this.run(step);
    const vary = !this.recipe.steady && this.rng.chance(DRUMS.vary.chance);
    const parts: DrumPart[] = this.voices.map(({ sound, role, bar }) => {
      const fourthBar = vary && role === 'kick' ? this.varyKick(bar) : bar;
      return { sound, role, bars: [bar, bar, bar, fourthBar] };
    });
    if (this.openOnFour && this.rng.chance(DRUMS.openOnFour.chance)) {
      parts.push({ sound: 'oh', role: 'hat', bars: [empty(), empty(), empty(), at({ 14: DRUMS.openOnFour.gain })] });
    }
    const fills = withFills
      ? Array.from({ length: FILLS.count }, () => new FillWriter(this.rng, !!this.recipe.quiet).write())
      : [];
    return { feel: this.feel, parts, fills };
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
    const bar = empty();
    for (const i of required) bar[i] = gain;
    const density = optional.length ? this.rng.range(DRUMS.kickDensity) : 0;
    for (const [i, p] of optional) if (this.rng.chance(p * density)) bar[i] = gain * this.rng.range(DRUMS.kickSoft);
    this.add('bd', 'kick', bar);
  }

  // Snare, clap or both; a rim click plays softer.
  private backbeat({ steps, gain, orElse }: Op<'backbeat'>): void {
    const hits = orElse && !this.rng.chance(orElse.keep) ? orElse.steps : steps;
    const sounds = this.rng.weighted(BACKBEATS);
    for (const sound of sounds) {
      let level: number;
      if (sound === 'rim') level = gain * 0.4;
      else if (sound === 'cp' && sounds.length > 1) level = gain * 0.8;
      else level = gain;
      this.add(sound, 'snare', at(Object.fromEntries(hits.map((i) => [i, level]))));
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
    this.add(sound, 'hat', empty().map((_, i) => cymbalGain(i)));
  }

  private openHats({ chance }: Op<'openHats'>): void {
    if (this.cymbalSound === 'hh' && this.rng.chance(chance)) {
      this.add('oh', 'hat', at(Object.fromEntries(EIGHTH_OFFS.map((i) => [i, DRUMS.openHatGain]))));
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
    const out = [...bar];
    const hits = out.flatMap((g, i) => (g && i ? [i] : []));
    if (hits.length && this.rng.chance(v.drop)) out[this.rng.pick(hits)] = 0;
    out[this.rng.pick(v.steps)] = this.rng.pick(v.gains);
    return out;
  }
}

/** A fill over the end of a bar, from where it starts to the barline. */
class FillWriter {
  private readonly hits: DrumHit[] = [];
  private readonly start: number;
  private readonly kind: string;
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
      default:
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
