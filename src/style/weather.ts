// The weather: a sound effect under a quiet intro (pads, rubato), this
// often, and now and then under a breakdown: waves on the shore (Sea
// Line's, under its breakdown too), or rain (ANRI's); one or the other
// all through a song.

import { GM, type Program } from '../lib/general-midi';
import type { Variant, Variants } from './variants';

export type Weather = 'seashore' | 'rain';

export const WEATHER: {
  intro: number;
  breakdown: number;
  sounds: Variants<Weather, Variant & { program: Program }>;
} = {
  intro: 0.25,
  breakdown: 0.2,
  sounds: {
    seashore: { weight: 3, program: GM.seashore },
    rain: { weight: 1, program: GM.rain },
  },
};
