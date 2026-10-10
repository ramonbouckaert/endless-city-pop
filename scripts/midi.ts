// Write a song as a MIDI file.
// Usage: scripts/run-node.sh scripts/midi.ts [seed] [out.mid]
import { writeFileSync } from 'node:fs';
import { Song } from '../src/engine';
// The engine's index leaves out Arranger, so it loads no Strudel.
// noinspection ES6PreferShortImport
import { Arranger } from '../src/engine/arranger';
import { songToMidi } from '../src/engine/midi-song';

const [seed = 'demo', out = `${seed}.mid`] = process.argv.slice(2);
const song = Song.generate(seed);
const bytes = songToMidi(song, new Arranger(song).pattern().pattern);
writeFileSync(out, bytes);
console.log(`${song.title}, ${song.key.name}, ${song.bars} bars: ${out} (${bytes.length} bytes)`);
