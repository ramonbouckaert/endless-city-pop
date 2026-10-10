// City pop titles in two languages: "真夜中のドライブ" and "Midnight
// Drive", either first, or the same with the Japanese in katakana
// English (ミッドナイト・ドライブ). The English is as it is, in capitals,
// or in fullwidth letters as on Japanese record sleeves (Ｍｉｄｎｉｇｈｔ
// Ｄｒｉｖｅ). Some titles give the Japanese in romaji instead of the
// English (Mayonaka no Doraibu, Middonaito Doraibu), without diacritics.

import type { Rng } from '../lib/random';
import { romanise } from '../lib/romaji';
import { TITLE_ROMAJI, TITLE_WORDS, type TitleWord } from '../style/titles';

/** A title's two halves (one Japanese, one English or romaji), how they join, and whether the English is romaji. */
export interface TitleParts {
  title: string;
  aside: string;
  join: 'brackets' | 'dash' | 'space';
  romanised: boolean;
}

/** The title as one line: the aside in brackets, after a dash, or straight after. */
export function formatTitle({ title, aside, join }: TitleParts): string {
  return `${title} ${joinAside(aside, join)}`;
}

/** A title's second part as it follows the first: "(Midnight Drive)", "– Midnight Drive". */
export function joinAside(aside: string, join: TitleParts['join']): string {
  if (join === 'brackets') return `(${aside})`;
  if (join === 'dash') return `– ${aside}`;
  return aside;
}

/** Writes a song's title. */
export class TitleWriter {
  constructor(private readonly rng: Rng) {}

  write(): TitleParts {
    const { rng } = this;
    const [mod, noun] = this.words(rng.fork('words'));
    const en = `${mod.en} ${noun.en}`;
    const { ja, kana, reading } = japanese(mod, noun);
    const kanaPairs: string[][] = kana
      ? [
          [kana, en],
          [en, kana],
        ]
      : [];
    const [title, aside] = rng.pick([[ja, en], [en, ja], ...kanaPairs]);
    const style = rng.pick(['plain', 'caps', 'fullwidth', 'fullwidth caps'] as const);
    const join = rng.pick(['brackets', 'dash', 'space'] as const);
    const romanised = rng.chance(TITLE_ROMAJI);
    const shown = title === en ? aside : title;
    const english = romanised ? reading(shown === kana) : en;
    const cased = style.endsWith('caps') ? english.toUpperCase() : english;
    const styled = style.startsWith('fullwidth') ? fullwidth(cased) : cased;
    const side = (s: string) => (s === en ? styled : s);
    return { title: side(title), aside: side(aside), join, romanised };
  }

  // A modifier and a noun that don't repeat each other: not "Rainy Rain"
  // or "Midsummer Summer". Retries are bounded: the lists have ~1200
  // pairs and very few clash.
  private words(rng: Rng): [TitleWord, TitleWord] {
    const { modifiers, nouns } = TITLE_WORDS;
    const clash = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase().slice(0, 4));
    let mod = rng.pick(modifiers);
    let noun = rng.pick(nouns);
    for (let i = 0; i < 100 && (clash(mod.en, noun.en) || clash(noun.en, mod.en)); i++) {
      mod = rng.pick(modifiers);
      noun = rng.pick(nouns);
    }
    return [mod, noun];
  }
}

// The pair in Japanese: a noun modifier takes の (真夜中のドア), an
// adjective comes straight before its noun (青いハイウェイ), and katakana
// words join with ・ (ミッドナイト・ドライブ). Also in katakana English,
// if both words have it, and the reading of either, in romaji.
function japanese(mod: TitleWord, noun: TitleWord) {
  const katakana = /^[゠-ヿ]+$/;
  const both = katakana.test(mod.ja) && katakana.test(noun.ja);
  let ja: string;
  if (mod.adj) ja = mod.ja + noun.ja;
  else if (both) ja = `${mod.ja}・${noun.ja}`;
  else ja = `${mod.ja}の${noun.ja}`;
  const kana = mod.kana && noun.kana ? `${mod.kana}・${noun.kana}` : undefined;
  const read = (w: TitleWord) => w.romaji ?? romanise(w.ja);
  const capital = (s: string) => s.replace(/(^| )(\p{L})/gu, (_, gap, c: string) => gap + c.toUpperCase());
  const sep = mod.adj || both ? ' ' : ' no ';
  const reading = (ofKana: boolean) =>
    ofKana && kana ? capital(romanise(kana)) : capital(`${read(mod)}${sep}${read(noun)}`).replace(/ No /, ' no ');
  return { ja, kana, reading };
}

const fullwidth = (s: string) =>
  s
    .replace(/[!-~]/g, (c) => String.fromCodePoint((c.codePointAt(0) ?? 0) + 0xfee0))
    .replaceAll(' ', String.fromCodePoint(0x3000));
