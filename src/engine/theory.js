// Pitch, scale, chord and key basics. Pitch classes are integers
// 0-11 (C = 0); everything here is plain data so it is easy to test.

export const mod12 = (n) => ((n % 12) + 12) % 12;

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function pcName(pc, flats = true) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export function pcFromName(name) {
  const m = /^([A-Ga-g])([#b]*)$/.exec(name);
  if (!m) throw new Error(`Not a note name: ${name}`);
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()];
  let acc = 0;
  for (const ch of m[2]) acc += ch === '#' ? 1 : -1;
  return mod12(base + acc);
}

// MIDI 24 = C1, as in Strudel. `spell` names the pitch class.
export function midiName(midi, spell = (pc) => pcName(pc, true)) {
  return `${spell(mod12(midi))}${Math.floor(midi / 12) - 1}`;
}

// ---------------------------------------------------------------
// Modes and chord-scales, named the way Strudel's scale() wants them
// ---------------------------------------------------------------

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'melodic:minor': [0, 2, 3, 5, 7, 9, 11],
  'harmonic:minor': [0, 2, 3, 5, 7, 8, 11],
  'lydian:dominant': [0, 2, 4, 6, 7, 9, 10],
  'phrygian:dominant': [0, 1, 4, 5, 7, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
};

// Rotations of the major scale, in order.
const CHURCH_MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];

// Semitones above the tonic for a (possibly negative) scale degree.
export function degreeToSemis(steps, degree) {
  const n = steps.length;
  const octave = Math.floor(degree / n);
  return steps[degree - octave * n] + 12 * octave;
}

// The inverse: express a semitone offset as a scale degree string,
// with # or b suffixes when it falls between scale notes ("4#", "6b"),
// which Strudel's scale() understands.
export function semisToDegree(steps, semis, flats = false) {
  const n = steps.length;
  let d = Math.floor(semis / 12) * n;
  while (degreeToSemis(steps, d + 1) <= semis) d++;
  while (degreeToSemis(steps, d) > semis) d--;
  const below = semis - degreeToSemis(steps, d);
  if (below === 0) return String(d);
  const above = degreeToSemis(steps, d + 1) - semis;
  if (below < above || (below === above && !flats)) return `${d}${'#'.repeat(below)}`;
  return `${d + 1}${'b'.repeat(above)}`;
}

// ---------------------------------------------------------------
// Keys
// ---------------------------------------------------------------

// Tonics spelled with flats (C major and A minor count as flat keys,
// so their chromatic chords read Bb and Eb rather than A# and D#).
const FLAT_MAJOR = new Set([0, 5, 10, 3, 8, 1, 6]); // C F Bb Eb Ab Db Gb
const FLAT_MINOR = new Set([9, 2, 7, 0, 5, 10, 3]); // A D G C F Bb Eb

export function makeKey(tonic, mode = 'major') {
  return { tonic: mod12(tonic), mode };
}

export function keyUsesFlats(key) {
  return (key.mode === 'major' ? FLAT_MAJOR : FLAT_MINOR).has(key.tonic);
}

export function keyName(key) {
  return `${tonicName(key)} ${key.mode}`;
}

export function tonicName(key) {
  return pcName(key.tonic, keyUsesFlats(key));
}

// Spell a pitch class by its scale degree in a key: chromatic notes are
// flattened degrees (bIII, bVI, bVII), except the raised fourth, so
// C major spells Eb, Ab, Bb and F#, and D major spells F, Bb and C.
const DEGREE_OF_OFFSET = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];

export function spellInKey(pc, key) {
  const tonic = tonicName(key);
  const offset = mod12(pc - key.tonic);
  const letter = (LETTERS.indexOf(tonic[0]) + DEGREE_OF_OFFSET[offset]) % 7;
  let acc = mod12(pc - LETTER_PCS[letter]);
  if (acc > 6) acc -= 12;
  const name = LETTERS[letter] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
  // Avoid double accidentals and the rarely-seen Cb, Fb, E#, B#.
  if (Math.abs(acc) > 1 || ['Cb', 'Fb', 'E#', 'B#'].includes(name)) return pcName(pc, true);
  return name;
}

export function keyScale(key) {
  return MODES[key.mode === 'major' ? 'major' : 'minor'];
}

export function transposeKey(key, semis) {
  return makeKey(key.tonic + semis, key.mode);
}

export function relativeKey(key) {
  return key.mode === 'major' ? makeKey(key.tonic + 9, 'minor') : makeKey(key.tonic + 3, 'major');
}

// Position on the circle of fifths (C = 0, G = 1, F = -1 ...),
// with minor keys placed at their relative major.
export function fifthsPosition(key) {
  const majorTonic = key.mode === 'major' ? key.tonic : key.tonic + 3;
  const pos = mod12(majorTonic * 7);
  return pos > 6 ? pos - 12 : pos;
}

export function fifthsDistance(a, b) {
  const d = Math.abs(fifthsPosition(a) - fifthsPosition(b));
  return Math.min(d, 12 - d);
}

// ---------------------------------------------------------------
// Chords
// ---------------------------------------------------------------

