import { describe, expect, it } from 'vitest';
import {
  CHORDS,
  MODES,
  degreeToSemis,
  fifthsDistance,
  makeKey,
  parseRoman,
  semisToDegree,
  spellInKey,
} from '../src/engine/theory.js';

describe('scale degrees', () => {
  it('round-trips every semitone through degree strings', () => {
    for (const steps of Object.values(MODES)) {
      for (let semis = -14; semis <= 26; semis++) {
        const deg = semisToDegree(steps, semis);
        const [, d, acc] = /^(-?\d+)([#b]*)$/.exec(deg);
        const shift = [...acc].reduce((n, ch) => n + (ch === '#' ? 1 : -1), 0);
        expect(degreeToSemis(steps, Number(d)) + shift).toBe(semis);
      }
    }
  });

  it('writes chromatic notes as altered degrees', () => {
    expect(semisToDegree(MODES.major, 6)).toBe('3#');
    expect(semisToDegree(MODES.major, 10, true)).toBe('6b');
    expect(semisToDegree(MODES.major, -1)).toBe('-1');
  });
});

describe('roman numerals', () => {
  it('parses quality and offset', () => {
    expect(parseRoman('IV')).toMatchObject({ offset: 5, cls: 'maj' });
    expect(parseRoman('iv7')).toMatchObject({ offset: 5, cls: 'min' });
    expect(parseRoman('IVmaj7')).toMatchObject({ offset: 5, cls: 'maj' });
    expect(parseRoman('bVII')).toMatchObject({ offset: 10, cls: 'maj' });
    expect(parseRoman('V7')).toMatchObject({ offset: 7, cls: 'dom' });
    expect(parseRoman('#iv°')).toMatchObject({ offset: 6, cls: 'dim' });
    expect(parseRoman('viiø')).toMatchObject({ offset: 11, cls: 'hdim' });
    expect(parseRoman('vi')).toMatchObject({ offset: 9, cls: 'min' });
  });
});

describe('spelling', () => {
  it('spells chromatic chords as flattened degrees', () => {
    const c = makeKey(0, 'major');
    expect([3, 8, 10, 6].map((pc) => spellInKey(pc, c))).toEqual(['Eb', 'Ab', 'Bb', 'F#']);
    expect(spellInKey(10, makeKey(2, 'major'))).toBe('Bb');
    expect(spellInKey(7, makeKey(4, 'major'))).toBe('G');
  });
});

describe('keys', () => {
  it('measures distance round the circle of fifths', () => {
    expect(fifthsDistance(makeKey(0), makeKey(7))).toBe(1);
    expect(fifthsDistance(makeKey(0), makeKey(9, 'minor'))).toBe(0);
    expect(fifthsDistance(makeKey(0), makeKey(6))).toBe(6);
  });

  it('only uses chord symbols Strudel can voice', () => {
    for (const symbol of Object.keys(CHORDS)) expect(typeof symbol).toBe('string');
  });
});
