import { describe, expect, it } from 'vitest';
import {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  HALF,
  Intro,
  Lift,
  Link,
  Outro,
  PreChorus,
  Riff,
  ShortBar,
  SoloSection,
  Song,
  Vamp,
  Verse,
} from '../src/engine';
import { defined } from './helpers';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('form', () => {
  it('varies the form from seed to seed', () => {
    const forms = SEEDS.map((seed) => Song.generate(seed).form.sections);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.kind.id).join(' '))).size).toBeGreaterThan(20);
    for (const kind of [Vamp, PreChorus, Riff, Bridge, SoloSection, Breakdown, Lift, Outro, DrumBreak]) {
      expect(forms.some((f) => f.some((s) => s.kind === kind))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.kind !== kind))).toBe(true);
    }
  });

  it('brings a vamp back at most twice, never straight after a verse', () => {
    const forms = Array.from({ length: 300 }, (_, i) => Song.generate(`vamp${i}`).form.sections);
    let returns = 0;
    let twice = 0;
    for (const form of forms) {
      const vamps = form.flatMap((s, i) => (s instanceof Vamp ? [i] : []));
      expect(vamps.length).toBeLessThanOrEqual(3);
      // The first opens the song, after the intros (and perhaps a pickup).
      if (vamps.length)
        expect(form.slice(0, vamps[0]).every((s) => s instanceof Intro || s instanceof ShortBar)).toBe(true);
      if (vamps.length > 1) returns++;
      if (vamps.length > 2) twice++;
      for (const back of vamps.slice(1)) {
        expect(form[back - 1].kind.handsOver).toBe(true);
        expect(form[back - 1].kind).not.toBe(Vamp);
        expect(form[back].bars).toBe(form[vamps[0]].bars);
        expect(form[back]).toMatchObject({ returning: true });
      }
    }
    expect(returns).toBeGreaterThan(20);
    expect(twice).toBeGreaterThan(3);
  });

  it('plans tunes, J-pop forms, links, stops, half choruses and side-stepping riffs', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`shape${i}`));
    const seen = new Set<string>();
    for (const song of songs) {
      const form = song.form.sections;
      const choruses = song.form.ofType(Chorus);
      const whole = choruses.filter((c) => !c.half);
      // Every whole chorus is as long as the others; a half one is the rest of a whole one's second half.
      expect(new Set(whole.map((c) => c.bars)).size).toBe(1);
      for (const half of choruses.filter((c) => c.half)) {
        seen.add('half');
        expect(half.bars).toBe(Math.ceil(whole[0].bars / 2));
        expect(half.part).toBe(HALF);
        expect(choruses.indexOf(half)).toBeGreaterThan(0);
        expect(half.material.bars).toEqual(whole[0].material.bars.slice(whole[0].bars - half.bars));
      }
      // A link only ever comes before a verse, after the first round.
      form.forEach((sec, i) => {
        if (!(sec instanceof Link)) return;
        seen.add('link');
        expect(form[i + 1]).toBeInstanceOf(Verse);
        expect(form.slice(0, i).some((s) => s instanceof Chorus)).toBe(true);
      });
      // A stop is never on the last chorus, nor the first.
      for (const [i, c] of choruses.entries()) {
        if (!c.stop) continue;
        seen.add('stop');
        expect(i).toBeGreaterThan(0);
        expect(c).not.toBe(choruses.at(-1));
      }
      // A riff a semitone up follows the same riff.
      form.forEach((sec, i) => {
        if (!(sec instanceof Riff) || sec.shift !== 1) return;
        seen.add('side-step');
        expect(form[i - 1]).toBeInstanceOf(Riff);
        expect(form[i - 1].shift).toBe(0);
      });
      // A verse sung twice in a row.
      if (form.some((s, i) => s instanceof Verse && form[i + 1] instanceof Verse)) seen.add('verse twice');
      // Seven-bar verses, every one of them.
      const verses = song.form.ofType(Verse);
      if (verses.some((v) => v.bars === 7)) {
        seen.add('short verse');
        expect(verses.every((v) => v.bars === 7)).toBe(true);
        expect(defined(song.part(Verse), 'a verse').bars).toHaveLength(7);
      }
      // A tune: choruses alone (in pairs, eight bars), a bridge, and a fade.
      if (!verses.length && whole.length >= 6 && whole[0].bars === 8 && song.form.first(Bridge)) seen.add('tune?');
      // A 2/4 break comes before a whole chorus after a verse or pre-chorus; a 1/4 pickup after the intro.
      form.forEach((sec, i) => {
        if (!(sec instanceof ShortBar)) return;
        seen.add(`${sec.beats}/4`);
        if (sec.beats === 2) {
          expect(form[i + 1]).toBeInstanceOf(Chorus);
          expect([Verse, PreChorus]).toContain(form[i - 1].kind);
        } else expect(form.slice(0, i).every((s) => s instanceof Intro)).toBe(true);
        expect(sec.shift).toBe(form[i + 1].shift);
      });
      if (whole.some((c) => c.bars === 20)) seen.add('20');
      if (whole.some((c) => c.bars === 12)) seen.add('12');
    }
    expect(seen).toEqual(
      new Set(['half', 'link', 'stop', 'side-step', 'verse twice', 'short verse', 'tune?', '20', '12', '2/4', '1/4']),
    );
  });
});
