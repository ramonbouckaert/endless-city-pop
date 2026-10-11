import { describe, expect, it } from 'vitest';
import { Rng } from '../src/lib/random';
import { BassWriter, Harmonizer } from '../src/engine';
import { PALETTE, PRE_FLAVOURS, TONALITIES } from '../src/style';
import { Chord, CHORDS, Key, MODES, PitchClass, Roman, Template, type Bar, type Mode } from '../src/theory';

describe('tonalities', () => {
  const modes = Object.keys(TONALITIES) as Mode[];
  const symbols = (palette: keyof typeof PALETTE) => Object.keys(PALETTE[palette]);

  it('has templates and chords that parse', () => {
    for (const mode of modes) {
      const t = TONALITIES[mode];
      const templates = [...Object.values(t.templates).flat(), ...Object.values(t.pre).flat()];
      for (const text of templates) expect(() => new Template(text)).not.toThrow();
      expect(Object.keys(t.pre).sort()).toEqual(Object.keys(PRE_FLAVOURS).sort());
      const specs = [...t.approach, ...Object.values(t.turnarounds).flatMap((x) => x.bars)].flat();
      for (const spec of specs) {
        for (const symbol of Roman.parseSpec(spec).symbols) expect(CHORDS).toHaveProperty([symbol]);
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

  it("keeps the 9th off a minor chord on the key's phrygian degree", () => {
    const cases: [Mode, string][] = [
      ['major', 'iii7 vi7'],
      ['dorian', 'ii7 i7'],
      ['mixolydian', 'vi7 I7'],
    ];
    for (const [mode, template] of cases) {
      for (let i = 0; i < 20; i++) {
        const key = new Key(0, mode);
        const chord = new Harmonizer(key, new Rng(`p${i}`)).progression(template, 2, { reharm: false })[0][0];
        expect(chord.symbol).toBe('m7');
        expect(chord.scale).toBe('phrygian');
      }
    }
  });

  it('keeps chords borrowed into a mixolydian key plain', () => {
    for (let i = 0; i < 20; i++) {
      const [[bIII], , [bVI]] = new Harmonizer(new Key(7, 'mixolydian'), new Rng(`b${i}`)).progression(
        'bIIImaj7 IVmaj7 bVImaj7 bVIImaj7',
        4,
        { reharm: false },
      );
      for (const chord of [bIII, bVI]) expect(symbols('majBorrowed')).toContain(chord.symbol);
    }
  });

  it('gives a dorian song modal bridges', () => {
    const dorian = TONALITIES.dorian;
    expect(dorian.bridgeKeys.some((k) => k.mode === 'dorian')).toBe(true);
    for (const text of dorian.bridges) expect(new Template(text).length).toBe(6);
  });

  it('plays a tritone sub over lydian dominant', () => {
    const key = new Key(0, 'major');
    const [[, sub]] = new Harmonizer(key, new Rng('t')).progression('[iii7 bIII7] ii7', 2, { reharm: false });
    expect(sub.scale).toBe('lydian:dominant');
  });

  it('cadences home in the way of each mode', () => {
    const names = (mode: Mode) => {
      const key = new Key(0, mode);
      return new Harmonizer(key, new Rng('a'))
        .approach()
        .flat()
        .map((c) => c.name(key));
    };
    expect(names('minor')[0]).toMatch(/^Fm(9|11)$/); // iv-bVII-i
    expect(names('minor')[1]).toMatch(/^Bb(13|9)$/);
    expect(names('dorian')[1]).toMatch(/^F(13|9)$/); // IV7-i
    expect(names('mixolydian')[1]).toMatch(/^Bb/); // bVII-I7
  });

  it('reharmonises with tritone subs, related ii chords, secondary dominants and stand-ins', () => {
    const key = new Key(0, 'major');
    const runs = 400;
    const found = { changed: 0, tritone: 0, tritoneAfter: 0, relatedII: 0, secondary: 0 };
    const standIns = { whole: 0, after: 0, before: 0 };
    // (Reharmonising refits chord-scales, so chords are compared by name.)
    const same = (x: Chord, y: Chord) => x.name(key) === y.name(key);
    const names = (bars: Bar[]) => bars.map((bar) => bar.map((c) => c.name(key)).join(' ')).join(' | ');
    // The roots a third away that stand in for C, Am and Dm (not Am for C, nor F for Am: the next bar's).
    const standInRoots = [[4], [0], [5]];
    for (let i = 0; i < runs; i++) {
      const harmony = new Harmonizer(key, new Rng(`r${i}`));
      const plain = harmony.progression('Imaj7 vi7 ii7 V7', 4, { reharm: false });
      const reharmed = harmony.reharmonize(plain);
      if (names(reharmed) !== names(plain)) found.changed++;
      const [v] = plain[3];
      const last = reharmed[3];
      // V7 into I: its tritone sub, bII13#11, in its place or after it, or ii-V.
      const isSub = (c: Chord) => c.root === PitchClass.of(v.root + 6) && c.symbol === '13#11';
      if (last.length === 1 && isSub(last[0])) found.tritone++;
      if (last.length === 2 && same(last[0], v) && isSub(last[1])) found.tritoneAfter++;
      if (last.length === 2 && last[0].root === PitchClass.of(v.root + 7) && last[0].minorish && same(last[1], v))
        found.relatedII++;
      expect(last.length === 2 && isSub(last[0])).toBe(false); // never before its chord
      for (let b = 0; b < 3; b++) {
        const target = plain[b + 1][0];
        const [chord] = plain[b];
        const bar = reharmed[b];
        // A whole-bar chord with the next bar's dominant (or its sub) in its second half.
        const [first, second] = bar;
        if (
          same(first, chord) &&
          second?.dominant &&
          [PitchClass.of(target.root + 7), PitchClass.of(target.root + 1)].includes(second.root)
        )
          found.secondary++;
        // A diatonic chord a third away, in its place, after it or before it.
        const standIn = (c: Chord) => !c.dominant && standInRoots[b].includes(c.root);
        if (bar.length === 1 && standIn(first)) standIns.whole++;
        if (bar.length === 2 && same(first, chord) && standIn(second)) standIns.after++;
        if (bar.length === 2 && standIn(first) && same(second, chord)) standIns.before++;
        // The tonic is never left for a whole bar.
        if (b === 0) expect(bar.some((c) => same(c, chord))).toBe(true);
      }
    }
    expect(found.changed).toBeGreaterThan(runs / 4);
    expect(found.tritone).toBeGreaterThan(runs / 20);
    expect(found.tritoneAfter).toBeGreaterThan(runs / 40);
    expect(found.relatedII).toBeGreaterThan(runs / 20);
    expect(found.secondary).toBeGreaterThan(runs / 5);
    expect(standIns.whole).toBeGreaterThan(runs / 40);
    expect(standIns.after).toBeGreaterThan(runs / 20);
    expect(standIns.before).toBeGreaterThan(runs / 40);
  });

  it('reharmonises by how much each mode allows', () => {
    const changed = (mode: Mode) => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const harmony = new Harmonizer(new Key(0, mode), new Rng(`m${i}`));
        const plain = harmony.progression('i7 iv7 i7 iv7', 4, { reharm: false });
        n += harmony.reharmonize(plain).filter((bar, b) => bar.length !== plain[b].length).length;
      }
      return n;
    };
    expect(changed('minor')).toBeGreaterThan(changed('phrygian') * 1.5);
  });

  it('fits a pre-chorus template to end on its cadence', () => {
    const t = new Template('ii7 iii7 IVmaj7 V7sus');
    const texts = (n: number) => t.fitEnding(n).map((bar) => bar.map((r) => r.text).join(' '));
    expect(texts(2)).toEqual(['IVmaj7', 'V7sus']);
    expect(texts(4)).toEqual(['ii7', 'iii7', 'IVmaj7', 'V7sus']);
    expect(texts(6)).toEqual(['IVmaj7', 'V7sus', 'ii7', 'iii7', 'IVmaj7', 'V7sus']);
  });

  it('realises slash chords plainly, over their bass, and never reharmonises them', () => {
    const key = new Key(0);
    for (let i = 0; i < 40; i++) {
      const harmony = new Harmonizer(key, new Rng(`s${i}`));
      const bars = harmony.progression('I I/7 I/b7 IV/V', 4);
      expect(bars.map((bar) => bar.length)).toEqual([1, 1, 1, 1]);
      expect(bars.map(([c]) => c.bass)).toEqual([undefined, 11, 10, 7]);
      expect([...symbols('slashMaj')]).toContain(bars[3][0].symbol);
    }
  });

  it('plays the bass of a slash chord on its downbeat', () => {
    const key = new Key(0);
    for (let i = 0; i < 40; i++) {
      const bars = new Harmonizer(key, new Rng(`b${i}`)).progression('I/3 IV/V vi/5 II/I', 4);
      const line = new BassWriter({ funk: 1, disco: 1, drive: 1 }, key, 110, new Rng(`l${i}`)).write(bars);
      line.bars.forEach((notes, b) => {
        const [chord] = bars[b];
        const first = notes.find((n) => n.start === 0);
        if (!first) return; // pushed into from the bar before
        const pitch = chord.rootMidi + chord.chordScale.semis(first.degree.step) + first.degree.alter;
        expect(PitchClass.of(pitch)).toBe(chord.bass);
      });
    }
  });
});
