import { describe, expect, it } from 'vitest';
import { Song } from '../src/engine';
import { SECTION_TYPES } from '../src/style';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('form', () => {
  it('varies the form from seed to seed', () => {
    const forms = SEEDS.map((seed) => Song.generate(seed).form.sections);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.type).join(' '))).size).toBeGreaterThan(20);
    for (const type of ['vamp', 'pre', 'riff', 'bridge', 'solo', 'breakdown', 'lift', 'outro', 'drumBreak']) {
      expect(forms.some((f) => f.some((s) => s.type === type))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.type !== type))).toBe(true);
    }
  });

  it('brings a vamp back at most once, never straight after a verse', () => {
    const forms = Array.from({ length: 300 }, (_, i) => Song.generate(`vamp${i}`).form.sections);
    let returns = 0;
    for (const form of forms) {
      const vamps = form.flatMap((s, i) => (s.type === 'vamp' ? [i] : []));
      expect(vamps.length).toBeLessThanOrEqual(2);
      if (vamps.length) expect(vamps[0]).toBe(1); // the first opens the song, after the intro
      if (vamps.length === 2) {
        returns++;
        const back = vamps[1];
        expect(SECTION_TYPES[form[back - 1].type].handsOver).toBe(true);
        expect(form[back].bars).toBe(form[vamps[0]].bars);
        expect(form[back]).toMatchObject({ returning: true });
      }
    }
    expect(returns).toBeGreaterThan(20);
  });
});
