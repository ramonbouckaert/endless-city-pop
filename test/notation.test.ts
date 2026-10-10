import { describe, expect, it } from 'vitest';
import { at } from '../src/lib/steps';
import { BassLine, Melody, Song } from '../src/model';
import {
  bassDegrees,
  bassScale,
  chordSeq,
  degree,
  from,
  gains,
  hits,
  lastBar,
  melodyDegrees,
  renderBar,
  scaleSeq,
  seq,
} from '../src/render/notation';
import { Chord, Key } from '../src/theory';

describe('notation', () => {
  it('writes bars of notes with rests and held notes weighted', () => {
    const notes = [
      { start: 1, len: 1, n: '0' },
      { start: 2, len: 4, n: '2' },
    ];
    expect(renderBar(notes, 8, (n) => n.n)).toBe('[~ 0 2@4 ~@2]');
    expect(renderBar([], 8, () => 'x')).toBe('~');
    // A note held past the barline stops there.
    expect(renderBar([{ start: 6, len: 4 }], 8, () => '5')).toBe('[~@6 5@2]');
  });

  it('writes sequences, masks and drum steps', () => {
    expect(seq(['a', 'b'])).toBe('<a b>');
    expect(lastBar(3, 'x', '~')).toBe('<~ ~ x>');
    expect(from(4, 2)).toBe('<0 0 1 1>');
    const bar = at({ 0: 0.5, 6: 0.25 });
    expect(hits(bar, 'bd')).toBe('[[bd ~ ~ ~] [~ ~ bd ~] [~ ~ ~ ~] [~ ~ ~ ~]]');
    expect(gains(bar)).toBe('[[0.5 0 0 0] [0 0 0.25 0] [0 0 0 0] [0 0 0 0]]');
  });

  it('writes degrees as Strudel reads them', () => {
    expect(degree({ step: 4, alter: 0 })).toBe('4');
    expect(degree({ step: 4, alter: 1 })).toBe('4#');
    expect(degree({ step: 6, alter: -1 })).toBe('6b');
  });

  it('writes melodies in degrees of their key', () => {
    const melody = new Melody([
      [
        { start: 0, len: 2, semis: 0 },
        { start: 2, len: 6, semis: 3 },
      ],
    ]);
    expect(melodyDegrees(melody, new Key(0))).toEqual(['[0@2 2b@6]']);
    expect(melodyDegrees(melody, new Key(0, 'minor'))).toEqual(['[0@2 2@6]']);
  });

  it('writes chords, chord-scales and bass lines bar by bar', () => {
    const key = new Key(0);
    const bars = [
      [new Chord(2, 'm9', 'dorian')],
      [new Chord(7, '13', 'mixolydian'), new Chord(1, '13#11', 'lydian:dominant')],
    ];
    expect(chordSeq(bars, key)).toBe('<Dm9 [G13 Db13#11]>');
    expect(scaleSeq(bars, key)).toBe('<D2:dorian [G1:mixolydian Db2:lydian:dominant]>');
    expect(bassScale(bars[0][0], key, 2)).toBe('D4:dorian');
    const bass = new BassLine('funk', [
      [
        { start: 0, len: 4, degree: { step: 0, alter: 0 } },
        { start: 14, len: 2, degree: { step: 4, alter: 1 } },
      ],
    ]);
    expect(bassDegrees(bass)).toEqual(['[0@4 ~@10 4#@2]']);
  });

  it("writes every song's bass lines a bar at a time", () => {
    for (let i = 0; i < 20; i++) {
      const song = Song.generate(`notation${i}`);
      for (const mat of Object.values(song.materials)) {
        if (!('bass' in mat)) continue;
        const items = bassDegrees(mat.bass);
        expect(items).toHaveLength(mat.bars.length);
        for (const item of items) expect(item).toMatch(/^\[.*\]$/);
      }
    }
  });
});
