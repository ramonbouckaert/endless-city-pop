// Generate many songs and check each one's score and MIDI file: every
// note playable (a pitch MIDI has; on the drum kit, a drum the band
// plays; on the bass, not below its lowest note), its time and length
// real numbers inside the song, and every section playing something.
// Then a tally of how many songs had each of the features below, so a
// sweep shows every one of them turning up.
// Usage: scripts/run-node.sh scripts/sweep.ts [count]
import { songToMidi } from '../src/midi/from-score';
import {
  Bridge,
  Chorus,
  Finale,
  Intro,
  Lift,
  Link,
  Outro,
  PreChorus,
  ScoreArranger,
  type Score,
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

function problems(song: Song, { notes, bars }: Score): string[] {
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
function features(song: Song, { notes }: Score): string[] {
  return [
    ...endsOf(song),
    ...formOf(song),
    ...joinsOf(song),
    ...partsOf(song),
    ...traitsOf(song),
    ...soundsOf(song, notes),
  ].filter((f): f is string => typeof f === 'string');
}

// How it opens and ends. (Each list holds a feature's name, or something falsy if the song lacks it.)
function endsOf(song: Song): unknown[] {
  const { form } = song;
  const finale = form.first(Finale)?.material;
  const outro = form.first(Outro);
  const verseEnding = song.part(Chorus) && song.lastPlayed instanceof Verse;
  return [
    !form.first(Intro) && 'no intro',
    form.first(Intro)?.free && 'free intro',
    form.first(Swell) && 'swell intro',
    form.ofType(Intro).some((i) => i.tail) && 'odd intro',
    // (A finale on unison is the riff ending.)
    form.fadeFrom === undefined ? `finale on ${finale?.ends}` : 'fade',
    verseEnding && 'verse ending',
    // (Its last chorus in its last round, before the middle; a returning vamp may come between the solo and the lift.)
    verseEnding &&
      form.sections.findLastIndex((s) => s instanceof Chorus) <
        form.sections.findLastIndex((s) => s instanceof SoloSection) &&
      'verse ending after a solo',
    song.part(Chorus) && song.lastPlayed instanceof PreChorus && 'round outro',
    form.sections.some((s) => s.bare) && 'bare start',
    outro && `outro ${outro.variant}`,
    finale?.eases && 'easing finale',
    finale?.variant === 'neapolitan' && 'neapolitan finale',
  ];
}

// Its form: its rounds.
function formOf(song: Song): unknown[] {
  const { form } = song;
  const chorus = song.part(Chorus);
  return [
    !chorus && 'no chorus',
    !form.first(Verse) && 'no verses',
    song.rounds.some((s) => s instanceof Lift) && 'chorus re-entry',
    song.chorusTwice && 'chorus twice',
    chorus && form.runs(Verse, PreChorus, Verse).length > 0 && 'verse and B twice',
    form.ofType(PreChorus).some((p) => p.bars === 16) && '16-bar pre',
    form.ofType(Chorus).some((c) => c.half) && 'half chorus',
    chorus && chorus.key.mode !== song.key.mode && 'relative-major chorus',
  ];
}

// Its form: how its sections join, and its bridges.
function joinsOf(song: Song): unknown[] {
  const { form } = song;
  const secs: readonly AnySection[] = form.sections;
  return [
    secs.some((s) => s instanceof ShortBar && s.beats === 2) && '2/4 bar',
    secs.some((s) => s instanceof ShortBar && s.beats === 1) && '1/4 bar',
    secs.some((s) => s instanceof Link) && 'link',
    secs[secs.findIndex((s) => s instanceof Verse) - 1] instanceof Link && 'link before the first verse',
    secs.some((s) => s.stop) && 'stop',
    form.ofType(Bridge).length > 1 && 'bridge twice',
    form.ofType(Bridge).some((b) => b.bars === 12) && '12-bar bridge',
    form.runs(Bridge, Lift).length > 0 && 'lift out of a bridge',
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
    form.ofType(Verse).some((v) => v.material.harmony === 'loop') && 'verse on a loop',
    secs.some(
      (s) =>
        (s instanceof Link || (s instanceof Intro && s.material.harmony === 'planing')) &&
        s.material.bars[0][0].symbol === '9sus',
    ) && 'sus planing',
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
    song.swingOnly && 'some parts swung',
    song.instruments.kit.name === 'Brush' && 'brushes',
    song.form.sections.some((s) => 'drums' in s.material && s.material.drums.feel === 'ballad') && 'ballad grooves',
  ];
}

// The sounds and drums it plays, of those a song picks only now and then.
function soundsOf(song: Song, notes: Score['notes']): unknown[] {
  const { kitVoices } = song.instruments;
  const drum = (key: number) => notes.some((n) => n.program === 'drums' && n.note === key);
  const weather = song.form.sections.flatMap((s) => {
    const weather = 'weather' in s.material && s.material.weather;
    return weather ? [`${weather} under the ${s.kind.id}`] : [];
  });
  return [
    kitVoices.kick === PERCUSSION.acousticBassDrum && 'acoustic kick',
    kitVoices.crashes.length > 1 && 'two crashes',
    kitVoices.synthDrum && 'synth drum',
    ...weather,
    drum(PERCUSSION.vibraslap) && 'vibraslap',
    drum(PERCUSSION.cabasa) && 'cabasa',
    drum(PERCUSSION.claves) && 'claves',
    drum(PERCUSSION.muteTriangle) && 'mute triangle',
  ];
}

let failures = 0;
const tally = new Map<string, number>();
for (let i = 0; i < count; i++) {
  const seed = `sweep${i}`;
  let found: string[];
  try {
    const song = Song.generate(seed);
    const score = new ScoreArranger(song).arrange();
    for (const f of new Set(features(song, score))) tally.set(f, (tally.get(f) ?? 0) + 1);
    found = problems(song, score);
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
