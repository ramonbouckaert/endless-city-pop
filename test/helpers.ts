import type { Material, Song } from '../src/engine';

/** Each of a song's parts' material, by part id. */
export function materials(song: Song): Readonly<Record<string, Material>> {
  return Object.fromEntries(song.form.sections.map((sec) => [sec.part, sec.material]));
}

/** A value a test needs to be there: it fails, naming what was missing, if not. */
export function defined<T>(value: T | null | undefined, what = 'a value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}, got ${value}`);
  return value;
}
