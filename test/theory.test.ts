import { describe, expect, it } from 'vitest';
import { romanise } from '../src/lib/romaji';
import { Chord, Key, MODES, Roman, Scale, Voicing, type ChordSpec } from '../src/theory';

describe('music', () => {
  it('round-trips every semitone through degrees', () => {
    for (const steps of Object.values(MODES)) {
      const scale = new Scale(steps);
      for (let semis = -14; semis <= 26; semis++) {
        for (const flats of [false, true]) {
          const { step, alter } = scale.degree(semis, flats);
          expect(scale.semis(step) + alter).toBe(semis);
          expect(Math.abs(alter)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('snaps a held note to a clean tone, in the key if asked', () => {
    const key = new Key(0);
    // Cmaj7: B rubs against C, so only E and G are clean.
    const cmaj7 = new Chord(0, '^7');
    expect(cmaj7.clean).toEqual([4, 7]);
    expect(cmaj7.snap(11, key)).toBe(11);
    expect(cmaj7.snap(11, key, { clean: true })).toBe(7);
    // Dmaj7 in C: C# rubs against D, so F# and A are clean; only A is in the key.
    expect(new Chord(2, '^7').snap(6, key, { clean: true, diatonic: true })).toBe(9);
  });

  it('parses slash basses: intervals over the root, and degrees of the key', () => {
    const key = new Key(0);
    const c = new Chord(0, '^7');
    const am = new Chord(9, 'm7');
    // A plain 3 or 7 is the chord's own: E under Cmaj7, G under Am7.
    expect(Roman.parse('I/3').bassOf(key, c)).toBe(4);
    expect(Roman.parse('I/7').bassOf(key, c)).toBe(11);
    expect(Roman.parse('vi/7').bassOf(key, am)).toBe(7);
    expect(Roman.parse('vi/3').bassOf(key, am)).toBe(0);
    expect(Roman.parse('I/b7').bassOf(key, c)).toBe(10);
    expect(Roman.parse('I/5').bassOf(key, c)).toBe(7);
    // A numeral after the slash is a degree of the key: F/G, D/C.
    expect(Roman.parse('IV/V').bassOf(key, new Chord(5, ''))).toBe(7);
    expect(Roman.parse('II/I').bassOf(key, new Chord(2, ''))).toBe(0);
    expect(Roman.parse('IV/V').offset).toBe(5);
    expect(Roman.parse('I').bassOf(key, c)).toBeUndefined();
    expect(Roman.parseSpec('V:9sus/IV').bass?.bassOf(key, new Chord(7, '9sus'))).toBe(5);
  });

  it('plays a slash chord over its bass', () => {
    const key = new Key(0);
    const cOverE = new Chord(0, '^7', undefined, 4);
    expect(cOverE.name(key)).toBe('C^7/E');
    expect(cOverE.bassMidi).toBe(28); // E1
    expect(cOverE.rootMidi).toBe(36); // C2: degrees still count from the root
    expect(cOverE.bassDegree).toEqual({ step: -5, alter: 0 }); // the E below the C
    // Its bass isn't doubled in the voicing; its root stays.
    const pcs = Voicing.of(cOverE).notes.map((n) => n % 12);
    expect(pcs).not.toContain(4);
    expect(pcs).toContain(0);
    // A slash bass on the root is no slash at all.
    expect(new Chord(0, '', undefined, 12).bass).toBeUndefined();
  });

  it('parses roman numerals', () => {
    expect(Roman.parse('IVmaj7')).toMatchObject({ offset: 5, cls: 'maj' });
    expect(Roman.parse('V7')).toMatchObject({ offset: 7, cls: 'dom' });
    expect(Roman.parse('#iv°')).toMatchObject({ offset: 6, cls: 'dim' });
    expect(Roman.parse('viiø')).toMatchObject({ offset: 11, cls: 'hdim' });
  });

  it('spells chromatic notes as flattened degrees', () => {
    expect([3, 8, 10, 6].map((pc) => new Key(0).spell(pc))).toEqual(['Eb', 'Ab', 'Bb', 'F#']);
    expect(new Key(2).spell(10)).toBe('Bb');
    expect(new Chord(10, 'm7').name(new Key(0))).toBe('Bbm7');
  });

  it('measures distance round the circle of fifths', () => {
    expect(new Key(0).fifthsTo(new Key(7))).toBe(1);
    expect(new Key(0).fifthsTo(new Key(9, 'minor'))).toBe(0);
    expect(new Key(0).fifthsTo(new Key(2, 'dorian'))).toBe(0);
    expect(new Key(0).fifthsTo(new Key(6))).toBe(6);
  });

  it('parses chord specs', () => {
    expect(Roman.parseSpec('bVI:^7#11|^9#11')).toEqual({ offset: 8, symbols: ['^7#11', '^9#11'] });
    expect(() => Roman.parseSpec('V' as ChordSpec)).toThrow();
  });

  it('romanises katakana in Hepburn, without diacritics or apostrophes', () => {
    expect(romanise('ミッドナイト・ドライブ')).toBe('middonaito doraibu');
    expect(romanise('トーキョー')).toBe('tokyo');
    expect(romanise('ウィークエンド')).toBe('wikuendo');
    expect(romanise('アベニュー')).toBe('abenyu');
    expect(romanise('ランデヴー')).toBe('randevu');
    expect(romanise('プラスティック')).toBe('purasutikku');
    expect(romanise('シーサイド')).toBe('shisaido');
  });

  it('treats every mode as its relative major', () => {
    expect(new Key(9, 'minor').majorTonic).toBe(0);
    expect(new Key(2, 'dorian').majorTonic).toBe(0);
    expect(new Key(7, 'mixolydian').majorTonic).toBe(0);
    // F# dorian is in E major, so it spells with sharps; Eb dorian is in Db.
    expect(new Key(6, 'dorian').name).toBe('F# dorian');
    expect(new Key(3, 'dorian').name).toBe('Eb dorian');
    expect(new Key(7, 'mixolydian').spell(5)).toBe('F');
    expect([3, 11].map((pc) => new Key(0, 'minor').spell(pc))).toEqual(['Eb', 'B']);
    expect(new Key(2, 'dorian').modeAt(7)).toBe('mixolydian'); // IV7
    expect(new Key(9, 'minor').modeAt(5)).toBe('lydian'); // bVI
  });
});
