// Melody writing. Lines are built from short rhythmic motifs arranged
// in phrases (A B A C ...). Repeats of a motif keep its shape and are
// moved to fit the new chord, which is what makes a hook sound like a
// hook. Strong beats land on chord tones; weak beats move by step.

import { chordPcs, degreeToSemis, keyScale, keyUsesFlats, mod12, semisToDegree, tonicName } from './theory.js';

// Rhythm cells on an eighth-note grid: x = note, - = held, . = rest.
const CELLS = {
  chorus: {
    A: ['.xxxx---', '.x.xx---', 'x-.xx---', '.xx-x---', '..xxx---', '.xxx.x--'],
    B: ['x-.x.x--', 'x.xxx.x.', '.x.xx.x.', 'x-xx.x--', 'xx.x.x--'],
    C: ['x---x---', 'x-x-x---', '.x.x----', 'x--x----'],
    D: ['x-------', '.xx-x---', 'xx-x----'],
    E: ['.xxxx---', '.x.xx---'],
  },
  verse: {
    A: ['.xx.x.x.', '..xx.xx-', '.x.xxx--', 'x.x.xx--', '.xxxx-..'],
    B: ['.x.x.x--', 'x-.xx.x-', '..x.xxx-', '.xx.x---'],
    C: ['x--.xx--', 'x-x-x---', '.x.x----'],
    D: ['x--x----', 'x-------', '.xx-x---'],
    E: ['.xx.x---'],
  },
  pre: {
    A: ['.x.xxx--', '.x.xx-x-', 'x.x.xx--'],
    B: ['x---.x.x', 'x-.x.x--'],
    C: ['x-------', 'x---x---'],
    D: ['x---.xx-', 'x-------'],
    E: ['x---x---'],
  },
  bridge: {
    A: ['x-----xx', 'x-----.x', 'x---x---', 'x-----x-'],
    B: ['x---.xx-', 'x-x-x---', 'x--x-x--'],
    C: ['x-------', 'x---x---'],
    D: ['x-------', 'x-----x-'],
    E: ['x---x---'],
  },
  riff: {
    A: ['x.xx.x.x', 'x..x.xx.', '.xx.xx.x', 'x.x..xx.'],
    B: ['.x.xx.x.', 'x.xx.x--', '.x.x.xx-'],
    C: ['x.x.x---'],
    D: ['x.xx.x--'],
    E: ['x.x.x---'],
  },
};

// Phrase plans: which motif plays in each bar. C is a half cadence,
// D a full cadence, E a tag figure.
export function phrasePlan(bars, kind) {
  if (kind === 'pre') {
    const plan = Array.from({ length: bars }, () => 'A');
    if (bars >= 3) plan[bars - 2] = 'B';
    plan[bars - 1] = 'C';
    return plan;
  }
  if (kind === 'riff') return Array.from({ length: bars }, (_, i) => (i % 2 ? (i === bars - 1 ? 'D' : 'B') : 'A'));
  const eight = ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D'];
  if (bars <= 8) return bars === 4 ? ['A', 'B', 'A', 'D'] : eight.slice(8 - bars);
  return Array.from({ length: bars }, (_, i) => (i < 8 ? eight[i] : i === bars - 1 ? 'D' : 'E'));
}

const SETTINGS = {
  // center and range in key-scale degrees above the tonic
  chorus: { center: 4, lo: -1, hi: 9 },
  verse: { center: 1, lo: -3, hi: 6 },
  pre: { center: 2, lo: -2, hi: 9, sequence: 1 },
  bridge: { center: 3, lo: -2, hi: 8 },
  riff: { center: 6, lo: 2, hi: 10 },
};

function parseCell(cell) {
  const notes = [];
  for (let i = 0; i < cell.length; i++) {
    if (cell[i] !== 'x') continue;
    let len = 1;
    while (cell[i + len] === '-') len++;
    notes.push({ start: i, len });
  }
  return notes;
}

// The chord sounding at a slot of a bar.
export function chordAt(bar, slot, grid) {
  return bar[Math.min(bar.length - 1, Math.floor((slot * bar.length) / grid))];
}

// Chord tones (relative to the key tonic) within reach of `semis`,
// nearest first.
function chordTonesNear(semis, chord, key, { extensions, diatonic }) {
  const tones = chord.tones.filter((t) => extensions || t < 12);
  const steps = keyScale(key);
  const out = [];
  for (const t of tones) {
    const pc = mod12(chord.root + t - key.tonic);
    if (diatonic && !steps.includes(pc)) continue;
    for (const octave of [-12, 0, 12]) out.push(semis - mod12(semis) + pc + octave);
  }
  if (!out.length) return [semis];
  return [...new Set(out)].sort((a, b) => Math.abs(a - semis) - Math.abs(b - semis) || a - b);
}

