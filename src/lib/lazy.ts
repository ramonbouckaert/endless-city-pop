/** A value made on first use, then kept: call the result to get it. */
export function lazy<T>(make: () => T): () => T {
  let made: { value: T } | undefined;
  return () => (made ??= { value: make() }).value;
}
