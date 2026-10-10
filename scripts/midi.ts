// Write a song as a MIDI file.
// Usage: scripts/run-node.sh scripts/midi.ts [seed] [out.mid]
import { writeFileSync } from 'node:fs';
import { songToMidi } from '../src/midi/from-pattern';
import { Song } from '../src/model';
import { Arranger } from '../src/render';

const [seed = 'demo', out = `${seed}.mid`] = process.argv.slice(2);
const song = Song.generate(seed);
const bytes = songToMidi(song, new Arranger(song).arrange().pattern);
writeFileSync(out, bytes);
console.log(`${song.title}, ${song.key.name}, ${song.bars} bars: ${out} (${bytes.length} bytes)`);
