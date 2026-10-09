// Seeded randomness, so a seed always regenerates the same song.

// Hash any string into a 32-bit seed (xmur3).
function hashSeed(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// mulberry32: small, fast and good enough for music.
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const next = mulberry32(hashSeed(String(seed)));
  const rng = {
    next,
    // Integer in [min, max], inclusive.
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    // entries: [[item, weight], ...]
    weighted(entries) {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let r = next() * total;
      for (const [item, w] of entries) {
        if ((r -= w) < 0) return item;
      }
      return entries[entries.length - 1][0];
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // An independent stream, so adding a random call in one part of
    // the generator doesn't reshuffle every part after it.
    fork: (label) => createRng(`${seed}/${label}`),
  };
  return rng;
}

export function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}
