// Bass lines: a rhythm template per feel, played in chord-scale degrees
// against each chord's scale, with an approach note at the end of the
// bar that leads into the next bar's root.

import { MODES, keyUsesFlats, midiName, semisToDegree, spellInKey } from './theory.js';

// Template tokens: R root, T third, F fifth, S seventh, O octave,
// A the approach note (one per bar). Numbers pass through.
export const BASS_FEELS = {
  funk: '[R ~ ~ R] [~ ~ O ~] [S ~ F ~] [T ~ A ~]',
  disco: 'R O R O R O [F T] [R A]',
  drive: 'R R O R R R F S',
  halfTime: 'R@2 F [T A]',
  bossa: 'R@3 F F@3 A',
  pop: 'R ~ [~ R] [F A]',
  eighths: 'R R R R R R R A',
  pedal: 'R@3 [~ A]',
  walking: null, // written bar by bar
};

const TOKENS = { R: '0', T: '2', F: '4', S: '6', O: '7' };

// Bass roots sit between E1 and Eb2, like an electric bass's low range.
export function bassRootMidi(pc) {
  let m = 24 + pc;
  if (m < 28) m += 12;
  return m;
}

export function bassScale(chord, key) {
  return `${midiName(bassRootMidi(chord.root), (pc) => spellInKey(pc, key))}:${chord.scale}`;
}

// The approach note into `next` from `cur`, as a degree of cur's scale.
function approach(cur, next, { rng, chromatic, key }) {
  const curRoot = bassRootMidi(cur.root);
  let target = bassRootMidi(next.root);
  if (target - curRoot > 6) target -= 12;
  if (curRoot - target > 6) target += 12;
  let pitch;
  if (target === curRoot) {
    pitch = curRoot + rng.pick([7, 10, -2]);
  } else if (rng.chance(chromatic)) {
    pitch = target + rng.pick([-1, 1, -1]);
  } else {
    pitch = target + rng.pick([-2, 2, 7, -5]);
  }
  // Nothing below the bass's low E.
  while (pitch < 28) pitch += 12;
  return semisToDegree(MODES[cur.scale], pitch - curRoot, keyUsesFlats(key));
}

function walkingBar(bar, next, opts) {
  const { rng } = opts;
  if (bar.length === 2) {
    return `[0 ${rng.pick(['2', '4', '1'])} 0 ${approach(bar[1], next, opts)}]`;
  }
  const middle = rng.pick([
    ['1', '2'],
    ['2', '4'],
    ['4', '2'],
    ['2', '3'],
    ['4', '5'],
    ['-1', '-3'],
  ]);
  return `[0 ${middle.join(' ')} ${approach(bar[0], next, opts)}]`;
}

/**
 * Bass for a section. Returns { pattern, scales }: mini-notation for
 * n() and the chord-scale sequence it plays against.
 */
export function writeBass({ bars, key, feel, rng, chromatic = 0.5 }) {
  const opts = { rng, chromatic, key };
  const nextOf = (b) => bars[(b + 1) % bars.length][0];
  const scales = renderScales(bars, key);
  if (feel === 'walking' || !BASS_FEELS[feel]) {
    const pattern = `<${bars.map((bar, b) => walkingBar(bar, nextOf(b), opts)).join(' ')}>`;
    return { pattern, scales };
  }
  const approaches = bars.map((bar, b) => approach(bar[bar.length - 1], nextOf(b), opts));
  const slot = approaches.every((a) => a === approaches[0]) ? approaches[0] : `<${approaches.join(' ')}>`;
  const pattern = BASS_FEELS[feel].replace(/[RTFSOA]/g, (t) => (t === 'A' ? slot : TOKENS[t]));
  return { pattern, scales };
}

// "<D2:dorian G1:mixolydian [A1:dorian Ab1:lydian:dominant] ...>"
export function renderScales(bars, key) {
  const scale = (c) => bassScale(c, key);
  const items = bars.map((bar) => (bar.length === 1 ? scale(bar[0]) : `[${bar.map(scale).join(' ')}]`));
  return `<${items.join(' ')}>`;
}
