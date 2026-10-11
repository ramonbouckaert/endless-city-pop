import { describe, expect, it } from 'vitest';
import { DrumBreak, Finale, ShortBar, Song } from '../src/engine';
import { BASS_FEELS } from '../src/style';
import { partSections } from './helpers';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('rhythm', () => {
  const songs = SEEDS.map((seed) => Song.generate(seed));

  it('gives every playing section drums with at least one part', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        expect(sec.material.drums, sec.kind.label).toBeDefined();
        expect(sec.material.drums.parts.length, sec.kind.label).toBeGreaterThan(0);
      }
    }
  });

  it('gives each drum part exactly 4 bars of 16 steps', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        for (const part of sec.material.drums.parts) {
          expect(part.bars).toHaveLength(4);
          for (const bar of part.bars) expect(bar).toHaveLength(16);
        }
      }
    }
  });

  it('produces well-formed fills', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        for (const f of sec.material.drums.fills) {
          expect(f.start).toBeGreaterThanOrEqual(0);
          expect(f.start).toBeLessThan(16);
          expect(f.hits.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every section with chords a bass line', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        // The finale has the final chord but no bass line; a short bar, neither.
        if (sec instanceof Finale || sec instanceof DrumBreak || sec instanceof ShortBar) continue;
        expect(sec.material.bass.bars, sec.kind.label).toHaveLength(sec.material.bars.length);
        expect(sec.material.bass.bars.flat().length, sec.kind.label).toBeGreaterThan(0);
      }
    }
  });

  it('writes bass riffs as bars of sixteen sixteenths, starting on the root', () => {
    for (const { cells = [] } of Object.values(BASS_FEELS)) {
      for (const cell of cells) {
        expect(cell).toMatch(/^R[RTFSO.]{15}$/);
      }
    }
  });
});
