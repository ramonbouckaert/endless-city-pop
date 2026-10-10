// Which sounds play a song: a sound for each part of the band, the
// melody voices, and a drum kit, all picked per song from style/instruments.

import type { Rng } from '../lib/random';
import {
  BAND,
  KITS,
  PICKS,
  SAME_SOUND,
  SOUND_LEVELS,
  VOICES,
  type BandPart,
  type PickedPart,
  type VoiceRole,
} from '../style';

/** The band's instruments, as Strudel sound names. */
export type Sounds = Readonly<Record<BandPart, string>> & {
  readonly lead: string;
  readonly double: string; // the lead an octave up
  readonly soloists: readonly string[];
};

/** The sounds a song plays, and its drum kit (a Strudel bank name, or null: the default samples). */
export interface Instruments {
  sounds: Sounds;
  kit: string | null;
}

/** Where a sound is in Sounds: a part ("keys", "lead"), or one soloist ("soloists.1"). */
export type SoundPath = Exclude<keyof Sounds, 'soloists'> | `soloists.${number}`;
/** A part of the band: where its sound is, or "kit" for the drums. */
export type PartPath = SoundPath | 'kit';

const isSoloist = (path: SoundPath): path is `soloists.${number}` => path.startsWith('soloists.');
const soloistIndex = (path: `soloists.${number}`): number => Number(path.slice('soloists.'.length));

/** The sound at a path. */
export function soundAt(sounds: Sounds, path: SoundPath): string {
  return isSoloist(path) ? sounds.soloists[soloistIndex(path)] : sounds[path];
}

/** Sounds with the one at a path replaced. */
export function withSound(sounds: Sounds, path: SoundPath, sound: string): Sounds {
  if (isSoloist(path)) return { ...sounds, soloists: sounds.soloists.with(soloistIndex(path), sound) };
  return { ...sounds, [path]: sound };
}

/** A melody voice's gain: its part's, at the sound's level. */
export const voiceGain = (sound: string, role: VoiceRole): number =>
  Math.round(VOICES.gains[role] * level(sound) * 1000) / 1000;

/** How loud a sound plays, relative to the others (SOUND_LEVELS). */
export const level = (sound: string): number => SOUND_LEVELS[sound] ?? 1;

/** Soundfonts that play the same recording count as one. */
export const recording = (sound: string): string => SAME_SOUND[sound] ?? sound;

export function pickInstruments(rng: Rng): Instruments {
  return { sounds: pickSounds(rng.fork('sounds')), kit: rng.fork('kit').weighted(KITS) };
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
