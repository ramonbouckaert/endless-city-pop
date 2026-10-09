// Chord progressions: roman-numeral templates realised in a key,
// coloured to the style's vocabulary, then reharmonised with the
// usual jazz substitutions when the style asks for them.

import { chooseChordScale, makeChord, makeKey, mod12, parseRoman, relativeKey, fifthsDistance } from './theory.js';

// "I vi [ii7 V7] IV" -> [[I], [vi], [ii7, V7], [IV]]: one entry per bar.
export function parseTemplate(template) {
  return template
    .trim()
    .match(/\[[^\]]+\]|\S+/g)
    .map((bar) => bar.replace(/[[\]]/g, '').trim().split(/\s+/).map(parseRoman));
}

// Fill `bars` bars with a template, repeating it as needed.
export function fitTemplate(template, bars) {
  const parsed = parseTemplate(template);
  return Array.from({ length: bars }, (_, i) => parsed[i % parsed.length]);
}

// ---------------------------------------------------------------
// Colouring: turn a chord family into a concrete symbol
// ---------------------------------------------------------------

const PALETTES = {
  // 0: rock. Triads and power chords.
  0: {
    maj: [
      ['', 3],
      ['5', 1],
    ],
    min: [['m', 1]],
    dom: [['7', 1]],
    hdim: [['m7b5', 1]],
    dim: [['o7', 1]],
    sus: [['sus', 1]],
    power: [['5', 1]],
  },
  // 1: pop. Triads with some sevenths and add9 shimmer.
  1: {
    maj: [
      ['', 3],
      ['add9', 2],
      ['^7', 1],
    ],
    min: [
      ['m', 3],
      ['m7', 2],
      ['madd9', 1],
    ],
    dom: [
      ['7', 2],
      ['9', 1],
      ['7sus', 1],
    ],
    hdim: [['m7b5', 1]],
    dim: [['o7', 1]],
    sus: [
      ['sus', 2],
      ['7sus', 1],
    ],
    power: [['5', 1]],
  },
  // 2: jazz and jazz-funk. Extended chords throughout.
  2: {
    maj: [
      ['^9', 3],
      ['^7', 1],
      ['69', 1],
    ],
    majLydian: [
      ['^9#11', 2],
      ['^7#11', 2],
      ['^9', 1],
    ],
    min: [
      ['m9', 3],
      ['m11', 2],
      ['m7', 1],
    ],
    dom: [
      ['13', 3],
      ['9', 2],
      ['9sus', 1],
    ],
    domToMinor: [
      ['7alt', 3],
      ['7b9', 1],
      ['13b9', 1],
    ],
    hdim: [['m7b5', 1]],
    dim: [['o7', 1]],
    sus: [
      ['9sus', 2],
      ['13', 1],
    ],
    power: [['9sus', 1]],
  },
};

// Colour every chord in a bar list. `bars` holds parsed roman numerals.
// Returns bars of concrete chords with chord-scales attached.
export function realize(bars, key, { color = 1, rng, flavour = {} }) {
  const palette = PALETTES[color];
  const flat = bars.flat();
  const chords = flat.map((rn, i) => {
    const root = mod12(key.tonic + rn.offset);
    const next = flat[(i + 1) % flat.length];
    const nextRoot = mod12(key.tonic + next.offset);
    const resolvesDown5 = mod12(root - nextRoot) === 7;
    let cls = rn.cls;
    // In jazz harmony an unadorned V is still a dominant.
    if (color === 2 && cls === 'maj' && rn.offset === 7 && resolvesDown5) cls = 'dom';
    let entries = palette[cls];
    // Major chords away from the tonic take lydian colour (#11).
    const tonicMajor = rn.offset === 0 || (key.mode === 'minor' && rn.offset === 3);
    if (cls === 'maj' && palette.majLydian && !tonicMajor) entries = palette.majLydian;
    const toMinor = cls === 'dom' && resolvesDown5 && ['min', 'hdim'].includes(next.cls);
    if (toMinor && palette.domToMinor) entries = palette.domToMinor;
    if (cls === 'dom' && flavour.funkDominants && !resolvesDown5)
      entries = [
        ['7#9', 1],
        ['13', 2],
      ];
    const symbol = rng.weighted(entries);
    return makeChord(root, symbol);
  });
  attachScales(chords, key);
  // Re-split into bars.
  let i = 0;
  return bars.map((bar) => bar.map(() => chords[i++]));
}

function attachScales(chords, key) {
  chords.forEach((chord, i) => {
    const next = chords[(i + 1) % chords.length];
    const resolvesToMinor = mod12(chord.root - next.root) === 7 && ['min', 'hdim'].includes(next.cls);
    chord.scale = chooseChordScale(chord, key, { resolvesToMinor });
  });
}

// ---------------------------------------------------------------
// Reharmonisation (jazz styles)
// ---------------------------------------------------------------

