import { describe, expect, it } from 'vitest';
import { Breakdown, Bridge, DrumBreak, Lift, Outro, PreChorus, Riff, SoloSection, Song, Vamp } from '../src/engine';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('form', () => {
  it('varies the form from seed to seed', () => {
    const forms = SEEDS.map((seed) => Song.generate(seed).form.sections);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.kind.id).join(' '))).size).toBeGreaterThan(20);
    for (const kind of [Vamp, PreChorus, Riff, Bridge, SoloSection, Breakdown, Lift, Outro, DrumBreak]) {
      expect(forms.some((f) => f.some((s) => s.kind === kind))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.kind !== kind))).toBe(true);
    }
  });

  it('brings a vamp back at most once, never straight after a verse', () => {
    const forms = Array.from({ length: 300 }, (_, i) => Song.generate(`vamp${i}`).form.sections);
    let returns = 0;
    for (const form of forms) {
      const vamps = form.flatMap((s, i) => (s instanceof Vamp ? [i] : []));
      expect(vamps.length).toBeLessThanOrEqual(2);
      if (vamps.length) expect(vamps[0]).toBe(1); // the first opens the song, after the intro
      if (vamps.length === 2) {
        returns++;
        const back = vamps[1];
        expect(form[back - 1].kind.handsOver).toBe(true);
        expect(form[back].bars).toBe(form[vamps[0]].bars);
        expect(form[back]).toMatchObject({ returning: true });
      }
    }
    expect(returns).toBeGreaterThan(20);
  });
});
