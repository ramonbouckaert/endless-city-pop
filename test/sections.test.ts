import { describe, expect, it } from 'vitest';
import { Song, type Grace } from '../src/model';
import { soloDegrees, soloSlides } from '../src/render/notation';
import {
  FINALE_STYLES,
  INTRO,
  INTRO_TEXTURES,
  LIFT_STYLES,
  MAX_SHIFT,
  OUTRO_STYLES,
  PRE_FLAVOURS,
  TONALITIES,
} from '../src/style';
import { MODES, type Mode } from '../src/theory';
import { defined } from './helpers';

describe('section materials', () => {
  it("starts the opening vamp's drums late, light or with the whole kit", () => {
    const entries = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const song = Song.generate(`vamp${i}`);
      const vamp = song.part('vamp');
      if (vamp) entries.add(vamp.variant);
      else expect(song.form.sections.some((s) => s.type === 'vamp')).toBe(false);
    }
    expect(entries).toEqual(new Set(['late', 'light', 'full']));
  });

  it("writes solos as long as their sections, in the song's mode", () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`solo${i}`));
    let sixteens = 0;
    let split = 0;
    let fromHome = 0;
    let notes = 0;
    const graces: Grace[] = [];
    const minorHalfDiminished: number[] = [];
    for (const song of songs) {
      for (const [i, sec] of song.form.ofType('solo').entries()) {
        const mat = song.material(sec);
        // The first over the band, the next never over what the one before had.
        expect(mat.variant).toBe(i % 2 ? 'bossa' : 'band');
        // The changes and the line fill the section: nothing loops.
        expect(mat.bars).toHaveLength(sec.bars);
        expect(mat.solo.bars).toHaveLength(sec.bars);
        for (const n of mat.solo.bars.flat()) {
          notes++;
          if (n.grace) graces.push(n.grace);
        }
        // Grace notes render as a short note in front: "[8b 8@2]", "[9 8@5]".
        const rendered = soloDegrees(mat.solo).join(' ');
        for (const m of rendered.matchAll(/\[(\d+)([#b]?) (\d+)@(\d+)]/g)) {
          const [, grace, accidental, note, weight] = m;
          if (accidental) expect(grace).toBe(note);
          else expect(Math.abs(Number(grace) - Number(note))).toBe(1);
          expect(Number(weight) % 3).toBe(2);
        }
        // Slurred ones slide into the note, a semitone or a step: "[0 0 -1 ...]".
        const slides = soloSlides(mat.solo);
        expect(slides).toHaveLength(sec.bars);
        for (const { grace } of mat.solo.bars.flat()) {
          if (!grace) continue;
          const { from, chromatic, semis } = grace;
          expect(Math.sign(semis)).toBe(from);
          expect(Math.abs(semis)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(semis)).toBeLessThanOrEqual(chromatic ? 1 : 3); // up to an augmented second
        }
        const bends = slides
          .join(' ')
          .match(/(?<=[[ ])-?\d+/g)
          ?.map(Number)
          .filter((x) => x !== 0);
        expect(bends?.length ?? 0).toBe(mat.solo.bars.flat().filter((n) => n.grace?.slur).length);
        if (sec.bars === 16) {
          sixteens++;
          const names = mat.bars.map((b) => b.map((c) => c.name(song.key)).join(' '));
          expect(names.slice(0, 8)).not.toEqual(names.slice(8));
        }
        if (mat.bars.some((b) => b.length > 1)) split++; // reharmonised
        const first = mat.bars[0][0];
        if (first.root === song.key.tonic && first.cls === TONALITIES[song.key.mode].tonic) fromHome++;
        if (song.key.mode === 'minor') {
          minorHalfDiminished.push(mat.bars.flat().filter((c) => c.symbol === 'm7b5').length);
        }
      }
    }
    expect(sixteens).toBeGreaterThan(10);
    expect(split).toBeGreaterThan(20);
    expect(fromHome).toBeGreaterThan(10);
    // Some notes get grace notes, mostly chromatic ones from below.
    expect(graces.length / notes).toBeGreaterThan(0.05);
    expect(graces.length / notes).toBeLessThan(0.2);
    const chromaticBelow = graces.filter((g) => g.chromatic && g.from === -1).length;
    expect(chromaticBelow).toBeGreaterThan(graces.length / 3);
    expect(graces.some((g) => !g.chromatic)).toBe(true);
    expect(graces.some((g) => g.from === 1)).toBe(true);
    const slurred = graces.filter((g) => g.slur).length / graces.length;
    expect(slurred).toBeGreaterThan(0.4);
    expect(slurred).toBeLessThan(0.8);
    // Minor solos move through minor ii-Vs.
    expect(minorHalfDiminished.filter((n) => n >= 2).length).toBeGreaterThan(minorHalfDiminished.length / 2);
  });

  it('varies the pre-chorus', () => {
    const pres = Array.from({ length: 150 }, (_, i) => Song.generate(`pre${i}`)).flatMap((song) => {
      const [mat, sec] = [song.part('pre'), song.form.first('pre')];
      return mat && sec ? [{ mat, bars: sec.bars }] : [];
    });
    expect(new Set(pres.map((p) => p.mat.variant))).toEqual(new Set(Object.keys(PRE_FLAVOURS)));
    expect(new Set(pres.map((p) => p.bars))).toEqual(new Set([2, 4, 6, 8]));
    for (const { mat, bars } of pres) {
      expect(mat.bars).toHaveLength(bars);
      expect(mat.melody.bars).toHaveLength(bars);
    }
  });

  it.each(Object.keys(TONALITIES) as Mode[])('lifts the key up through varied %s turnarounds', (mode) => {
    const songs: Song[] = [];
    for (let i = 0; songs.length < 200; i++) {
      const song = Song.generate(`lift${i}`);
      if (song.key.mode === mode) songs.push(song);
    }
    const used = new Set<string>();
    const styles = new Set<string>();
    let multiple = 0;
    for (const song of songs) {
      const lifts = song.form.ofType('lift');
      const mats = song.parts('lift');
      expect(mats).toHaveLength(lifts.length);
      if (lifts.length > 1) multiple++;
      // Each lift goes up from the key before it, never past the cap.
      let shift = 0;
      for (const [i, sec] of song.form.sections.entries()) {
        if (sec.type === 'lift') {
          expect(sec.liftTo).toBeGreaterThan(shift);
          expect(sec.liftTo).toBeLessThanOrEqual(MAX_SHIFT);
          expect(song.form.at(i + 1)).toMatchObject({ type: 'chorus', shift: sec.liftTo });
          shift = sec.liftTo;
        } else if (song.form.sections.slice(0, i).some((s) => s.type === 'lift')) {
          expect(sec.shift).toBe(shift);
        }
      }
      lifts.forEach((sec, i) => {
        const lift = mats[i];
        used.add(lift.turnaround);
        styles.add(lift.variant);
        // Each lift is played differently from the one before.
        if (i) expect(lift.variant).not.toBe(mats[i - 1].variant);
        expect(lift.turnaround).toBe(sec.turnaround);
        expect(lift.key.tonic).toBe((song.key.tonic + sec.liftTo) % 12);
        expect(lift.key.mode).toBe(mode);
        expect(lift.bars).toHaveLength(sec.bars);
        for (const chord of lift.bars.flat()) expect(MODES).toHaveProperty([defined(chord.scale, 'a chord-scale')]);
        expect(lift.bass.bars).toHaveLength(sec.bars);
      });
    }
    expect(multiple).toBeGreaterThan(10);
    expect(used).toEqual(new Set(Object.keys(TONALITIES[mode].turnarounds)));
    expect(styles).toEqual(new Set(Object.keys(LIFT_STYLES)));
  });

  it('varies the intro', () => {
    const intros = Array.from({ length: 150 }, (_, i) => defined(Song.generate(`intro${i}`).part('intro'), 'an intro'));
    expect(new Set(intros.map((m) => m.variant))).toEqual(new Set(Object.keys(INTRO_TEXTURES)));
    expect(new Set(intros.map((m) => m.harmony))).toEqual(new Set(INTRO.harmony.map(([name]) => name)));
  });

  it('winds down in an outro of either style', () => {
    const songs = Array.from({ length: 150 }, (_, i) => Song.generate(`outro${i}`));
    const styles = new Set<string>();
    for (const song of songs) {
      const sec = song.form.first('outro');
      if (!sec) continue;
      const mat = song.material(sec);
      styles.add(mat.variant);
      expect(mat.variant).toBe(sec.variant);
      expect(sec.bars).toBe(OUTRO_STYLES[mat.variant].bars);
      if (mat.variant === 'trade') {
        // A line for every bar, over a vamp, for the soloists to trade.
        expect(mat.bars).toHaveLength(sec.bars);
        expect(mat.solo.bars).toHaveLength(sec.bars);
        expect(mat.bass.bars).toHaveLength(sec.bars);
        expect(new Set(mat.soloists).size).toBe(2);
        for (const i of song.soloists) expect(mat.soloists.slice(0, song.soloists.length)).toContain(i);
      } else {
        const intro = defined(song.part('intro'), 'an intro');
        expect(mat.bars).toBe(intro.bars);
        expect(mat.melody).toBe(intro.melody);
      }
    }
    expect(styles).toEqual(new Set(['reprise', 'trade']));
  });

  it('varies the finale', () => {
    const endings = Array.from(
      { length: 100 },
      (_, i) => defined(Song.generate(`finale${i}`).part('finale'), 'a finale').variant,
    );
    expect(new Set(endings)).toEqual(new Set(Object.keys(FINALE_STYLES)));
  });

  it('varies the phrase form of each melody', () => {
    const songs = Array.from({ length: 100 }, (_, i) => Song.generate(`phrase${i}`));
    const forms = (type: 'verse' | 'chorus' | 'bridge') =>
      new Set(songs.flatMap((song) => song.part(type)?.melody.form ?? []));
    const all = ['period', 'pairs', 'sentence', 'aaba', 'callResponse'];
    expect(forms('chorus')).toEqual(new Set(all));
    expect(forms('verse')).toEqual(new Set(all));
    expect(forms('bridge')).toEqual(new Set(all.filter((f) => f !== 'callResponse')));
    for (const song of songs) {
      const chorus = defined(song.part('chorus'), 'a chorus');
      expect(chorus.melody.bars).toHaveLength(chorus.bars.length);
    }
  });
});
