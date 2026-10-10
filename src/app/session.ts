// The song playing (or ready to): generating songs, arranging them, and
// starting or swapping them on the player's clock.

import { randomSeed } from '../lib/random';
import { Song, type Instruments } from '../model';
import { Arranger, type Arrangement } from '../render';
import type { Player } from './player';
import { startFor } from './time';

// Seconds' notice the player needs to start a song cleanly.
const LEAD = 0.2;

export interface SessionOptions {
  /** Instruments to arrange a song with in place of its own (the debug panel's). */
  instruments?: (song: Song) => Instruments | undefined;
  /** A new song is ready. */
  onSong(song: Song): void;
  /** Something went wrong (empty: nothing has). */
  onError(message: string): void;
}

export class Session {
  current!: Arrangement & { song: Song };
  // Where the current song starts on the player's clock, in cycles: songs
  // after the first start where the one before ended, or a moment after a
  // Generate, not wherever the clock has got to.
  start = 0;

  constructor(
    private readonly player: Player,
    private readonly options: SessionOptions,
  ) {}

  get song(): Song {
    return this.current.song;
  }

  get playing(): boolean {
    return this.player.now() !== undefined;
  }

  /** A new song from a random seed, its key, mode and tempo left to the seed. */
  generate(): void {
    try {
      this.current = this.arrange(Song.generate(randomSeed()));
    } catch (e) {
      this.options.onError(`Could not generate a song: ${(e as Error).message}`);
      throw e;
    }
    this.options.onSong(this.song);
  }

  /** The current song arranged again (its instruments changed), live if it is playing. */
  rearrange(): void {
    this.current = this.arrange(this.song);
    if (this.playing) void this.play();
  }

  /** A new song, playing from its start straight away if one was playing. */
  next(): void {
    this.generate();
    if (this.playing) void this.play((this.player.now() ?? 0) + LEAD * this.current.cps);
  }

  /**
   * Starts the song from its first bar, or while one plays, swaps in the
   * current song: from cycle `from` on the player's clock, or where the
   * last one started (a new arrangement of the same song).
   */
  async play(from?: number): Promise<void> {
    this.options.onError('');
    this.start = startFor(this.playing, from, this.start);
    try {
      await this.player.play(this.current.pattern.late(this.start), this.current.cps);
    } catch (e) {
      this.options.onError(`Strudel: ${(e as Error).message ?? e}`);
    }
  }

  stop(): void {
    this.player.stop();
  }

  /** How many bars into the song the player is: negative before it starts, looping every `cycles`. */
  position(): number {
    const now = this.player.now();
    return now === undefined || now < this.start ? -1 : (now - this.start) % this.current.cycles;
  }

  /**
   * When the song's final chord has played, a new song takes over where
   * the old one would loop, after its second of silence (or at once, if
   * that has passed).
   */
  autoplay(): void {
    const now = this.player.now();
    if (now === undefined || now < this.start + this.song.bars) return;
    const end = this.start + this.current.cycles;
    this.generate();
    void this.play(Math.max(end, now + LEAD * this.current.cps));
  }

  private arrange(song: Song): Arrangement & { song: Song } {
    return { song, ...new Arranger(song, this.options.instruments?.(song)).arrange() };
  }
}
