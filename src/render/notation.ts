// The song's data as mini-notation, Strudel's sequence language: plain
// strings, built without loading Strudel (so tests can check them).

import type { StepGains } from '../lib/steps';
import type { BassLine, Line, Melody, Note, Solo } from '../model';
import type { Bar, Chord, Degree, Key } from '../theory';

// How many flicked grace notes would fill a sixteenth.
export const GRACE_SPLIT = 3;

/** Items as a sequence, one per cycle (a bar): "<a b c>". */
export const seq = (items: readonly string[]): string => `<${items.join(' ')}>`;

/** `len` bars: `rest` in all but the last, which plays `last`. */
export const lastBar = (len: number, last: string, rest: string): string => `<${(rest + ' ').repeat(len - 1)}${last}>`;

/** A mask that plays from bar `start` of `len`. */
export const from = (len: number, start: number): string =>
  seq(Array.from({ length: len }, (_, i) => (i < start ? '0' : '1')));

/** A 16-step bar as four groups of four: "[[bd ~ ~ bd] [~ ...] ...]". */
export const groups = (tokens: readonly (string | number)[]): string =>
  '[' + [0, 4, 8, 12].map((i) => '[' + tokens.slice(i, i + 4).join(' ') + ']').join(' ') + ']';

/** A 16-step bar: the sound where it hits. */
export const hits = (bar: StepGains, sound: string): string => groups(bar.map((v) => (v ? sound : '~')));

/** A 16-step bar's gains. */
export const gains = (bar: StepGains): string => groups(bar.map((v) => Math.round(v * 1000) / 1000));

/** One bar of notes, held notes weighted: "[~ 0 2 4 5@4]". */
export function renderBar<N extends Note>(notes: readonly N[], grid: number, token: (n: N) => string): string {
  if (!notes.length) return '~';
  const weighted = (tok: string, len: number) => (len > 1 ? `${tok}@${len}` : tok);
  const tokens: string[] = [];
  let t = 0;
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    if (n.start > t) tokens.push(weighted('~', n.start - t));
    const end = Math.min(n.start + n.len, grid);
    tokens.push(weighted(token(n), end - n.start));
    t = end;
  }
  if (t < grid) tokens.push(weighted('~', grid - t));
  return `[${tokens.join(' ')}]`;
}

/** A line, one item per bar. */
export const renderLine = <N extends Note>(line: Line<N>, token: (n: N) => string): string[] =>
  line.bars.map((notes) => renderBar(notes, line.grid, token));

/** A degree as Strudel's scale() reads it: "4", "4#", "5b". */
export const degree = ({ step, alter }: Degree): string =>
  `${step}${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}`;

/** A melody in degrees of `key`, one item per bar. */
export const melodyDegrees = (melody: Melody, key: Key): string[] =>
  renderLine(melody, (n) => degree(key.scale.degree(n.semis, key.usesFlats)));

/** A solo in chord-scale degrees; a flicked grace note takes the front of its note: "[4b 4@2]". */
export const soloDegrees = (solo: Solo): string[] =>
  renderLine(solo, (n) => {
    if (!n.grace || n.grace.slur) return String(n.degree);
    const { from: dir, chromatic } = n.grace;
    const grace = chromatic ? `${n.degree}${dir > 0 ? '#' : 'b'}` : String(n.degree + dir);
    return `[${grace} ${n.degree}@${GRACE_SPLIT * n.len - 1}]`;
  });

/** Semitones each solo note slides up into its pitch (Strudel's penv), in the same rhythm. */
export const soloSlides = (solo: Solo): string[] => renderLine(solo, (n) => String(n.grace?.slur ? -n.grace.semis : 0));

/** A bass line in chord-scale degrees, one item per bar. */
export const bassDegrees = (bass: BassLine): string[] => renderLine(bass, (n) => degree(n.degree));

/** One item per bar: a chord's token, or two sharing a bar in brackets. */
export const barTokens = (bars: readonly Bar[], token: (c: Chord) => string): string[] =>
  bars.map((bar) => (bar.length === 1 ? token(bar[0]) : `[${bar.map(token).join(' ')}]`));

/** A chord's chord-scale from its bass root: "D2:dorian". */
export const bassScale = (chord: Chord, key: Key, octaveUp = 0): string =>
  `${key.spell(chord.root)}${Math.floor(chord.bassMidi / 12) - 1 + octaveUp}:${chord.scale}`;

/** Bars of chord symbols: "<Dm9 [G13 Db13#11] ...>". */
export const chordSeq = (bars: readonly Bar[], key: Key): string => seq(barTokens(bars, (c) => c.name(key)));

/** Bars of chord-scales from the bass root: "<D2:dorian G1:mixolydian ...>". */
export const scaleSeq = (bars: readonly Bar[], key: Key): string => seq(barTokens(bars, (c) => bassScale(c, key)));

/** A key's scale from the tonic in octave 4: "D4:dorian". */
export const keyScale = (key: Key, octave = 4): string => `${key.tonicName}${octave}:${key.mode}`;
