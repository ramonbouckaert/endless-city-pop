import { describe, expect, it } from 'vitest';
import { Chorus, DrumBreak, Finale, Intro, Song, Verse } from '../src/engine';
import { TONALITIES } from '../src/style';
import { CHORDS, MODES, type Mode } from '../src/theory';
import { defined, materials } from './helpers';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('Song', () => {
  it('is deterministic for a seed', () => {
    expect(Song.generate('abc')).toEqual(Song.generate('abc'));
    expect(materials(Song.generate('abc'))).not.toEqual(materials(Song.generate('abd')));
  });

  it('writes complete songs', () => {
    for (const seed of SEEDS) {
      const song = Song.generate(seed);
      for (const mat of Object.values(materials(song))) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([defined(chord.scale, 'a chord-scale')]);
        }
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      for (const s of song.form) expect(materials(song)).toHaveProperty([s.part]);
      const kinds = song.form.sections.map((s) => s.kind);
      expect(kinds[0]).toBe(Intro);
      expect(kinds.at(-1)).toBe(Finale);
      expect(kinds).toContain(Verse);
      expect(kinds).toContain(Chorus);
      const brk = kinds.indexOf(DrumBreak);
      if (brk >= 0) expect(kinds[brk + 1]).not.toBe(Finale);
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
      defined(song.part(Chorus), 'a chorus')
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
      for (const mat of Object.values(materials(song))) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([defined(chord.scale, 'a chord-scale')]);
        }
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      const fin = defined(song.part(Finale), 'a finale').chord;
      expect(fin.root).toBe(song.key.tonic);
      expect(fin.cls).toBe(tonic);
      expect(finale.map(([symbol]) => symbol)).toContain(fin.symbol);
    }
  });
});
