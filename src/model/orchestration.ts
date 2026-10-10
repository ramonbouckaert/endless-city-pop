// Which sounds play a song: a sound for each part of the band, the
// melody voices, and a drum kit, all picked per song from style/instruments.

import type { Program } from '../lib/general-midi';
import type { Rng } from '../lib/random';
import { BAND, KITS, PICKS, SOUND_LEVELS, VOICES, type BandPart, type KitDef, type PickedPart } from '../style';

/** The band's instruments, as General MIDI programs. */
export type Sounds = Readonly<Record<BandPart, Program>> & {
  readonly lead: Program;
  readonly double: Program; // the lead an octave up
  readonly soloists: readonly Program[];
};

/** Where a sound is in Sounds: a part ("keys", "lead"), or one soloist ("soloists.1"). */
export type SoundPath = Exclude<keyof Sounds, 'soloists'> | `soloists.${number}`;
/** A part of the band: where its sound is, or "kit" for the drums. */
export type PartPath = SoundPath | 'kit';

const isSoloist = (path: SoundPath): path is `soloists.${number}` => path.startsWith('soloists.');
const soloistIndex = (path: `soloists.${number}`): number => Number(path.slice('soloists.'.length));

/** How loud an instrument plays, relative to the others (SOUND_LEVELS). */
const level = (program: Program): number => SOUND_LEVELS[program] ?? 1;

/** A drum kit: one of the soundfont's, by its program on the drum channel. */
export type Kit = KitDef;

/** The sounds a song plays, and its drum kit. */
export class Instruments {
  constructor(
    readonly sounds: Sounds,
    readonly kit: Kit,
  ) {}

  /** Every part's sound and the kit, picked from the style's lists. */
  static pick(rng: Rng): Instruments {
    return new Instruments(pickSounds(rng.fork('sounds')), rng.fork('kit').weighted(KITS));
  }

  /** The instrument at a path. */
  sound(path: SoundPath): Program {
    return isSoloist(path) ? this.sounds.soloists[soloistIndex(path)] : this.sounds[path];
  }

  /**
   * How much louder or quieter the sound at a path plays than the sound
   * its part's mix was set for: BAND's, or for the melody voices, the
   * alto sax (level 1).
   */
  trim(path: SoundPath): number {
    const part = isSoloist(path) ? undefined : path;
    const reference = part && part in BAND ? level(BAND[part as BandPart]) : 1;
    return level(this.sound(path)) / reference;
  }
}

// The melody voices first, all different; then each part in turn
// (PICKS's order), taking a sound no part before it plays, where its list
// allows.
function pickSounds(rng: Rng): Sounds {
  const [lead, double, ...soloists] = rng.shuffle(VOICES.pool).slice(0, 2 + VOICES.soloists);
  const used = new Set([lead, double, ...soloists]);
  const picked = {} as Record<PickedPart, Program>;
  for (const part of Object.keys(PICKS) as PickedPart[]) {
    const options = PICKS[part].filter((s) => !used.has(s));
    const sound = rng.pick(options.length ? options : PICKS[part]);
    used.add(sound);
    picked[part] = sound;
  }
  return { ...BAND, ...picked, lead, double, soloists };
}
