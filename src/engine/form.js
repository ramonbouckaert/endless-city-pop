// Song form: the ordered list of sections, their lengths, how hard
// each one hits (energy), and the variations a repeat brings.
//
// A section instance is { type, bars, energy, opts } where type names
// shared material (every chorus plays the same chorus), and opts holds
// what differs: { second, answer, big, shift } (shift = semitones up,
// for a final-chorus key change; a lift section's liftTo names the
// shift it leads into).

const inst = (type, bars, energy, opts = {}) => ({ type, bars, energy, opts });

export function planForm(styleName, { rng }) {
  const forms = { jazzfunk, pop, rock, jazz };
  return forms[styleName]({ rng });
}

function jazzfunk({ rng }) {
  const preBars = rng.pick([4, 6, 6]);
  const tag = rng.chance(0.6);
  const chorusBars = tag ? 10 : 8;
  const shift = rng.weighted([
    [2, 3],
    [1, 2],
    [0, 1],
  ]);
  const solos = rng.int(1, 2);
  const s = [inst('intro', 4, 0.25)];
  if (rng.chance(0.7)) s.push(inst('vamp', 4, 0.45));
  s.push(inst('verse', 8, 0.55));
  s.push(inst('pre', preBars, 0.65));
  s.push(inst('chorus', chorusBars, 0.8));
  if (rng.chance(0.5)) s.push(inst('riff', 4, 0.75));
  s.push(inst('verse', 8, 0.6, { second: true }));
  s.push(inst('pre', preBars, 0.7));
  s.push(inst('chorus', chorusBars, 0.85, { answer: true }));
  if (rng.chance(0.6)) s.push(inst('riff', 4, 0.75));
  s.push(inst('bridge', 8, 0.45));
  if (rng.chance(0.7)) s.push(inst('drumBreak', 2, 0.7));
  s.push(inst('solo', 8, 0.75, { soloist: 0 }));
  if (solos > 1) s.push(inst('solo2', 8, 0.6, { soloist: 1 }));
  if (rng.chance(0.6)) s.push(inst('breakdown', 8, 0.35));
  if (shift) s.push(inst('lift', 2, 0.85, { liftTo: shift }));
  s.push(inst('chorus', chorusBars, 0.9, { answer: true, shift }));
  s.push(inst('chorus', chorusBars, 1, { answer: true, big: true, shift }));
  s.push(inst('outro', 4, 0.3, { shift }));
  s.push(inst('finale', 2, 0.5, { shift }));
  return s;
}

function pop({ rng }) {
  const pre = rng.chance(0.7);
  const shift = rng.weighted([
    [0, 2],
    [1, 1],
    [2, 1],
  ]);
  const s = [inst('intro', 4, 0.25)];
  s.push(inst('verse', 8, 0.5));
  if (pre) s.push(inst('pre', 4, 0.6));
  s.push(inst('chorus', 8, 0.8));
  if (rng.chance(0.4)) s.push(inst('riff', 4, 0.6));
  s.push(inst('verse', 8, 0.55, { second: true }));
  if (pre) s.push(inst('pre', 4, 0.65));
  s.push(inst('chorus', 8, 0.85, { answer: true }));
  s.push(inst('bridge', 8, 0.45));
  if (rng.chance(0.5)) s.push(inst('breakdown', 4, 0.35));
  if (shift) s.push(inst('lift', 2, 0.85, { liftTo: shift }));
  s.push(inst('chorus', 8, 0.9, { answer: true, shift }));
  if (rng.chance(0.6)) s.push(inst('chorus', 8, 1, { answer: true, big: true, shift }));
  s.push(inst('outro', 4, 0.3, { shift }));
  s.push(inst('finale', 2, 0.5, { shift }));
  return s;
}

function rock({ rng }) {
  const pre = rng.chance(0.4);
  const shift = rng.weighted([
    [0, 3],
    [2, 1],
  ]);
  const s = [inst('intro', 4, 0.6)];
  s.push(inst('verse', 8, 0.6));
  if (pre) s.push(inst('pre', 4, 0.7));
  s.push(inst('chorus', 8, 0.85));
  if (rng.chance(0.6)) s.push(inst('riff', 4, 0.75));
  s.push(inst('verse', 8, 0.65, { second: true }));
  if (pre) s.push(inst('pre', 4, 0.75));
  s.push(inst('chorus', 8, 0.9, { answer: true }));
  s.push(inst('solo', 8, 0.85, { soloist: 0 }));
  if (rng.chance(0.6)) s.push(inst('bridge', 8, 0.5));
  if (rng.chance(0.5)) s.push(inst('drumBreak', 2, 0.8));
  if (shift) s.push(inst('lift', 2, 0.9, { liftTo: shift }));
  s.push(inst('chorus', 8, 0.95, { answer: true, big: true, shift }));
  s.push(inst('chorus', 8, 1, { answer: true, big: true, shift }));
  s.push(inst('outro', 4, 0.6, { shift }));
  s.push(inst('finale', 2, 0.7, { shift }));
  return s;
}

// Head, solos, head: verse = A section, chorus = A', bridge = B.
function jazz({ rng }) {
  const s = [inst('intro', 4, 0.25)];
  s.push(inst('verse', 8, 0.5));
  s.push(inst('chorus', 8, 0.55));
  s.push(inst('bridge', 8, 0.45));
  s.push(inst('chorus', 8, 0.6, { answer: true }));
  s.push(inst('solo', 8, 0.7, { soloist: 0 }));
  if (rng.chance(0.7)) s.push(inst('solo2', 8, 0.6, { soloist: 1 }));
  if (rng.chance(0.5)) s.push(inst('drumBreak', 2, 0.6));
  s.push(inst('verse', 8, 0.6, { second: true }));
  s.push(inst('chorus', 8, 0.7, { answer: true, big: true }));
  s.push(inst('outro', 4, 0.3));
  s.push(inst('finale', 2, 0.4));
  return s;
}
