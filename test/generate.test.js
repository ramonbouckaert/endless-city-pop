import { describe, expect, it } from 'vitest';
import { generateSong } from '../src/engine/generate.js';
import { STYLE_NAMES } from '../src/engine/styles.js';
import { CHORDS, MODES } from '../src/engine/theory.js';

describe('generateSong', () => {
  it('is deterministic for a seed', () => {
    expect(generateSong({ seed: 'abc' }).code).toBe(generateSong({ seed: 'abc' }).code);
    expect(generateSong({ seed: 'abc' }).code).not.toBe(generateSong({ seed: 'abd' }).code);
  });

  for (const style of STYLE_NAMES) {
    it(`writes a complete ${style} song`, () => {
      for (const seed of ['one', 'two', 'three', 'four']) {
        const { code, song } = generateSong({ seed, style });
        const bars = song.form.reduce((n, s) => n + s.bars, 0);
        expect(code).toContain(`THE SONG (${bars} bars)`);
        expect(code).toContain('$: arrange(');
        for (const mat of Object.values(song.materials)) {
          for (const chord of (mat.bars ?? []).flat()) {
            expect(CHORDS).toHaveProperty([chord.symbol]);
            expect(MODES).toHaveProperty([chord.scale]);
          }
        }
        // Every section type the form uses gets defined.
        for (const s of song.form) expect(code).toContain(`let ${s.type} =`);
      }
    });
  }

  it('honours key, mode and tempo choices', () => {
    const { song } = generateSong({ seed: 'x', style: 'pop', key: 2, mode: 'minor', bpm: 99 });
    expect(song.key).toEqual({ tonic: 2, mode: 'minor' });
    expect(song.bpm).toBe(99);
  });
});
