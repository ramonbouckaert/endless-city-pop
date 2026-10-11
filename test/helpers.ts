import { Finale, Song, type AnySection, type Material } from '../src/engine';
import { FERMATA } from '../src/style';

/** Each of a song's parts' material, by part id. */
export function materials(song: Song): Readonly<Record<string, Material>> {
  return Object.fromEntries(song.form.sections.map((sec) => [sec.part, sec.material]));
}

/** The first section of each of a song's parts. */
export function partSections(song: Song): AnySection[] {
  return song.form.sections.filter((sec, i, all) => all.findIndex((s) => s.part === sec.part) === i);
}

/** A value a test needs to be there: it fails, naming what was missing, if not. */
export function defined<T>(value: T | null | undefined, what = 'a value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}, got ${value}`);
  return value;
}

/**
 * The bars a song holds on a fermata, in order, each with the share of
 * the song's tempo it plays at: a mid-song one's section's last, and a
 * fermata finale's first.
 */
export function heldBars(song: Song): { bar: number; scale: number }[] {
  const { form } = song;
  return form.sections.flatMap((sec, i) => {
    if (sec.fermata) return [{ bar: form.starts[i] + sec.bars - 1, scale: FERMATA.midSong }];
    if (sec instanceof Finale && sec.material.variant === 'fermata')
      return [{ bar: form.starts[i], scale: FERMATA.ending }];
    return [];
  });
}

// Songs from the 'fermata' seeds, generated once.
const FERMATA_SONGS = new Map<number, Song>();

/** The first song from the 'fermata' seeds that `want` picks. */
export function songWhere(want: (song: Song) => boolean, what: string): Song {
  for (let i = 0; i < 400; i++) {
    let song = FERMATA_SONGS.get(i);
    if (!song) {
      song = Song.generate(`fermata${i}`);
      FERMATA_SONGS.set(i, song);
    }
    if (want(song)) return song;
  }
  throw new Error(`Expected ${what} among the fermata seeds`);
}
