// Print a generated song's outline.
// Usage: scripts/run-node.sh scripts/generate.ts [seed] [mode]
import { Song, type Mode } from '../src/engine';

const [seed = 'demo', mode] = process.argv.slice(2);
const song = Song.generate({ seed, mode: mode as Mode | undefined });
console.log(JSON.stringify({ title: song.title, ...song.describe() }, null, 1));
