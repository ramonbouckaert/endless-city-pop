// Print a generated song's Strudel code.
// Usage: scripts/run-node.sh scripts/generate.mjs [seed] [style]
import { generateSong } from '../src/engine/generate.js';

const [seed = 'demo', style = 'jazzfunk'] = process.argv.slice(2);
process.stdout.write(generateSong({ seed, style }).code);
