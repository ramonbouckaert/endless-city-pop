import { readFileSync } from 'node:fs';
import { SoundBankLoader, SpessaLog, SpessaSynthProcessor } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';
import { PERCUSSION, programName } from '../src/lib/general-midi';
import { SOUNDFONT_KITS, SOUNDFONT_PROGRAMS } from '../src/style';

// The soundfont the app plays (scripts/build-soundfont.ts builds it).
const PATH = 'src/app/soundfont/GeneralUser-GS-city-pop.sf3';

describe('soundfont', () => {
  it('plays every instrument a song can, and every drum on every kit', async () => {
    SpessaLog.warnEnabled = false;
    const file = readFileSync(PATH);
    const bank = SoundBankLoader.fromArrayBuffer(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    const synth = new SpessaSynthProcessor(44100, { effectsEnabled: false, maxBufferSize: 128 });
    await synth.processorInitialized;
    synth.soundBankManager.addSoundBank(bank, 'main');
    // Whether a note on a channel makes a sound in its first tenth of a second.
    const left = new Float32Array(128);
    const right = new Float32Array(128);
    const sounds = (channel: number, note: number) => {
      synth.stopAllChannels(true);
      synth.noteOn(channel, note, 100);
      let peak = 0;
      for (let block = 0; block < 35; block++) {
        left.fill(0);
        right.fill(0);
        synth.process(left, right, 0, 128);
        for (let i = 0; i < 128; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
      }
      synth.noteOff(channel, note);
      return peak > 1e-4;
    };
    // A missing instrument still sounds (the synth falls back on another
    // preset), so each needs its own; a drum a kit lacks is silent.
    const presets = synth.soundBankManager.presetList;
    const has = (program: number, drums: boolean) =>
      presets.some((p) => p.program === program && p.isGMGSDrum === drums && (drums || p.bankMSB === 0));
    const missing: string[] = [];
    for (const program of SOUNDFONT_PROGRAMS) if (!has(program, false)) missing.push(programName(program));
    for (const kit of SOUNDFONT_KITS) {
      if (!has(kit, true)) missing.push(`drum kit ${kit}`);
      synth.programChange(9, kit);
      for (const drum of Object.values(PERCUSSION)) if (!sounds(9, drum)) missing.push(`drum ${drum} on kit ${kit}`);
    }
    expect(missing, 'missing from the soundfont: run npm run soundfont').toEqual([]);
  });
});
