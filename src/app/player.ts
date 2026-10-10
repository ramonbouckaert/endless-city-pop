// The song's MIDI played on a General MIDI soundfont, in the browser:
// SpessaSynth's synthesizer in an AudioWorklet, and its sequencer.

import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
import { loadSoundfont } from './soundfont';

// iPhones mute Web Audio with the ring/silent switch, as they would a
// game's sound effects; music played by an <audio> element plays on. So
// the page asks for media playback: through Safari's Audio Session API
// (iOS 16.4 on), or on older iPhones and iPads by keeping a silent
// <audio> loop going while a song plays. Called from Play's tap, as iOS
// only starts audio in answer to one. `silence` is the loop, on older
// iPhones and iPads (silentLoop).
function playThroughSilentMode(silence: HTMLAudioElement | undefined): void {
  const session = audioSession();
  if (session) session.type = 'playback';
  else if (silence?.paused) void silence.play().catch(() => {});
}

const audioSession = () => (navigator as Navigator & { audioSession?: { type: string } }).audioSession;

// The silent loop, on iPhones and iPads without the Audio Session API.
function silentLoop(): HTMLAudioElement | undefined {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (audioSession() || !ios) return undefined;
  return Object.assign(new Audio(silentWav()), { loop: true });
}

// A tenth of a second of silence, as a WAV file: 8 kHz, 8-bit, mono.
function silentWav(): string {
  const samples = 800;
  const wav = new DataView(new ArrayBuffer(44 + samples));
  const text = (at: number, s: string) => [...s].forEach((c, i) => wav.setUint8(at + i, c.codePointAt(0) ?? 0));
  text(0, 'RIFF');
  wav.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true); // format chunk size
  wav.setUint16(20, 1, true); // PCM
  wav.setUint16(22, 1, true); // mono
  wav.setUint32(24, 8000, true); // sample rate
  wav.setUint32(28, 8000, true); // bytes a second
  wav.setUint16(32, 1, true); // bytes a sample
  wav.setUint16(34, 8, true); // bits a sample
  text(36, 'data');
  wav.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) wav.setUint8(44 + i, 128); // 8-bit silence is the midpoint
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
}

/**
 * A player for songs as MIDI files. play() starts one from the top (in
 * place of any playing); stop() stops; now() is how many seconds in it
 * is, or undefined when stopped; finished() says whether it has played to
 * the end. `loading` settles once the soundfont is ready.
 */
export interface Player {
  readonly loading: Promise<void>;
  play(midi: Uint8Array): Promise<void>;
  stop(): void;
  now(): number | undefined;
  finished(): boolean;
}

export function createPlayer(): Player {
  const context = new AudioContext();
  const silence = silentLoop();
  // Start loading now; play() waits for it.
  const ready = setUp(context);
  let sequencer: Sequencer | undefined;
  let playing = false;
  return {
    loading: ready.then(() => undefined),
    async play(midi) {
      // Before any await: still in the tap.
      playThroughSilentMode(silence);
      void context.resume();
      const synth = await ready;
      sequencer ??= new Sequencer(synth, { skipToFirstNoteOn: false });
      sequencer.loopCount = 0;
      synth.stopAll(true);
      sequencer.loadNewSongList([{ binary: midi.slice().buffer }]);
      sequencer.play();
      playing = true;
    },
    stop() {
      sequencer?.pause();
      void ready.then((synth) => synth.stopAll());
      silence?.pause();
      playing = false;
    },
    now: () => (playing && sequencer ? sequencer.currentTime : undefined),
    finished: () => !!sequencer?.isFinished,
  };
}

// The synthesizer, its worklet loaded and the soundfont in it.
async function setUp(context: AudioContext): Promise<WorkletSynthesizer> {
  const [font] = await Promise.all([loadSoundfont(), context.audioWorklet.addModule(processorUrl)]);
  const synth = new WorkletSynthesizer(context);
  synth.connect(context.destination);
  await synth.soundBankManager.addSoundBank(font, 'main');
  await synth.isReady;
  return synth;
}
