// The song's MIDI played on a General MIDI soundfont, in the browser:
// SpessaSynth's synthesizer in an AudioWorklet, and its sequencer.

import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
import { loadSoundfont } from './soundfont';

// iPhones mute Web Audio with the ring/silent switch, as they would a
// game's sound effects, unless the page asks for media playback through
// Safari's Audio Session API (iOS 16.4 on). Asked from Play's tap, as iOS
// only starts audio in answer to one, and given back when the song stops.
const audioSession = () => (navigator as Navigator & { audioSession?: { type: string } }).audioSession;

function claimMediaPlayback(): void {
  const session = audioSession();
  if (session) session.type = 'playback';
}

function releaseMediaPlayback(): void {
  const session = audioSession();
  if (session) session.type = 'auto';
}

/** What plays a song: its MIDI file, from a time, until stopped. */
export interface Player {
  /** Settles once the soundfont is in (play() waits for it). */
  readonly loaded: Promise<void>;
  readonly playing: boolean;
  /** How many seconds into the song playing it is (while playing). */
  readonly time: number;
  /** Plays a MIDI file from `from` seconds in, in place of any playing. */
  play(midi: Uint8Array, from: number): Promise<void>;
  /** Moves the song playing to `to` seconds in. */
  seek(to: number): void;
  stop(): void;
}

// The synthesizer, and the sequencer that plays MIDI files on it.
interface Engine {
  synth: WorkletSynthesizer;
  sequencer: Sequencer;
}

/**
 * Songs played by SpessaSynth's synthesizer and sequencer. A song's time
 * is kept on the audio clock: the sequencer's own runs stale for a
 * moment after a song loads, and a song's tempo never changes. After a
 * song's last note the clock runs on into the silence after it.
 */
export class SynthPlayer implements Player {
  readonly loaded: Promise<void>;
  private readonly context = new AudioContext();
  private readonly engine: Promise<Engine>;
  private _playing = false;
  // When the song playing was at 0 s, on the audio clock.
  private startedAt = 0;
  // A seek waiting for the song to load (the sequencer can't place one
  // before it has): made, at wherever the clock has got to, once it has.
  private pending = false;

  constructor() {
    // Loading starts now; play() waits for it.
    this.engine = this.setUp();
    this.loaded = this.engine.then(() => undefined);
  }

  get playing(): boolean {
    return this._playing;
  }

  get time(): number {
    return this.context.currentTime - this.startedAt;
  }

  async play(midi: Uint8Array, from: number): Promise<void> {
    // Before any await: still in the tap.
    claimMediaPlayback();
    void this.context.resume();
    const { synth, sequencer } = await this.engine;
    synth.stopAll(true);
    sequencer.loadNewSongList([{ binary: midi.slice().buffer }]);
    sequencer.play();
    this._playing = true;
    this.startedAt = this.context.currentTime - from;
    this.pending = from > 0;
  }

  seek(to: number): void {
    if (!this._playing) return;
    // The clock moves at once; the sequencer as soon as it can.
    this.startedAt = this.context.currentTime - Math.max(to, 0);
    void this.engine.then(({ sequencer }) => {
      if (sequencer.midiData) this.place(this.time);
      else this.pending = true;
    });
  }

  stop(): void {
    this._playing = false;
    this.pending = false;
    releaseMediaPlayback();
    void this.engine.then(({ synth, sequencer }) => {
      sequencer.pause();
      synth.stopAll();
    });
  }

  // Puts the sequencer at a time in the loaded song: past its last event
  // (where the sequencer would go back to the start), stopped there, as
  // the song is over; before it, playing on from there, though it had
  // finished.
  private place(to: number): void {
    void this.engine.then(({ synth, sequencer }) => {
      if (to >= sequencer.duration) {
        sequencer.pause();
        synth.stopAll();
        return;
      }
      // The sequencer plays every event up to there (programs, controllers).
      sequencer.currentTime = to;
      if (sequencer.paused) sequencer.play();
    });
  }

  // The synthesizer, its worklet loaded and the soundfont in it, and its
  // sequencer, which makes a waiting seek once a song has loaded.
  private async setUp(): Promise<Engine> {
    const { context } = this;
    const [font] = await Promise.all([loadSoundfont(), context.audioWorklet.addModule(processorUrl)]);
    const synth = new WorkletSynthesizer(context);
    synth.connect(context.destination);
    await synth.soundBankManager.addSoundBank(font, 'main');
    await synth.isReady;
    const sequencer = new Sequencer(synth, { skipToFirstNoteOn: false });
    sequencer.loopCount = 0;
    sequencer.eventHandler.addEvent('songChange', 'pending-seek', () => {
      if (!this.pending || !this._playing) return;
      this.pending = false;
      this.place(this.time);
    });
    return { synth, sequencer };
  }
}
