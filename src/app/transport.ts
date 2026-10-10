// The song and its playing: the song (written as a MIDI file), whether
// it plays, where it is, and the actions on it. Every change is reported
// through `onChange`, for the page and the media controls to show.

import { randomSeed } from '../lib/random';
import { songToMidi } from '../midi/from-score';
import { Song } from '../engine';
import type { Player } from './player';
import { seconds } from './time';

// Seconds of silence after a song's final chord before the next starts.
export const TAIL_SECONDS = 1;

export class Transport {
  private current: Song;
  private written: Uint8Array;
  // Where play() starts, in seconds: 0, unless a pause or a seek while
  // stopped left it further in.
  private cue = 0;

  /** `song`: the first song (a new one from a random seed unless given). */
  constructor(
    private readonly player: Player,
    private readonly onChange: () => void,
    song: Song = Song.generate(randomSeed()),
  ) {
    this.current = song;
    this.written = songToMidi(song);
  }

  get song(): Song {
    return this.current;
  }

  /** The song as a MIDI file: what plays, and what Export as MIDI saves. */
  get midi(): Uint8Array {
    return this.written;
  }

  get playing(): boolean {
    return this.player.playing;
  }

  /** The song's length in seconds, to its final chord. */
  get length(): number {
    return seconds(this.current.bars, this.current.bpm);
  }

  /** Where the song is, in seconds: how far it has played, or stopped, where play() starts. */
  get time(): number {
    return this.playing ? this.player.time : this.cue;
  }

  /** Whether the song has played out: its final chord, and the silence after it. */
  get done(): boolean {
    return this.playing && this.player.time >= this.length + TAIL_SECONDS;
  }

  /** Plays the song from where it is: its start, or where a pause or a seek while stopped left it. */
  async play(): Promise<void> {
    const from = this.cue;
    this.cue = 0;
    await this.player.play(this.written, from);
    this.onChange();
  }

  stop(): void {
    this.player.stop();
    this.onChange();
  }

  /** Stops the song where it is, for play() to carry on from. */
  pause(): void {
    if (!this.playing) return;
    const at = this.player.time;
    this.player.stop();
    this.cue = Math.min(at, this.length);
    this.onChange();
  }

  /** A new song from a random seed, playing from its start if one was playing. */
  async next(): Promise<void> {
    const playing = this.playing;
    this.current = Song.generate(randomSeed());
    this.written = songToMidi(this.current);
    this.cue = 0;
    if (playing) await this.player.play(this.written, 0);
    this.onChange();
  }

  /** Moves to `to` seconds in, within the song: playing, at once; stopped, where play() starts. */
  seek(to: number): void {
    const at = Math.min(Math.max(to, 0), this.length);
    if (this.playing) this.player.seek(at);
    else this.cue = at;
    this.onChange();
  }
}
