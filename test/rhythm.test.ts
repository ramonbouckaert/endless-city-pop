import { describe, expect, it } from 'vitest';
import { Song } from '../src/engine';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('rhythm', () => {
  const songs = SEEDS.map((seed) => Song.generate(seed));

  it('gives every playing section drums with at least one part', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        expect(mat.drums, mat.type).toBeDefined();
        expect(mat.drums.parts.length, mat.type).toBeGreaterThan(0);
      }
    }
  });

  it('gives each drum part exactly 4 bars of 16 steps', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        for (const part of mat.drums.parts) {
          expect(part.bars).toHaveLength(4);
          for (const bar of part.bars) expect(bar).toHaveLength(16);
        }
      }
    }
  });

  it('produces fills iff the fill flag is set', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        const { fill, fills } = mat.drums;
        expect(fills.length > 0).toBe(fill);
        for (const f of fills) {
          expect(f.start).toBeGreaterThanOrEqual(0);
          expect(f.start).toBeLessThan(16);
          expect(f.hits.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every section with chords a bass line', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        // The finale has the final chord but no bass line.
        if (mat.type === 'finale' || mat.type === 'drumBreak') continue;
        expect(mat.bass.bars, mat.type).toHaveLength(mat.bars.length);
        expect(mat.bass.bars.flat().length, mat.type).toBeGreaterThan(0);
      }
    }
  });
});
