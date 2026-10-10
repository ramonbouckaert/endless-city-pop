// The browser's media controls (lock screen, notification, media keys
// and headset buttons): what is playing, how far through it is, and what
// the controls do.

import type { Song } from '../engine';
import { seconds } from './time';

/** What the media controls do: the page's own actions. */
export interface Controls {
  play(): void;
  /** Stops where the song is, for play() to carry on from. */
  pause(): void;
  stop(): void;
  next(): void;
  /** Moves the song to a time, in seconds (stopped, where Play starts). */
  seek(to: number): void;
  /** Where the song is, in seconds. */
  readonly time: number;
}

// How far the skip buttons move when the browser doesn't say.
const SKIP_SECONDS = 10;
// How far the browser's own reckoning of the position may drift before it
// is told again (a seek moves it much further).
const DRIFT_SECONDS = 0.25;

// What the browser was last told.
interface Told {
  song: Song;
  playing: boolean;
  time: number;
  at: number; // when, by performance.now()
}

export class MediaControls {
  private readonly session = navigator.mediaSession;
  private told: Told;

  constructor(controls: Controls, song: Song) {
    this.handle('play', () => controls.play());
    this.handle('pause', () => controls.pause());
    this.handle('stop', () => controls.stop());
    // A new song; there's no going back to one.
    this.handle('nexttrack', () => controls.next());
    // Dragging the progress bar, and the skip buttons.
    this.handle('seekto', ({ seekTime }) => {
      if (seekTime !== undefined) controls.seek(seekTime);
    });
    this.handle('seekforward', ({ seekOffset }) => controls.seek(controls.time + (seekOffset ?? SKIP_SECONDS)));
    this.handle('seekbackward', ({ seekOffset }) => controls.seek(controls.time - (seekOffset ?? SKIP_SECONDS)));
    this.told = { song, playing: false, time: 0, at: performance.now() };
    this.tell(this.told, true);
  }

  /**
   * The song, whether it plays and where it is (seconds; stopped, where
   * Play starts). Call as often as it may have changed: the browser is
   * told only what has, and the position only when it has moved from
   * where the browser reckons it is (it moves it on by itself).
   */
  update(song: Song, playing: boolean, time: number): void {
    const last = this.told;
    const now = performance.now();
    const reckoned = last.time + (last.playing ? (now - last.at) / 1000 : 0);
    const newSong = song !== last.song;
    if (!newSong && playing === last.playing && Math.abs(time - reckoned) < DRIFT_SECONDS) return;
    this.told = { song, playing, time, at: now };
    this.tell(this.told, newSong);
  }

  // Tells the browser a state: its song (if new), whether it plays, and where it is.
  private tell({ song, playing, time }: Told, newSong: boolean): void {
    const { session } = this;
    if (newSong) {
      session.metadata = new MediaMetadata({
        title: song.title,
        artist: 'Endless City Pop',
        artwork: [{ src: new URL('favicon.svg', document.baseURI).href, sizes: 'any', type: 'image/svg+xml' }],
      });
    }
    session.playbackState = playing ? 'playing' : 'paused';
    const duration = seconds(song.bars, song.bpm);
    try {
      // Held at the end through the silence after the final chord.
      session.setPositionState({ duration, position: Math.min(Math.max(time, 0), duration), playbackRate: 1 });
    } catch {
      // A browser that can't show a position still shows the rest.
    }
  }

  // An action's handler, where the browser supports the action (it throws where it doesn't).
  private handle(action: MediaSessionAction, handler: MediaSessionActionHandler): void {
    try {
      this.session.setActionHandler(action, handler);
    } catch {
      // Not supported here.
    }
  }
}
