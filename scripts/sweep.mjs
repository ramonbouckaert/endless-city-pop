// Generate many songs and check each one plays without errors.
// Usage: scripts/run-node.sh scripts/sweep.mjs [count]
import { generateSong } from '../src/engine/generate.js';
import { STYLE_NAMES } from '../src/engine/styles.js';
import { checkCode } from './checker.mjs';

const count = Number(process.argv[2] ?? 25);
let failures = 0;
for (const style of STYLE_NAMES) {
  for (let i = 0; i < count; i++) {
    const seed = `sweep${i}`;
    let problems;
    try {
      const { code, song } = generateSong({ seed, style });
      const bars = song.form.reduce((n, s) => n + s.bars, 0);
      ({ problems } = await checkCode(code, bars));
    } catch (e) {
      problems = [
        String(e.stack ?? e)
          .split('\n')
          .slice(0, 3)
          .join(' | '),
      ];
    }
    if (problems.length) {
      failures++;
      console.log(`${style} ${seed}: ${problems.slice(0, 4).join('; ')}`);
    }
  }
}
console.log(`${failures} of ${count * STYLE_NAMES.length} songs had problems`);
process.exitCode = failures ? 1 : 0;
