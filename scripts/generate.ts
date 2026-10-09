// Print a generated song's outline.
// Usage: scripts/run-node.sh scripts/generate.ts [seed]
import { Song } from '../src/engine';

const [seed = 'demo'] = process.argv.slice(2);
const song = Song.generate({ seed });
console.log(JSON.stringify({ title: song.title, ...song.describe() }, null, 1));
