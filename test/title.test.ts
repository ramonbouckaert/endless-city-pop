import { describe, expect, it } from 'vitest';
import { Song } from '../src/engine';

describe('titles', () => {
  it('titles songs in Japanese and English, one after the other', () => {
    const japanese = /[぀-ヿ一-龯]/;
    const titles = Array.from({ length: 400 }, (_, i) => Song.generate(`title${i}`).title);
    const firsts = { japanese: 0, english: 0 };
    const styles = new Set<string>();
    const joins = new Set<string>();
    let romaji = 0;
    titles.forEach((title, i) => {
      const { title: main, aside, join, romanised } = Song.generate(`title${i}`).titleParts;
      if (romanised) romaji++;
      joins.add(join);
      expect(title).toBe(
        { brackets: `${main} (${aside})`, dash: `${main} – ${aside}`, space: `${main} ${aside}` }[join],
      );
      // One side Japanese, the other English.
      expect(japanese.test(main)).not.toBe(japanese.test(aside));
      // The English as it is, in capitals, or in fullwidth letters.
      const english = japanese.test(main) ? aside : main;
      const ascii = english
        .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/　/g, ' ');
      // English words, or the Japanese in romaji (Mayonaka no Doraibu, Tokyo).
      if (romanised) expect(ascii).toMatch(/^[A-Za-z ]+$/);
      else expect(ascii).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$|^[A-Z]+ [A-Z]+$/);
      styles.add(`${english !== ascii ? 'fullwidth ' : ''}${ascii === ascii.toUpperCase() ? 'caps' : 'plain'}`);
      firsts[japanese.test(main) ? 'japanese' : 'english']++;
    });
    expect(joins).toEqual(new Set(['brackets', 'dash', 'space']));
    expect(romaji / titles.length).toBeGreaterThan(0.12);
    expect(romaji / titles.length).toBeLessThan(0.28);
    expect(firsts.japanese).toBeGreaterThan(100);
    expect(firsts.english).toBeGreaterThan(100);
    expect(styles).toEqual(new Set(['plain', 'caps', 'fullwidth plain', 'fullwidth caps']));
    expect(new Set(titles).size).toBeGreaterThan(350);
    expect(titles.some((t) => t.includes('・'))).toBe(true); // katakana English
    expect(titles.some((t) => t.includes('の'))).toBe(true); // native Japanese
    expect(Song.generate('title1').title).toBe(titles[1]);
  });
});