// Apply substitutions to realised bars. `amount` is 0..1.
export function reharmonize(bars, key, { rng, amount }) {
  if (!amount) return bars;
  const out = bars.map((bar) => [...bar]);
  for (let b = 0; b < out.length; b++) {
    const bar = out[b];
    const nextBar = out[(b + 1) % out.length];
    const target = nextBar[0];
    const last = bar[bar.length - 1];

    // Tritone substitution: a dominant resolving down a fifth becomes
    // the dominant a tritone away, resolving down a half step.
    if (last.cls === 'dom' && mod12(last.root - target.root) === 7 && rng.chance(amount * 0.3)) {
      bar[bar.length - 1] = makeChord(last.root + 6, '13#11');
      continue;
    }

    if (bar.length !== 1) continue;
    const only = bar[0];

    // Related ii: a whole-bar dominant becomes ii-V.
    if (only.cls === 'dom' && rng.chance(amount * 0.4)) {
      const minorTarget = mod12(only.root - target.root) === 7 && ['min', 'hdim'].includes(target.cls);
      const ii = makeChord(only.root + 7, minorTarget ? 'm7b5' : rng.pick(['m9', 'm7', 'm11']));
      out[b] = [ii, only];
      continue;
    }

    // Secondary dominant: second half of a bar points at the next chord.
    if (only.cls !== 'dom' && target.root !== only.root && rng.chance(amount * 0.35)) {
      const minorTarget = ['min', 'hdim'].includes(target.cls);
      const symbol = minorTarget ? rng.pick(['7alt', '7b9']) : rng.pick(['13', '9', '7#9']);
      // Sometimes the tritone sub of the secondary dominant instead.
      const tritone = rng.chance(0.3);
      out[b] = [only, makeChord(target.root + (tritone ? 1 : 7), tritone ? '13#11' : symbol)];
    }
  }
  attachScales(out.flat(), key);
  return out;
}

// ---------------------------------------------------------------
// Cadences into another section (or key)
// ---------------------------------------------------------------

// Two bars that lead into `toKey`'s tonic: ii-V, minor ii-V, or the
// backdoor bVI-V lift heard before a final chorus key change.
export function approachBars(toKey, { color, rng, kind = 'iiV' }) {
  const t = toKey.tonic;
  let bars;
  if (color === 0) {
    bars =
      kind === 'lift'
        ? [[makeChord(t + 8, '')], [makeChord(t + 10, '')]]
        : [[makeChord(t + 5, '')], [makeChord(t + 7, '')]];
  } else if (color === 1) {
    bars =
      kind === 'lift'
        ? [[makeChord(t + 8, rng.pick(['', 'add9']))], [makeChord(t + 10, '')]]
        : [[makeChord(t + 2, 'm7')], [makeChord(t + 7, rng.pick(['7sus', '7']))]];
  } else if (kind === 'lift') {
    bars = [[makeChord(t + 8, '^7#11')], [makeChord(t + 7, '7alt')]];
  } else if (kind === 'minor') {
    bars = [[makeChord(t + 2, 'm7b5')], [makeChord(t + 7, '7alt')]];
  } else {
    bars = [[makeChord(t + 2, rng.pick(['m9', 'm11']))], [makeChord(t + 7, rng.pick(['13', '7alt', '9sus']))]];
  }
  attachScales(bars.flat(), toKey);
  return bars;
}

// ---------------------------------------------------------------
// Solo changes: ii-V pairs moving through keys a fixed interval
// apart (the sample's "ii-Vs a minor third apart"), then home.
// ---------------------------------------------------------------

export function soloCycle(homeKey, bars, { rng }) {
  const step = rng.weighted([
    [3, 3], // up a minor third
    [-2, 2], // down a whole step
    [5, 1], // up a fourth (round the circle of fifths)
    [-1, 1], // down a half step
  ]);
  const pairs = bars / 2 - 1;
  const start = homeKey.tonic + rng.pick([0, 2, 9]);
  const out = [];
  for (let p = 0; p < pairs; p++) {
    const k = makeKey(start + p * step, 'major');
    out.push(
      [makeChord(k.tonic + 2, rng.pick(['m9', 'm11', 'm7']))],
      [makeChord(k.tonic + 7, rng.pick(['13', '9', '13']))],
    );
  }
  out.push(...approachBars(homeKey, { color: 2, rng }));
  attachScales(out.flat(), homeKey);
  // Each ii-V pair is diatonic to its own key, so the scales of the
  // pair should be dorian/mixolydian rather than the home key's modes.
  out.flat().forEach((c) => {
    if (c.symbol.startsWith('m') && c.cls === 'min') c.scale = 'dorian';
    if (['13', '9'].includes(c.symbol)) c.scale = 'mixolydian';
  });
  return out;
}

// ---------------------------------------------------------------
// Modulation targets, weighted by how the style likes to travel
// ---------------------------------------------------------------

export function chooseBridgeKey(home, { rng, adventurous = 0.5 }) {
  const options = [
    [makeKey(home.tonic + 5, home.mode), 3], // IV: one step round the circle
    [makeKey(home.tonic + 7, home.mode), 2], // V
    [relativeKey(home), 3],
    [makeKey(home.tonic + 3, 'major'), 3 * adventurous], // bIII: chromatic mediant
    [makeKey(home.tonic + 8, 'major'), 3 * adventurous], // bVI
    [makeKey(home.tonic + 2, home.mode), 1 * adventurous],
  ];
  // Closely related keys (few accidentals apart) are more natural in
  // conservative styles; distant ones add colour in adventurous ones.
  return rng.weighted(options.map(([key, w]) => [key, w * (fifthsDistance(home, key) <= 1 ? 1.5 - adventurous : 1)]));
}
