// The debug panel's choices: a sound for any part (a bank, or 'default'
// for the default samples, for the kit), remembered in this browser.
// They replace a song's own picks, and carry over to new songs.

import { Instruments, partLabel, pickedFrom, type PartPath, type SoundPath } from '../../model';
import { BAND, VOICES, type BandPart } from '../../style';
import { Stored } from '../storage';

export const KIT = 'kit' satisfies PartPath;

/** Each instrument the panel offers: where it lives in Sounds, its name, and where a song picks it from (if it does). */
export const ROLES: readonly { path: SoundPath; label: string; from: string | undefined }[] = Instruments.paths(
  VOICES.soloists,
).map((path) => ({ path, label: partLabel(path), from: pickedFrom(path) }));

const STORED = new Stored('endless-city-pop.debug');

// Is a path one of the panel's rows?
const isRow = (path: string): path is PartPath => path === KIT || ROLES.some((r) => r.path === path);

export class Choices {
  private values: Partial<Record<PartPath, string>>;

  /** The choices remembered from before, for rows that still exist. */
  constructor() {
    try {
      const saved = JSON.parse(STORED.get() ?? '{}') as Record<string, string>;
      this.values = Object.fromEntries(Object.entries(saved).filter(([path]) => isRow(path)));
    } catch {
      this.values = {};
    }
  }

  /** The choice for a path, or undefined: the song's own pick. */
  get(path: PartPath): string | undefined {
    return this.values[path];
  }

  /** Chooses a sound for a path (empty: back to the song's pick). */
  set(path: PartPath, value: string): void {
    const { [path]: _, ...rest } = this.values;
    this.values = value ? { ...rest, [path]: value } : rest;
    STORED.set(JSON.stringify(this.values));
  }

  /** Every part back to the song's pick. */
  clear(): void {
    this.values = {};
    STORED.set('{}');
  }

  /** A song's instruments with these choices in place of its own picks. */
  apply(instruments: Instruments): Instruments {
    let out = instruments;
    for (const { path } of ROLES) {
      const sound = this.values[path];
      if (sound !== undefined) out = out.with(path, sound);
    }
    const bank = this.values[KIT];
    if (bank === undefined) return out;
    // 'default': the default samples, which play with no bank.
    const kit = bank === 'default' ? null : bank;
    return out.withKit(kit);
  }

  /** Each choice on a line, with what it replaces: a BAND default, or a random pick. */
  describe(): string[] {
    const paths: PartPath[] = [...ROLES.map((r) => r.path), KIT];
    return paths.flatMap((path) => {
      const value = this.values[path];
      if (value === undefined) return [];
      if (path === KIT)
        return `drum kit: ${value === 'default' ? 'default samples' : value} (instead of the song's pick)`;
      const from = pickedFrom(path);
      const was = from ? `picked at random from ${from}` : `BAND default '${BAND[path as BandPart]}'`;
      return `${path}: '${value}' (instead of ${was})`;
    });
  }
}
