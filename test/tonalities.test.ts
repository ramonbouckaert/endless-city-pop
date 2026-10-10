import { describe, expect, it } from 'vitest';
import { Rng } from '../src/lib/random';
import { Harmonizer } from '../src/engine';
import { PALETTE, PRE_FLAVOURS, TONALITIES } from '../src/style';
import { CHORDS, Key, MODES, parseChordSpec, Template, type Mode } from '../src/theory';

describe('tonalities', () => {
  const modes = Object.keys(TONALITIES) as Mode[];
  const symbols = (palette: keyof typeof PALETTE) => PALETTE[palette].map(([s]) => s);

  it('has templates and chords that parse', () => {
    for (const mode of modes) {
      const t = TONALITIES[mode];
      const templates = [...Object.values(t.templates).flat(), ...Object.values(t.pre).flat()];
      for (const text of templates) expect(() => new Template(text)).not.toThrow();
      expect(Object.keys(t.pre).sort()).toEqual(Object.keys(PRE_FLAVOURS).sort());
      const specs = [...t.approach, ...Object.values(t.turnarounds).flatMap((x) => x.bars)].flat();
      for (const spec of specs) {
        for (const symbol of parseChordSpec(spec).symbols) expect(CHORDS).toHaveProperty([symbol]);
      }
      for (const [symbol, scale] of t.finale) {
        expect(CHORDS[symbol].cls).toBe(t.tonic);
        expect(MODES).toHaveProperty([scale]);
      }
      // A bridge's key needs bridge templates of its own.
      for (const { mode: m = 'major' } of t.bridgeKeys) expect(TONALITIES[m].templates.bridge?.length).toBeTruthy();
    }
  });

  it('colours the tonic chord by mode', () => {
    const tonicOf = (mode: Mode, template: string) =>
      new Harmonizer(new Key(0, mode), new Rng('t')).progression(template, 2, { reharm: false })[0][0];
    expect(symbols('minTonic')).toContain(tonicOf('minor', 'i7 iv7').symbol);
    expect(symbols('domTonic')).toContain(tonicOf('mixolydian', 'I7 IV7').symbol);
    expect(symbols('min')).toContain(tonicOf('dorian', 'i7 IV7').symbol);
  });

  it("alters a minor key's dominant, even where it leads out of the template", () => {
    for (let i = 0; i < 30; i++) {
      // V7 wraps round to iv, not i: only the key says it is the dominant.
      const v = new Harmonizer(new Key(2, 'minor'), new Rng(`v${i}`)).progression('iv7 V7', 2, { reharm: false })[1][0];
      expect(symbols('domToMinor')).toContain(v.symbol);
      expect(['altered', 'phrygian:dominant']).toContain(v.scale);
    }
  });

  it('cadences home in the way of each mode', () => {
    const names = (mode: Mode) => {
      const key = new Key(0, mode);
      return new Harmonizer(key, new Rng('a'))
        .approach()
        .flat()
        .map((c) => c.name(key));
    };
    expect(names('minor')[0]).toBe('Dm7b5'); // iiø-V7alt-i
    expect(names('minor')[1]).toMatch(/^G(7alt|7b9|13b9)$/);
    expect(names('dorian')[1]).toMatch(/^F(13|9)$/); // IV7-i
    expect(names('mixolydian')[1]).toMatch(/^Bb/); // bVII-I7
  });

  it('fits a pre-chorus template to end on its cadence', () => {
    const t = new Template('ii7 iii7 IVmaj7 V7sus');
    const texts = (n: number) => t.fitEnding(n).map((bar) => bar.map((r) => r.text).join(' '));
    expect(texts(2)).toEqual(['IVmaj7', 'V7sus']);
    expect(texts(4)).toEqual(['ii7', 'iii7', 'IVmaj7', 'V7sus']);
    expect(texts(6)).toEqual(['IVmaj7', 'V7sus', 'ii7', 'iii7', 'IVmaj7', 'V7sus']);
  });
});