// Move a note onto a chord tone. Prefers the nearest, but avoids
// repeating the previous note when the line is meant to be moving.
function snapToChord(semis, chord, key, { extensions, diatonic, prev, dir = 0 }) {
  const near = chordTonesNear(semis, chord, key, { extensions, diatonic });
  const best = near[0];
  if (prev === undefined || best !== prev || dir === 0) return best;
  const alt = near.find((c) => c !== prev && Math.sign(c - prev) === dir && Math.abs(c - semis) <= 4);
  return alt ?? best;
}

function clampDegree(d, lo, hi) {
  while (d > hi) d -= 2;
  while (d < lo) d += 2;
  return d;
}

// Melodic shapes, as degree offsets from the first note. Openings
// tend to rise (often by thirds, outlining the chord); answers fall
// back; cadences settle.
const SHAPES = {
  rise: (n, rng) =>
    walk(n, () =>
      rng.weighted([
        [1, 2],
        [2, 3],
        [3, 1],
      ]),
    ),
  fall: (n, rng) =>
    walk(
      n,
      () =>
        -rng.weighted([
          [1, 3],
          [2, 2],
        ]),
    ),
  arch: (n, rng) => walk(n, (i) => (i < n / 2 ? rng.pick([1, 2, 2]) : -rng.pick([1, 1, 2]))),
  valley: (n, rng) => walk(n, (i) => (i < n / 2 ? -rng.pick([1, 2]) : rng.pick([1, 2, 2]))),
  neighbor: (n) => Array.from({ length: n }, (_, i) => [0, 1, 0, -1][i % 4]),
  leapFall: (n, rng) => walk(n, (i) => (i === 1 ? rng.pick([3, 4]) : -1)),
  zigzag: (n, rng) => walk(n, (i) => (i % 2 ? rng.pick([2, 3]) : -1)),
};

function walk(n, step) {
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + step(i));
  return out;
}

const SHAPE_CHOICES = {
  A: [
    ['rise', 4],
    ['arch', 3],
    ['leapFall', 2],
    ['zigzag', 1],
  ],
  B: [
    ['fall', 3],
    ['valley', 2],
    ['neighbor', 1],
    ['arch', 1],
  ],
  C: [
    ['fall', 2],
    ['neighbor', 1],
    ['valley', 1],
  ],
  D: [
    ['fall', 3],
    ['valley', 1],
  ],
  E: [
    ['rise', 2],
    ['arch', 1],
  ],
};

/**
 * Write a melody over `bars` (arrays of chords) in `key`.
 * Returns { bars: [[{start, len, semis}]], grid }.
 */
export function writeMelody({ bars, key, kind, rng, extensions = false }) {
  const steps = keyScale(key);
  const cells = CELLS[kind] ?? CELLS.verse;
  const settings = SETTINGS[kind] ?? SETTINGS.verse;
  const plan = phrasePlan(bars.length, kind);
  const motifs = {};
  const seen = {};
  let prevDeg = settings.center;
  let prevSemis;
  const out = [];

  bars.forEach((bar, b) => {
    const letter = plan[b];
    const isCadence = letter === 'C' || letter === 'D';
    const occurrence = (seen[letter] = (seen[letter] ?? -1) + 1);
    let motif = motifs[letter];
    if (!motif) {
      const rhythm = parseCell(rng.pick(cells[letter]));
      const offsets = SHAPES[rng.weighted(SHAPE_CHOICES[letter])](rhythm.length, rng);
      const shape = rhythm.map((n, i) => ({ ...n, offset: offsets[i] }));
      // Openings start low enough to rise; answers continue on from
      // wherever the line has got to.
      const span = Math.max(...offsets) - Math.min(...offsets);
      const startDeg =
        letter === 'A'
          ? settings.center - Math.floor(span / 2) + rng.pick([0, 0, 1])
          : clampDegree(prevDeg - Math.max(...offsets) + rng.pick([0, 1, 2]), settings.lo, settings.hi);
      motif = motifs[letter] = { shape, startDeg };
    }
    // Pre-choruses climb a step with every repeat of the motif.
    const seqShift = (settings.sequence ?? 0) * occurrence;
    const notes = [];
    motif.shape.forEach((n, i) => {
      const deg = clampDegree(motif.startDeg + seqShift + n.offset, settings.lo, settings.hi + seqShift);
      let semis = degreeToSemis(steps, deg);
      const chord = chordAt(bar, n.start, 8);
      const last = i === motif.shape.length - 1;
      const strong = n.start % 4 === 0 || n.len >= 3 || i === 0 || (last && isCadence);
      const dir = i === 0 ? 0 : Math.sign(n.offset - motif.shape[i - 1].offset);
      // Riffs stay diatonic: they are harmonised by scale steps.
      const diatonic = kind === 'riff';
      if (strong) semis = snapToChord(semis, chord, key, { extensions, diatonic, prev: prevSemis, dir });
      // Full cadence: finish on the tonic if it belongs to the chord.
      if (last && letter === 'D' && chordPcs(chord).includes(key.tonic)) semis = Math.round(semis / 12) * 12;
      notes.push({ start: n.start, len: n.len, semis });
      prevSemis = semis;
    });
    if (notes.length) prevDeg = parseInt(semisToDegree(steps, prevSemis), 10);
    out.push(notes);
  });
  return { bars: out, grid: 8 };
}

