import { describe, expect, it } from 'vitest';
import { Song } from '../src/model';
import { TONALITIES } from '../src/style';
import { CHORDS, MODES, type Mode } from '../src/theory';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('Song', () => {
  it('is deterministic for a seed', () => {
    expect(Song.generate('abc')).toEqual(Song.generate('abc'));
    expect(Song.generate('abc').materials).not.toEqual(Song.generate('abd').materials);
  });

  it('writes complete songs', () => {
    for (const seed of SEEDS) {
      const song = Song.generate(seed);
      for (const mat of Object.values(song.materials)) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if ('drums' in mat) expect(mat.drums.fills.length > 0).toBe(mat.drums.fill);
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      for (const s of song.form) expect(song.materials).toHaveProperty([s.part]);
      const types = song.form.sections.map((s) => s.type);
      expect(types[0]).toBe('intro');
      expect(types.at(-1)).toBe('finale');
      expect(types).toContain('verse');
      expect(types).toContain('chorus');
      const brk = types.indexOf('drumBreak');
      if (brk >= 0) expect(types[brk + 1]).not.toBe('finale');
      expect(song.describe().bars).toBe(song.bars);
    }
  });

  it('picks every mode from seeds', () => {
    const modes = SEEDS.map((seed) => Song.generate(seed).key.mode);
    expect(new Set(modes)).toEqual(new Set(Object.keys(TONALITIES)));
  });

  it('writes the same chorus for a seed as it did', () => {
    const song = Song.generate('snap0');
    expect(song.key.name).toMatchSnapshot();
    expect(
      song
        .part('chorus')!
        .bars.flat()
        .map((c) => c.name(song.key)),
    ).toMatchSnapshot();
  });

  it.each(Object.keys(TONALITIES) as Mode[])('writes complete %s songs', (mode) => {
    const { tonic, tonics, finale } = TONALITIES[mode];
    const songs: Song[] = [];
    for (let i = 0; songs.length < SEEDS.length; i++) {
      const song = Song.generate(`complete${i}`);
      if (song.key.mode === mode) songs.push(song);
    }
    for (const song of songs) {
      expect(song.key.mode).toBe(mode);
      expect(tonics).toContain(song.key.tonic);
      for (const mat of Object.values(song.materials)) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      const fin = song.part('finale')!.chord;
      expect(fin.root).toBe(song.key.tonic);
      expect(fin.cls).toBe(tonic);
      expect(finale.map(([symbol]) => symbol)).toContain(fin.symbol);
    }
  });
});
