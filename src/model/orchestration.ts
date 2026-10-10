// Which sounds play a song: a sound for each part of the band, the
// melody voices, and a drum kit, all picked per song from style/instruments.

import type { Rng } from '../lib/random';
import {
  BAND,
  KIT_GAPS,
  KITS,
  PART_LABELS,
  PICKS,
  SAME_SOUND,
  SOUND_LEVELS,
  VOICES,
  type BandPart,
  type LabelledPart,
  type PickedPart,
} from '../style';

/** The band's instruments, as Strudel sound names. */
export type Sounds = Readonly<Record<BandPart, string>> & {
  readonly lead: string;
  readonly double: string; // the lead an octave up
  readonly soloists: readonly string[];
};

/** Where a sound is in Sounds: a part ("keys", "lead"), or one soloist ("soloists.1"). */
export type SoundPath = Exclude<keyof Sounds, 'soloists'> | `soloists.${number}`;
/** A part of the band: where its sound is, or "kit" for the drums. */
export type PartPath = SoundPath | 'kit';

const isSoloist = (path: SoundPath): path is `soloists.${number}` => path.startsWith('soloists.');
const soloistIndex = (path: `soloists.${number}`): number => Number(path.slice('soloists.'.length));

/** How loud a sound plays, relative to the others (SOUND_LEVELS). */
const level = (sound: string): number => SOUND_LEVELS[sound] ?? 1;

/** Soundfonts that play the same recording count as one. */
const recording = (sound: string): string => SAME_SOUND[sound] ?? sound;

/** A drum kit: a Strudel bank name, or null for the default samples. */
export class Kit {
  constructor(readonly bank: string | null) {}

  get name(): string {
    return this.bank ?? 'default samples';
  }

  /** The bank a drum sound plays from: the kit's, or none (the default samples) if the kit lacks it. */
  bankFor(sound: string): string | undefined {
    const { bank } = this;
    if (!bank) return undefined;
    // Bank names are case-insensitive in Strudel (the debug panel lists them lower case).
    const gaps: readonly string[] =
      Object.entries(KIT_GAPS).find(([k]) => k.toLowerCase() === bank.toLowerCase())?.[1] ?? [];
    return gaps.includes(sound) ? undefined : bank;
  }
}

/** The sounds a song plays, and its drum kit. */
export class Instruments {
  constructor(
    readonly sounds: Sounds,
    readonly kit: Kit,
  ) {}

  /** Every part's sound and the kit, picked from the style's lists. */
  static pick(rng: Rng): Instruments {
    return new Instruments(pickSounds(rng.fork('sounds')), new Kit(rng.fork('kit').weighted(KITS)));
  }

  /** Every sound's path: the parts in PART_LABELS's order, then `soloists` soloists. */
  static paths(soloists: number): SoundPath[] {
    const parts = Object.keys(PART_LABELS) as LabelledPart[];
    return [...parts, ...Array.from({ length: soloists }, (_, i) => `soloists.${i}` as const)];
  }

  /** The sound at a path. */
  sound(path: SoundPath): string {
    return isSoloist(path) ? this.sounds.soloists[soloistIndex(path)] : this.sounds[path];
  }

  /** These instruments with the sound at a path replaced. */
  with(path: SoundPath, sound: string): Instruments {
    const { sounds } = this;
    const next = isSoloist(path)
      ? { ...sounds, soloists: sounds.soloists.with(soloistIndex(path), sound) }
      : { ...sounds, [path]: sound };
    return new Instruments(next, this.kit);
  }

  /** These instruments on another kit. */
  withKit(bank: string | null): Instruments {
    return new Instruments(this.sounds, new Kit(bank));
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

/** A label for a sound's path: "Keys", "Soloist 2". */
export function partLabel(path: SoundPath): string {
  return isSoloist(path) ? `Soloist ${soloistIndex(path) + 1}` : PART_LABELS[path];
}

/** Where a song picks a path's sound from (a list in style/instruments.ts), if it picks one. */
export function pickedFrom(path: SoundPath): string | undefined {
  if (isSoloist(path) || path === 'lead' || path === 'double') return 'VOICES.pool';
  return path in PICKS ? `PICKS.${path}` : undefined;
}

// The melody voices first, none sharing a recording; then each part in
// turn (PICKS's order), taking a sound no part before it plays, where its
// list allows.
function pickSounds(rng: Rng): Sounds {
  const unused = (from: readonly string[], used: ReadonlySet<string>) => from.filter((s) => !used.has(recording(s)));
  const distinct = (from: readonly string[]) =>
    from.filter((s, i) => !from.slice(0, i).some((t) => recording(t) === recording(s)));
  const [lead, double, ...soloists] = distinct(rng.shuffle(VOICES.pool)).slice(0, 2 + VOICES.soloists);
  const used = new Set([lead, double, ...soloists].map(recording));
  const picked = {} as Record<PickedPart, string>;
  for (const part of Object.keys(PICKS) as PickedPart[]) {
    const options = unused(PICKS[part], used);
    const sound = rng.pick(options.length ? options : PICKS[part]);
    used.add(recording(sound));
    picked[part] = sound;
  }
  return { ...BAND, ...picked, lead, double, soloists };
}
