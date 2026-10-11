// Which sounds play a song: a sound for each part of the band, the
// melody voices, and a drum kit, all picked per song from style/instruments.

import type { Program } from '../../lib/general-midi';
import type { Rng } from '../../lib/random';
import { BAND, KITS, PICKS, SOUND_LEVELS, VOICES, type BandPart, type Kit, type PickedPart } from '../../style';

/** The band's instruments, as General MIDI programs. */
export type Sounds = Readonly<Record<BandPart, Program>> & {
  readonly lead: Program;
  readonly double: Program; // the lead an octave up
  readonly echo: Program; // the lead's own, echoing it
  readonly soloists: readonly Program[];
};

/** Where a sound is in Sounds: a part ("keys", "lead"), or one soloist ("soloists.1"). */
export type SoundPath = Exclude<keyof Sounds, 'soloists'> | `soloists.${number}`;
/** A part of the band: where its sound is, or "kit" for the drums. */
export type PartPath = SoundPath | 'kit';

/** How loud an instrument plays, relative to the others (SOUND_LEVELS). */
const level = (program: Program): number => SOUND_LEVELS[program] ?? 1;

/** The sounds a song plays, and its drum kit. */
export class Instruments {
  // Each sound by its path.
  private readonly byPath: ReadonlyMap<SoundPath, Program>;

  constructor(
    readonly sounds: Sounds,
    readonly kit: Kit,
  ) {
    const { soloists, ...parts } = sounds;
    this.byPath = new Map<SoundPath, Program>([
      ...(Object.entries(parts) as [SoundPath, Program][]),
      ...soloists.map((program, i) => [`soloists.${i}`, program] as const),
    ]);
  }

  /** Every part's sound and the kit, picked from the style's lists. */
  static pick(rng: Rng): Instruments {
    return new Instruments(pickSounds(rng.fork('sounds')), rng.fork('kit').weighted(KITS));
  }

  /** These instruments, with some parts' sounds changed. */
  with(sounds: Partial<Sounds>): Instruments {
    return new Instruments({ ...this.sounds, ...sounds }, this.kit);
  }

  /** The path of a soloist, by an index into the sounds' soloists (wrapping round). */
  soloist(index: number): SoundPath {
    return `soloists.${index % this.sounds.soloists.length}`;
  }

  /** The instrument at a path. */
  sound(path: SoundPath): Program {
    const program = this.byPath.get(path);
    if (program === undefined) throw new Error(`No sound at ${path}`);
    return program;
  }

  /**
   * How much louder or quieter the sound at a path plays than the sound
   * its part's mix was set for: BAND's, or for the melody voices, the
   * alto sax (level 1).
   */
  trim(path: SoundPath): number {
    const reference = path in BAND ? level(BAND[path as BandPart]) : 1;
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
  return { ...BAND, ...picked, lead, double, echo: lead, soloists };
}
