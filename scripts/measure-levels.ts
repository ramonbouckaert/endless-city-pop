// Measures how loud each instrument a song can pick plays on the
// soundfont, for SOUND_LEVELS (style/instruments.ts): each plays the same
// phrase at the same velocity (basses two octaves down), rendered offline
// and dry, and its level is the alto sax's loudness (RMS) over its own,
// kept within 0.5 to 2. Prints the table to paste in.
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
const BASSES = new Set<Program>([...PICKS.bass, BAND.bass]);

// One synth for every sound, dry (effects off). Its warnings (no preset
// before the bank is in) are only noise here.
SpessaLog.warnEnabled = false;
const synth = new SpessaSynthProcessor(SAMPLE_RATE, { effectsEnabled: false, maxBufferSize: BLOCK });
await synth.processorInitialized;
synth.soundBankManager.addSoundBank(bank, 'main');

// The RMS of an instrument playing the phrase.
function loudness(program: Program): number {
  synth.stopAllChannels(true);
  synth.programChange(0, program);
  const shift = BASSES.has(program) ? -24 : 0;
  const blocksPerBeat = Math.round((BEAT * SAMPLE_RATE) / BLOCK);
  const left = new Float32Array(BLOCK);
  const right = new Float32Array(BLOCK);
  let sum = 0;
  let count = 0;
  // Each note held for its beat, then a beat for the last to ring out.
  for (const note of [...PHRASE, undefined]) {
    if (note !== undefined) synth.noteOn(0, note + shift, 100);
    for (let b = 0; b < blocksPerBeat; b++) {
      left.fill(0);
      right.fill(0);
      synth.process(left, right, 0, BLOCK);
      for (let i = 0; i < BLOCK; i++) sum += left[i] ** 2 + right[i] ** 2;
      count += 2 * BLOCK;
    }
    if (note !== undefined) synth.noteOff(0, note + shift);
  }
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
