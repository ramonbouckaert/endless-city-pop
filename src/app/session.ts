// The song playing (or ready to): generating songs, writing each as a
// MIDI file, and playing them one after another.

import { randomSeed } from '../lib/random';
import { songToMidi } from '../midi/from-score';
import { Song } from '../model';
import type { Player } from './player';
import { bars, seconds } from './time';

// Seconds of silence after a song's final chord before the next starts.
const TAIL_SECONDS = 1;

export interface SessionOptions {
  /** A new song is ready. */
  onSong(song: Song): void;
  /** Something went wrong (empty: nothing has). */
  onError(message: string): void;
}

// A song, and the MIDI file it plays as.
interface Written {
  song: Song;
  midi: Uint8Array;
}

export class Session {
  private written: Written | undefined;
  // When the current song's final chord was first heard to be over, by
  // the page's clock (ms): the next song follows TAIL_SECONDS later.
  private endedAt: number | undefined;

  constructor(
    private readonly player: Player,
    private readonly options: SessionOptions,
  ) {}

  // The current song: there is one once generate() has run.
  private get current(): Written {
    if (!this.written) throw new Error('No song yet: generate() one first');
    return this.written;
  }

  get song(): Song {
    return this.current.song;
  }

  /** The current song as a MIDI file: what plays, and what Export as MIDI saves. */
  get midi(): Uint8Array {
    return this.current.midi;
  }

  get playing(): boolean {
    return this.player.now() !== undefined;
  }

  /** A new song from a random seed, its key, mode and tempo left to the seed. */
  generate(): void {
    try {
      const song = Song.generate(randomSeed());
      this.written = { song, midi: songToMidi(song) };
      this.endedAt = undefined;
    } catch (e) {
      this.options.onError(`Could not generate a song: ${(e as Error).message}`);
      throw e;
    }
    this.options.onSong(this.song);
  }

  /** A new song, playing from its start straight away if one was playing. */
  next(): void {
    const wasPlaying = this.playing;
    this.generate();
    if (wasPlaying) void this.play();
  }

  /** Plays the current song from its start. */
  async play(): Promise<void> {
    this.options.onError('');
    this.endedAt = undefined;
    try {
      await this.player.play(this.midi);
    } catch (e) {
      this.options.onError(`Could not play: ${(e as Error).message ?? e}`);
    }
  }

  stop(): void {
    this.player.stop();
  }

  /** How many bars into the song the player is: negative when stopped. */
  position(): number {
    const now = this.player.now();
    return now === undefined ? -1 : bars(now, this.song.bpm);
  }

  /** Whether the song has played out: its final chord, and a second's silence after it. */
  done(): boolean {
    const now = this.player.now();
    if (now === undefined) return false;
    const over = this.player.finished() || now >= seconds(this.song.bars, this.song.bpm);
    if (!over) return false;
    this.endedAt ??= performance.now();
    return performance.now() - this.endedAt >= TAIL_SECONDS * 1000;
  }

  /** A new song, played from its start. */
  playNext(): void {
    this.generate();
    void this.play();
  }
}
