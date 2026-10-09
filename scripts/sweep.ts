// Generate many songs and check each one plays without errors.
// Usage: scripts/run-node.sh scripts/sweep.ts [count] [mode]
import { Song, type Mode } from '../src/engine';
// The engine's index leaves out Arranger, so it loads no Strudel.
// noinspection ES6PreferShortImport
import { Arranger } from '../src/engine/arranger';
import { checkPattern } from './checker.ts';

const count = Number(process.argv[2] ?? 100);
const mode = process.argv[3] as Mode | undefined;
let failures = 0;
for (let i = 0; i < count; i++) {
  const seed = `sweep${i}`;
  let problems: string[];
  try {
    const song = Song.generate({ seed, mode });
    ({ problems } = checkPattern(new Arranger(song).pattern().pattern, song.bars));
  } catch (e) {
    problems = [
      String((e as Error).stack ?? e)
        .split('\n')
        .slice(0, 3)
        .join(' | '),
    ];
  }
  if (problems.length) {
    failures++;
    console.log(`${seed}: ${problems.slice(0, 4).join('; ')}`);
  }
}
console.log(`${failures} of ${count} songs had problems`);
