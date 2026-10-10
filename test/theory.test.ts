import { describe, expect, it } from 'vitest';
import { romanise } from '../src/lib/romaji';
import { Chord, Key, MODES, parseChordSpec, Roman, Scale } from '../src/theory';

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
    expect(parseChordSpec('bVI:^7#11|^9#11')).toEqual({ offset: 8, symbols: ['^7#11', '^9#11'] });
    expect(() => parseChordSpec('V')).toThrow();
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
