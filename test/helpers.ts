/** A value a test needs to be there: it fails, naming what was missing, if not. */
export function defined<T>(value: T | null | undefined, what = 'a value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}, got ${value}`);
  return value;
}
