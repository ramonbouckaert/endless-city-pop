// Generate many songs and check each one's score and MIDI file: every
// note playable (a pitch MIDI has; on the drum kit, a drum the band
// plays), its time and length real numbers inside the song, and every
// section playing something.
// Usage: scripts/run-node.sh scripts/sweep.ts [count]
import { songToMidi } from '../src/midi/from-score';
import { ScoreArranger, Song } from '../src/engine';
import { PERCUSSION, programName } from '../src/lib/general-midi';

const count = Number(process.argv[2] ?? 100);
const DRUMS = new Set<number>(Object.values(PERCUSSION));

function problems(song: Song): string[] {
  const { notes, bars } = new ScoreArranger(song).arrange();
  const found = notes.flatMap((n) => {
    const where = `${n.program === 'drums' ? 'drums' : programName(n.program)} at bar ${n.time.toFixed(2)}`;
    return [
      !(Number.isFinite(n.time) && n.time >= 0 && n.time < bars) && `${where}: time outside the song`,
      !(Number.isFinite(n.dur) && n.dur > 0) && `${where}: bad length ${n.dur}`,
      (!Number.isInteger(n.note) || n.note < 0 || n.note > 127) && `${where}: note ${n.note} out of range`,
      n.program === 'drums' && !DRUMS.has(n.note) && `${where}: ${n.note} isn't one of the band's drums`,
      !(Number.isFinite(n.gain * n.velocity * n.postgain) && n.gain > 0) && `${where}: bad level`,
    ].filter((p): p is string => !!p);
  });
  song.form.sections.forEach((sec, i) => {
    const start = song.form.starts[i];
    if (!notes.some((n) => n.time >= start && n.time < start + sec.bars)) found.push(`${sec.type} plays nothing`);
  });
  if (songToMidi(song).length < 100) found.push('MIDI file too short');
  return [...new Set(found)];
}

let failures = 0;
for (let i = 0; i < count; i++) {
  const seed = `sweep${i}`;
  let found: string[];
  try {
    found = problems(Song.generate(seed));
  } catch (e) {
    found = [
      String((e as Error).stack ?? e)
        .split('\n')
        .slice(0, 3)
        .join(' | '),
    ];
  }
  if (found.length) {
    failures++;
    console.log(`${seed}: ${found.slice(0, 4).join('; ')}`);
  }
}
console.log(`${failures} of ${count} songs had problems`);
