// Builds the soundfont the app plays: GeneralUser GS, trimmed to the
// instruments and drum kits a song can play (SOUNDFONT_PROGRAMS and
// SOUNDFONT_KITS in style/instruments.ts; on the kits, only the drums the
// band plays) and compressed to SF3 (Ogg Vorbis samples). Run it again
// after changing what a song can play: test/soundfont.test.ts fails until
// you do.
// Usage: scripts/run-node.sh scripts/build-soundfont.ts [--quality 4] [GeneralUser-GS.sf2]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SoundBankLoader, SpessaLog, type BasicPreset } from 'spessasynth_core';
import { createOggEncoder } from 'wasm-media-encoders';
import { PERCUSSION, programName, type Program } from '../src/lib/general-midi';
import { SOUNDFONT_KITS, SOUNDFONT_PROGRAMS } from '../src/style';

// GeneralUser GS v2.0.3, at the commit this was built from. Downloaded
// once to node_modules' cache, not linked from the app (its author asks
// sites to serve their own copy).
const SOURCE_URL =
  'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/684543d5e5efaef08d02be50dcda8d552478fa60/GeneralUser-GS.sf2';
const CACHED = 'node_modules/.cache/soundfonts/GeneralUser-GS-2.0.3.sf2';
const OUTPUT = 'src/app/soundfont/GeneralUser-GS-city-pop.sf3';

const args = process.argv.slice(2);
const at = args.indexOf('--quality');
// Vorbis quality, 0 (smallest) to 10: 4 is about 4 MB, and no quieter than 2% on any sound.
const quality = at >= 0 ? Number(args.splice(at, 2)[1]) : 4;
const input = args[0] ?? CACHED;

SpessaLog.warnEnabled = false;
SpessaLog.infoEnabled = false;

if (input === CACHED && !existsSync(CACHED)) {
  console.log(`Downloading GeneralUser GS to ${CACHED}…`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Could not download GeneralUser GS: ${response.status}`);
  mkdirSync(dirname(CACHED), { recursive: true });
  writeFileSync(CACHED, new Uint8Array(await response.arrayBuffer()));
}

const file = readFileSync(input);
const bank = SoundBankLoader.fromArrayBuffer(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

// Every key, at every velocity; on a drum kit, the band's drums.
const VELOCITIES = new Set(Array.from({ length: 127 }, (_, i) => i + 1));
const KEYS = Array.from({ length: 128 }, (_, key) => key);
const DRUMS: readonly number[] = Object.values(PERCUSSION);
const playing = (keys: readonly number[]) => new Map(keys.map((key) => [key, VELOCITIES]));

const keep = new Map<BasicPreset, Map<number, Set<number>>>();
const found = new Set<number>();
const kitsFound = new Set<number>();
for (const preset of bank.presets) {
  if (preset.isGMGSDrum && SOUNDFONT_KITS.has(preset.program)) {
    keep.set(preset, playing(DRUMS));
    kitsFound.add(preset.program);
  } else if (!preset.isGMGSDrum && preset.bankMSB === 0 && preset.bankLSB === 0) {
    if (!SOUNDFONT_PROGRAMS.has(preset.program as Program)) continue;
    keep.set(preset, playing(KEYS));
    found.add(preset.program);
  }
}
const missing = [
  ...[...SOUNDFONT_PROGRAMS].filter((p) => !found.has(p)).map(programName),
  ...[...SOUNDFONT_KITS].filter((k) => !kitsFound.has(k)).map((k) => `drum kit ${k}`),
];
if (missing.length) throw new Error(`Not in ${input}: ${missing.join(', ')}`);

const before = bank.samples.length;
bank.trim(keep);
console.log(`Kept ${keep.size} presets and ${bank.samples.length} of ${before} samples.`);

const encoder = await createOggEncoder();
await bank.setSampleFormat({
  format: 'compressed',
  compressionFunction: (data, sampleRate) => {
    encoder.configure({ channels: 1, sampleRate, vbrQuality: quality });
    // The encoder reuses its buffers: copy each out before the next call.
    const body = encoder.encode([data]).slice();
    const tail = encoder.finalize();
    const ogg = new Uint8Array(body.length + tail.length);
    ogg.set(body);
    ogg.set(tail, body.length);
    return Promise.resolve(ogg);
  },
});

const sf3 = bank.writeSF2({ software: 'endless-city-pop scripts/build-soundfont.ts' });
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, new Uint8Array(sf3));
console.log(`Wrote ${OUTPUT}: ${(sf3.byteLength / 1e6).toFixed(1)} MB (Vorbis quality ${quality}).`);
