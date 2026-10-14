// Generate many songs and check each one's score and MIDI file: every
// note playable (a pitch MIDI has; on the drum kit, a drum the band
// plays; on the bass, not below its lowest note), its time and length
// real numbers inside the song, and every section playing something.
// Then a tally of how many songs had each of the features below, so a
// sweep shows every one of them turning up.
// Usage: scripts/run-node.sh scripts/sweep.ts [count]
import { songToMidi } from '../src/midi/from-score';
import {
  Chorus,
  Finale,
  Intro,
  Lift,
  Link,
  Outro,
  PreChorus,
  ScoreArranger,
  ShortBar,
  SoloSection,
  Song,
  Swell,
  Verse,
  type AnySection,
} from '../src/engine';
import { PERCUSSION, programName } from '../src/lib/general-midi';
import { Chord } from '../src/theory';

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
      n.path === 'bass' && n.note < Chord.BASS_LOW && `${where}: bass note ${n.note} below ${Chord.BASS_LOW}`,
      !(Number.isFinite(n.gain * n.velocity * n.postgain) && n.gain > 0) && `${where}: bad level`,
    ].filter((p): p is string => !!p);
  });
  song.form.sections.forEach((sec, i) => {
    const start = song.form.starts[i];
    if (!notes.some((n) => n.time >= start && n.time < start + sec.bars)) found.push(`${sec.kind.label} plays nothing`);
  });
  if (songToMidi(song).length < 100) found.push('MIDI file too short');
  return [...new Set(found)];
}

// What a song has that a sweep tallies: its features, by name.
function features(song: Song): string[] {
  return [...endsOf(song), ...formOf(song), ...partsOf(song), ...traitsOf(song)].filter(
    (f): f is string => typeof f === 'string',
  );
}

// How it opens and ends. (Each list holds a feature's name, or something falsy if the song lacks it.)
function endsOf(song: Song): unknown[] {
  const { form } = song;
  const finale = form.first(Finale)?.material;
  const outro = form.first(Outro);
  return [
    !form.first(Intro) && 'no intro',
    form.first(Intro)?.free && 'free intro',
    form.first(Swell) && 'swell intro',
    form.ofType(Intro).some((i) => i.extended) && 'odd intro',
    // (A finale on unison is the riff ending.)
    form.fadeFrom === undefined ? `finale on ${finale?.ends}` : 'fade',
    song.part(Chorus) && song.lastPlayed instanceof Verse && 'verse ending',
    form.sections.some((s) => s.bare) && 'bare start',
    outro && `outro ${outro.variant}`,
    finale?.eases && 'easing finale',
    finale?.variant === 'neapolitan' && 'neapolitan finale',
  ];
}

// Its form.
function formOf(song: Song): unknown[] {
  const { form } = song;
  const secs: readonly AnySection[] = form.sections;
  const chorus = song.part(Chorus);
  return [
    !chorus && 'no chorus',
    !form.first(Verse) && 'no verses',
    song.rounds.some((s) => s instanceof Lift) && 'chorus re-entry',
    song.chorusTwice && 'chorus twice',
    form.ofType(PreChorus).some((p) => p.bars === 16) && '16-bar pre',
    form.ofType(Chorus).some((c) => c.half) && 'half chorus',
    chorus && chorus.key.mode !== song.key.mode && 'relative-major chorus',
    secs.some((s) => s instanceof ShortBar && s.beats === 2) && '2/4 bar',
    secs.some((s) => s instanceof ShortBar && s.beats === 1) && '1/4 bar',
    secs.some((s) => s instanceof Link) && 'link',
    secs.some((s) => s.stop) && 'stop',
  ];
}

// What its sections play.
function partsOf(song: Song): unknown[] {
  const { form } = song;
  const secs: readonly AnySection[] = form.sections;
  const bars = secs.flatMap((s) => ('bars' in s.material ? s.material.bars.flat() : []));
  const walks = secs.flatMap((s) => ('bass' in s.material && s.material.bass.feel === 'walk' ? [s.material.bass] : []));
  return [
    bars.some((c) => c.bass !== undefined) && 'slash chords',
    ...form.ofType(SoloSection).map((s) => `solo over ${s.material.over}`),
    ...form.ofType(Verse).map((v) => `${v.material.variant} verse`),
    walks.length > 0 && 'walking bass',
    walks.some((bass) => bass.bars[0][0]?.len === 2) && 'walking eighths',
  ];
}

// What it does throughout, and how far it leans towards a ballad.
function traitsOf(song: Song): unknown[] {
  const { traits } = song;
  return [
    `${traits.colour} chords`,
    traits.lock && 'kick on the bass',
    traits.ostinato && 'signature guitar',
    traits.ritard && 'easing back',
    traits.paired && 'two chords a bar',
    song.swingUnit === 8 && 'eighths swing',
    song.instruments.kit.name === 'Brush' && 'brushes',
    song.form.sections.some((s) => 'drums' in s.material && s.material.drums.feel === 'ballad') && 'ballad grooves',
  ];
}

let failures = 0;
const tally = new Map<string, number>();
for (let i = 0; i < count; i++) {
  const seed = `sweep${i}`;
  let found: string[];
  try {
    const song = Song.generate(seed);
    for (const f of new Set(features(song))) tally.set(f, (tally.get(f) ?? 0) + 1);
    found = problems(song);
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
console.log(
  [...tally]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, n]) => `${f}: ${n}`)
    .join(', '),
);
console.log(`${failures} of ${count} songs had problems`);