// Short answering figures in the gaps the melody leaves, high above it.
export function writeAnswer({ melody, bars, key, rng }) {
  const steps = keyScale(key);
  const figures = [
    [
      [0, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [2, 1],
    ],
  ];
  const out = melody.bars.map((notes, b) => {
    const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.len)) : 0;
    const lastNote = notes[notes.length - 1];
    // Answer in a gap at the end of the bar, or over a held note.
    let at = lastEnd <= 6 ? lastEnd : lastNote && lastNote.len >= 3 ? lastNote.start + 1 : null;
    if (at === null || b % 2 === 1) return [];
    const figure = rng.pick(figures).filter(([o, l]) => at + o + l <= 8);
    if (figure.length < 2) return [];
    let semis = degreeToSemis(steps, rng.pick([7, 8, 9]));
    return figure.map(([o, len], i) => {
      const chord = chordAt(bars[b], at + o, 8);
      semis = snapToChord(semis + (i ? rng.pick([2, 3, -2]) : 0), chord, key, {
        extensions: true,
        prev: semis,
        dir: 1,
      });
      return { start: at + o, len, semis };
    });
  });
  return { bars: out, grid: 8 };
}

// ---------------------------------------------------------------
// Improvised solos, in chord-scale degrees on a sixteenth grid.
// Chord tones are the even degrees of each chord-scale (1 3 5 7).
// ---------------------------------------------------------------

const SOLO_RHYTHMS = [
  '..x.xxxxx.x.x...',
  'x.x.x.xxx.x.....',
  '..xxxxx.x...x.x.',
  'x...x.x.xxxxx...',
  '.xx.x.xxx.x.xx..',
  'x.xxx.x.x.x.x...',
  '..x.x.x.xxxxx.x.',
  'xxxxx.x.....x.x.',
];

export function writeSolo({ bars, rng, lo = 6, hi = 18 }) {
  let deg = rng.int(lo + 2, lo + 6);
  let dir = 1;
  const out = bars.map((bar, b) => {
    // Breathe at the end of every other bar.
    let rhythm = rng.pick(SOLO_RHYTHMS);
    if (b % 2 === 1) rhythm = rhythm.slice(0, 12) + '....';
    const notes = [];
    for (let s = 0; s < 16; s++) {
      if (rhythm[s] !== 'x') continue;
      if (rng.chance(0.2)) dir = -dir;
      const leap = rhythm[s + 1] === 'x' ? 1 : rng.pick([1, 2, 2, 3]);
      deg += dir * leap;
      if (deg > hi) ((deg = hi - 1), (dir = -1));
      if (deg < lo) ((deg = lo + 1), (dir = 1));
      // Beats land on chord tones.
      if (s % 4 === 0 && deg % 2 !== 0) deg += dir;
      let len = 1;
      while (s + len < 16 && rhythm[s + len] === '.' && len < 2) len++;
      notes.push({ start: s, len, degree: deg });
    }
    return notes;
  });
  return { bars: out, grid: 16 };
}

// ---------------------------------------------------------------
// Rendering to mini-notation: one bracketed sequence per bar, with
// weights for held notes, e.g. "[~ 0 2 4 5@4]".
// ---------------------------------------------------------------

export function renderBar(notes, grid, toToken) {
  if (!notes.length) return '~';
  const tokens = [];
  let t = 0;
  const weighted = (tok, len) => (len > 1 ? `${tok}@${len}` : tok);
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    if (n.start > t) tokens.push(weighted('~', n.start - t));
    const end = Math.min(n.start + n.len, grid);
    tokens.push(weighted(toToken(n), end - n.start));
    t = end;
  }
  if (t < grid) tokens.push(weighted('~', grid - t));
  return `[${tokens.join(' ')}]`;
}

// Mini-notation for a melody written in key degrees.
export function renderKeyMelody(melody, key) {
  const steps = keyScale(key);
  const flats = keyUsesFlats(key);
  return melody.bars.map((notes) => renderBar(notes, melody.grid, (n) => semisToDegree(steps, n.semis, flats)));
}

export function renderSolo(solo) {
  return solo.bars.map((notes) => renderBar(notes, solo.grid, (n) => String(n.degree)));
}

// The scale string a key-degree melody is played against, e.g. "F4:major".
export function melodyScale(key, octave = 4) {
  return `${tonicName(key)}${octave}:${key.mode === 'major' ? 'major' : 'minor'}`;
}
