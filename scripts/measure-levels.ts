// Measures how loud each instrument a song can pick plays on the
// soundfont, for SOUND_LEVELS (style/instruments.ts): each plays the same
// phrase at full velocity, rendered offline and dry (basses two
// octaves down, in short notes as a bass line plays them, so a slap's
// quick decay doesn't count against it), and its level is the alto sax's
// loudness over its own, kept within 0.5 to 2. Loudness is the RMS of
// the K-weighted signal (ITU-R BS.1770), which hears a bright attack
// louder than the same energy low down. Prints the table to paste in.
// Usage: scripts/run-node.sh scripts/measure-levels.ts [soundfont.sf3]

import { readFileSync } from 'node:fs';
import { SoundBankLoader, SpessaLog, SpessaSynthProcessor } from 'spessasynth_core';
import { GM, programKey, type Program } from '../src/lib/general-midi';
import { BAND, PICKS, VOICES } from '../src/style';

// The soundfont the app plays, as scripts/build-soundfont.ts builds it.
const path = process.argv[2] ?? 'src/app/soundfont/GeneralUser-GS-city-pop.sf3';
const file = readFileSync(path);
const bank = SoundBankLoader.fromArrayBuffer(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

const SAMPLE_RATE = 44100;
const BLOCK = 128;
const BEAT = 0.5; // seconds: a quarter note at 120 BPM
// Up and down an octave of C major from middle C, in quarter notes.
const PHRASE = [60, 64, 67, 72, 67, 64, 60, 62];
const REFERENCE = GM.altoSax;
// As loud as a song's MIDI plays each track's loudest notes (midi/from-score.ts:
// the track's volume sets its level), which matters to sounds whose
// samples change with velocity, such as a slap's pop.
const VELOCITY = 127;
// A bass holds each note for this share of its beat, in eighth notes.
const BASS_HOLD = 0.4;
const BASSES = new Set<Program>([...PICKS.bass, BAND.bass]);

// One synth for every sound, dry (effects off). Its warnings (no preset
// before the bank is in) are only noise here.
SpessaLog.warnEnabled = false;
const synth = new SpessaSynthProcessor(SAMPLE_RATE, { effectsEnabled: false, maxBufferSize: BLOCK });
await synth.processorInitialized;
synth.soundBankManager.addSoundBank(bank, 'main');

// A biquad filter (RBJ's cookbook), run over one channel a block at a time.
class Biquad {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private readonly b: readonly number[],
    private readonly a: readonly number[],
  ) {}

  // BS.1770's K-weighting: a high shelf of +4 dB from 1.5 kHz, then a high pass at 38 Hz.
  static kWeighting(): Biquad[] {
    const w = (f: number) => (2 * Math.PI * f) / SAMPLE_RATE;
    const shelfW = w(1500);
    const A = 10 ** (4 / 40);
    const sa = (Math.sin(shelfW) / 2) * Math.SQRT2; // Q = 1/√2
    const c = Math.cos(shelfW);
    const r = 2 * Math.sqrt(A) * sa;
    const shelf = new Biquad(
      [A * (A + 1 + (A - 1) * c + r), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - r)],
      [A + 1 - (A - 1) * c + r, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - r],
    );
    const passW = w(38);
    const pa = Math.sin(passW); // Q = 0.5
    const pc = Math.cos(passW);
    const pass = new Biquad([(1 + pc) / 2, -(1 + pc), (1 + pc) / 2], [1 + pa, -2 * pc, 1 - pa]);
    return [shelf, pass];
  }

  process(samples: Float32Array): void {
    const [b0, b1, b2] = this.b.map((v) => v / this.a[0]);
    const [, a1, a2] = this.a.map((v) => v / this.a[0]);
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i];
      const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;
      samples[i] = y;
    }
  }
}

// The K-weighted RMS of an instrument playing the phrase.
function loudness(program: Program): number {
  synth.stopAllChannels(true);
  synth.programChange(0, program);
  const bass = BASSES.has(program);
  const shift = bass ? -24 : 0;
  const filters = [Biquad.kWeighting(), Biquad.kWeighting()];
  const left = new Float32Array(BLOCK);
  const right = new Float32Array(BLOCK);
  let sum = 0;
  let count = 0;
  const render = (seconds: number) => {
    for (let b = Math.round((seconds * SAMPLE_RATE) / BLOCK); b > 0; b--) {
      left.fill(0);
      right.fill(0);
      synth.process(left, right, 0, BLOCK);
      for (const [i, channel] of [left, right].entries()) for (const f of filters[i]) f.process(channel);
      for (let i = 0; i < BLOCK; i++) sum += left[i] ** 2 + right[i] ** 2;
      count += 2 * BLOCK;
    }
  };
  // Each note held for its beat (a bass's: part of an eighth), then a beat for the last to ring out.
  const step = bass ? BEAT / 2 : BEAT;
  const held = bass ? step * BASS_HOLD : step;
  for (const note of PHRASE) {
    synth.noteOn(0, note + shift, VELOCITY);
    render(held);
    synth.noteOff(0, note + shift);
    render(step - held);
  }
  render(BEAT);
  return Math.sqrt(sum / count);
}

const programs = [...new Set([...Object.values(BAND), ...Object.values(PICKS).flat(), ...VOICES.pool])].sort(
  (a, b) => a - b,
);
const reference = loudness(REFERENCE);
const lines: string[] = [];
for (const program of programs) {
  const rms = loudness(program);
  const measured = rms ? reference / rms : 2;
  const kept = Math.min(2, Math.max(0.5, measured));
  const note = kept === measured ? '' : ` // measured ${measured.toFixed(2)}`;
  const level = Math.round(kept * 100) / 100;
  lines.push(`  [GM.${programKey(program)}]: ${level},${note}`);
}
console.log(lines.join('\n'));
