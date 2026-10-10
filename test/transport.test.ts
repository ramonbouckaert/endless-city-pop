import { describe, expect, it } from 'vitest';
import type { Player } from '../src/app/player';
import { TAIL_SECONDS, Transport } from '../src/app/transport';
import { Song } from '../src/engine';

// A player whose clock the test moves.
class FakePlayer implements Player {
  readonly loaded = Promise.resolve();
  playing = false;
  time = 0;
  plays: { midi: Uint8Array; from: number }[] = [];

  play(midi: Uint8Array, from: number): Promise<void> {
    this.plays.push({ midi, from });
    this.playing = true;
    this.time = from;
    return Promise.resolve();
  }
  seek(to: number): void {
    this.time = to;
  }
  stop(): void {
    this.playing = false;
  }
}

function setUp() {
  const player = new FakePlayer();
  let changes = 0;
  const transport = new Transport(player, () => changes++, Song.generate('transport'));
  return { player, transport, changes: () => changes };
}

describe('transport', () => {
  it('plays from the start, and is done a moment after the final chord', async () => {
    const { player, transport, changes } = setUp();
    expect(transport.playing).toBe(false);
    expect(transport.time).toBe(0);
    await transport.play();
    expect(player.plays).toEqual([{ midi: transport.midi, from: 0 }]);
    expect(changes()).toBe(1);
    player.time = transport.length;
    expect(transport.done).toBe(false); // the final chord is over: the silence to come
    player.time = transport.length + TAIL_SECONDS;
    expect(transport.done).toBe(true);
    transport.stop();
    expect(transport.done).toBe(false);
    expect(transport.time).toBe(0);
  });

  it('seeks within the song: stopped, to where it starts; playing, at once', async () => {
    const { player, transport } = setUp();
    transport.seek(30);
    expect(player.playing).toBe(false);
    expect(transport.time).toBe(30);
    await transport.play();
    expect(player.plays.at(-1)?.from).toBe(30);
    transport.seek(10);
    expect(player.time).toBe(10);
    transport.seek(-5);
    expect(player.time).toBe(0);
    transport.seek(transport.length + 60);
    expect(player.time).toBe(transport.length);
    // Played from a seek once, a song plays from its start again.
    transport.stop();
    expect(transport.time).toBe(0);
    await transport.play();
    expect(player.plays.at(-1)?.from).toBe(0);
  });

  it('moves on to a new song, playing it only if one was playing', async () => {
    const { player, transport } = setUp();
    const first = transport.song;
    transport.seek(20);
    await transport.next();
    expect(transport.song).not.toBe(first);
    expect(transport.time).toBe(0);
    expect(player.plays).toEqual([]);
    await transport.play();
    player.time = 50;
    const second = transport.song;
    await transport.next();
    expect(transport.song).not.toBe(second);
    expect(player.plays.at(-1)).toEqual({ midi: transport.midi, from: 0 });
    expect(transport.time).toBe(0);
  });
  it('pauses where the song is, and plays on from there', async () => {
    const { player, transport } = setUp();
    transport.pause(); // stopped: nothing to pause
    expect(transport.time).toBe(0);
    await transport.play();
    player.time = 42;
    transport.pause();
    expect(transport.playing).toBe(false);
    expect(transport.time).toBe(42);
    await transport.play();
    expect(player.plays.at(-1)?.from).toBe(42);
    // Paused in the silence after the final chord: held at the end.
    player.time = transport.length + 0.5;
    transport.pause();
    expect(transport.time).toBe(transport.length);
  });
});