// Chord symbols from Strudel's default (iReal) voicing dictionary.
// tones are semitones above the root; cls is the chord's family.
export const CHORDS = {
  '': { cls: 'maj', tones: [0, 4, 7] },
  add9: { cls: 'maj', tones: [0, 4, 7, 14] },
  '^7': { cls: 'maj', tones: [0, 4, 7, 11] },
  '^9': { cls: 'maj', tones: [0, 4, 7, 11, 14] },
  69: { cls: 'maj', tones: [0, 4, 7, 9, 14] },
  '^7#11': { cls: 'maj', tones: [0, 4, 7, 11, 18] },
  '^9#11': { cls: 'maj', tones: [0, 4, 7, 11, 14, 18] },
  m: { cls: 'min', tones: [0, 3, 7] },
  m7: { cls: 'min', tones: [0, 3, 7, 10] },
  madd9: { cls: 'min', tones: [0, 3, 7, 14] },
  m6: { cls: 'min', tones: [0, 3, 7, 9] },
  m9: { cls: 'min', tones: [0, 3, 7, 10, 14] },
  m11: { cls: 'min', tones: [0, 3, 7, 10, 14, 17] },
  7: { cls: 'dom', tones: [0, 4, 7, 10] },
  9: { cls: 'dom', tones: [0, 4, 7, 10, 14] },
  13: { cls: 'dom', tones: [0, 4, 7, 10, 14, 21] },
  '7sus': { cls: 'dom', tones: [0, 5, 7, 10] },
  '9sus': { cls: 'dom', tones: [0, 5, 7, 10, 14] },
  '7b9': { cls: 'dom', tones: [0, 4, 7, 10, 13] },
  '13b9': { cls: 'dom', tones: [0, 4, 7, 10, 13, 21] },
  '7#9': { cls: 'dom', tones: [0, 4, 7, 10, 15] },
  '7alt': { cls: 'dom', tones: [0, 4, 10, 13, 15, 20] },
  '13#11': { cls: 'dom', tones: [0, 4, 7, 10, 18, 21] },
  m7b5: { cls: 'hdim', tones: [0, 3, 6, 10] },
  o7: { cls: 'dim', tones: [0, 3, 6, 9] },
  sus: { cls: 'sus', tones: [0, 5, 7] },
  5: { cls: 'power', tones: [0, 7] },
};

// The chord-scale a chord symbol implies regardless of context.
const SYMBOL_SCALES = {
  '^7#11': 'lydian',
  '^9#11': 'lydian',
  '7b9': 'phrygian:dominant',
  '13b9': 'phrygian:dominant',
  '7alt': 'altered',
  '13#11': 'lydian:dominant',
  m7b5: 'locrian',
  o7: 'locrian',
  m6: 'dorian',
  '7sus': 'mixolydian',
  '9sus': 'mixolydian',
  sus: 'mixolydian',
  '7#9': 'mixolydian',
};

export function makeChord(root, symbol, scale) {
  const def = CHORDS[symbol];
  if (!def) throw new Error(`Unknown chord symbol: ${symbol}`);
  return { root: mod12(root), symbol, cls: def.cls, tones: def.tones, scale };
}

export function chordName(chord, key) {
  return `${spellInKey(chord.root, key)}${chord.symbol}`;
}

// Pitch classes of the chord tones.
export function chordPcs(chord) {
  return chord.tones.map((t) => mod12(chord.root + t));
}

// Pick a chord-scale for a chord in a key: the key's own mode when the
// chord is diatonic, otherwise the most common choice for its family.
export function chooseChordScale(chord, key, { resolvesToMinor = false } = {}) {
  if (SYMBOL_SCALES[chord.symbol]) return SYMBOL_SCALES[chord.symbol];
  const steps = keyScale(key);
  const inKey = (pc) => steps.includes(mod12(pc - key.tonic));
  if (inKey(chord.root) && chordPcs(chord).every(inKey)) {
    const majorTonic = key.mode === 'major' ? key.tonic : key.tonic + 3;
    const rotation = MODES.major.indexOf(mod12(chord.root - majorTonic));
    return CHURCH_MODES[rotation];
  }
  switch (chord.cls) {
    case 'maj':
      return 'lydian';
    case 'min':
      return 'dorian';
    case 'dom':
      return resolvesToMinor ? 'phrygian:dominant' : 'mixolydian';
    case 'hdim':
    case 'dim':
      return 'locrian';
    default:
      return 'mixolydian';
  }
}

// ---------------------------------------------------------------
// Roman numerals: "I", "vi", "bVII", "V7", "ii7", "viiø", "#iv°",
// "IVmaj7", "Isus", "I5". Numerals count semitones on the major
// scale, so minor-key templates spell bIII, bVI, bVII.
// ---------------------------------------------------------------

const NUMERALS = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };

export function parseRoman(text) {
  const m = /^([b#]?)(iii|ii|iv|i|vii|vi|v|III|II|IV|I|VII|VI|V)(.*)$/.exec(text);
  if (!m) throw new Error(`Not a roman numeral: ${text}`);
  const [, acc, numeral, suffix] = m;
  const upper = numeral === numeral.toUpperCase();
  let offset = NUMERALS[numeral.toLowerCase()];
  if (acc === 'b') offset -= 1;
  if (acc === '#') offset += 1;
  let cls = upper ? 'maj' : 'min';
  if (/ø/.test(suffix)) cls = 'hdim';
  else if (/[°o]/.test(suffix)) cls = 'dim';
  else if (/sus/.test(suffix)) cls = 'sus';
  else if (suffix === '5') cls = 'power';
  else if (/maj|\^/.test(suffix)) cls = 'maj';
  else if (/7/.test(suffix) && upper) cls = 'dom';
  return { offset: mod12(offset), cls, text };
}
