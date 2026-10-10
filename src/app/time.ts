// The player's clock in song terms: pure helpers, tested on their own.

/** How long a number of bars plays, in seconds: four beats a bar. */
export const seconds = (bars: number, bpm: number): number => (bars * 4 * 60) / bpm;

/** Seconds as m:ss, counting whole seconds like a player's clock. */
export function clock(time: number): string {
  const s = Math.floor(time);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Where a song played now starts on the player's clock, in cycles: at 0
 * if nothing is playing, as the clock restarts too; else at `from`, or
 * where the last one started.
 */
export const startFor = (playing: boolean, from: number | undefined, last: number): number => {
  if (!playing) return 0;
  return from ?? last;
};
