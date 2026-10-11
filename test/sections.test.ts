import { describe, expect, it } from 'vitest';
import {
  Bridge,
  Chorus,
  Finale,
  Intro,
  Lift,
  Outro,
  PreChorus,
  ScoreArranger,
  SoloSection,
  Song,
  Vamp,
  Verse,
  type Grace,
} from '../src/engine';
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
      const vamp = song.part(Vamp);
      if (vamp) entries.add(vamp.variant);
      else expect(song.form.sections.some((s) => s instanceof Vamp)).toBe(false);
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
    const minorIvBVII: number[] = [];
    for (const song of songs) {
      for (const [i, sec] of song.form.ofType(SoloSection).entries()) {
        const mat = sec.material;
        // The first over the band, the next never over what the one before had.
        expect(mat.variant).toBe(i % 2 ? 'bossa' : 'band');
        // The changes and the line fill the section: nothing loops.
        expect(mat.bars).toHaveLength(sec.bars);
        expect(mat.solo.bars).toHaveLength(sec.bars);
        for (const n of mat.solo.bars.flat()) {
          notes++;
          if (n.grace) graces.push(n.grace);
        }
        for (const [k, { grace, degree }] of mat.solo.bars.flat().entries()) {
          if (!grace) continue;
          const { from, chromatic, semis } = grace;
          expect(Math.sign(semis)).toBe(from);
          // In the direction of the phrase: from below on the way up, from above on the way down.
          const prev = mat.solo.bars.flat()[k - 1]?.degree;
          if (prev !== undefined && prev !== degree) expect(from).toBe(Math.sign(prev - degree));
          expect(Math.abs(semis)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(semis)).toBeLessThanOrEqual(chromatic ? 1 : 3); // up to an augmented second
        }
        // In the score, a flicked grace note is a third of a sixteenth just
        // before its note, a step or a semitone away; a slurred one slides in.
        const index = song.form.sections.indexOf(sec);
        const start = song.form.starts[index];
        const played = new ScoreArranger(song)
          .arrange()
          .notes.filter((n) => n.path?.startsWith('soloists.') && n.time >= start && n.time < start + sec.bars)
          .sort((x, y) => x.time - y.time);
        const flicks = played.flatMap((n, k) => (Math.abs(n.dur - 1 / 48) < 1e-9 ? [[n, played[k + 1]] as const] : []));
        expect(flicks.length).toBe(mat.solo.bars.flat().filter((n) => n.grace && !n.grace.slur).length);
        for (const [flick, note] of flicks) {
          const step = Math.abs(defined(flick.note, 'a pitch') - defined(note?.note, 'the note after a flick'));
          expect(step).toBeGreaterThanOrEqual(1);
          expect(step).toBeLessThanOrEqual(3);
        }
        expect(played.filter((n) => n.slide).length).toBe(mat.solo.bars.flat().filter((n) => n.grace?.slur).length);
        if (sec.bars === 16) {
          sixteens++;
          const names = mat.bars.map((b) => b.map((c) => c.name(song.key)).join(' '));
          expect(names.slice(0, 8)).not.toEqual(names.slice(8));
        }
        if (mat.bars.some((b) => b.length > 1)) split++; // reharmonised
        const first = mat.bars[0][0];
        if (first.root === song.key.tonic && first.cls === TONALITIES[song.key.mode].tonic) fromHome++;
        if (song.key.mode === 'minor') {
          // A bVII dominant after a minor chord a fourth below it (iv-bVII, in whichever key).
          const chords = mat.bars.flat();
          minorIvBVII.push(
            chords.filter(
              (c, i) => i > 0 && c.dominant && chords[i - 1].minorish && (c.root - chords[i - 1].root + 12) % 12 === 5,
            ).length,
          );
        }
      }
    }
    expect(sixteens).toBeGreaterThan(10);
    expect(split).toBeGreaterThan(20);
    expect(fromHome).toBeGreaterThan(10);
    // Some notes get grace notes, mostly chromatic ones, from either side.
    expect(graces.length / notes).toBeGreaterThan(0.05);
    expect(graces.length / notes).toBeLessThan(0.2);
    expect(graces.filter((g) => g.chromatic).length).toBeGreaterThan(graces.length / 2);
    expect(graces.some((g) => !g.chromatic)).toBe(true);
    expect(graces.some((g) => g.from === 1)).toBe(true);
    expect(graces.some((g) => g.from === -1)).toBe(true);
    const slurred = graces.filter((g) => g.slur).length / graces.length;
    expect(slurred).toBeGreaterThan(0.4);
    expect(slurred).toBeLessThan(0.8);
    // Minor solos move through iv-bVIIs, not dark ii-Vs.
    expect(minorIvBVII.filter((n) => n >= 2).length).toBeGreaterThan(minorIvBVII.length / 2);
  });

  it('varies the pre-chorus', () => {
    const pres = Array.from({ length: 150 }, (_, i) => Song.generate(`pre${i}`)).flatMap((song) => {
      const [mat, sec] = [song.part(PreChorus), song.form.first(PreChorus)];
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
      const lifts = song.form.ofType(Lift);
      const mats = song.parts(Lift);
      expect(mats).toHaveLength(lifts.length);
      if (lifts.length > 1) multiple++;
      // Each lift goes up from the key before it, never past the cap.
      let shift = 0;
      for (const [i, sec] of song.form.sections.entries()) {
        if (sec instanceof Lift) {
          expect(sec.shift).toBeGreaterThan(shift);
          expect(sec.shift).toBeLessThanOrEqual(MAX_SHIFT);
          const next = defined(song.form.at(i + 1), 'a chorus');
          expect(next).toBeInstanceOf(Chorus);
          expect(next.shift).toBe(sec.shift);
          if (next instanceof Chorus) expect(sec.material.into).toBe(next.material.bars[0][0]);
          shift = sec.shift;
        } else if (song.form.sections.slice(0, i).some((s) => s instanceof Lift)) {
          expect(sec.shift).toBe(shift);
        }
      }
      lifts.forEach((sec, i) => {
        const lift = mats[i];
        used.add(sec.turnaround);
        styles.add(lift.variant);
        // Each lift is played differently from the one before.
        if (i) expect(lift.variant).not.toBe(mats[i - 1].variant);
        // Written in the song's key, played shifted up into the new one.
        expect(lift.key).toEqual(song.key);
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
    const intros = Array.from({ length: 150 }, (_, i) => defined(Song.generate(`intro${i}`).part(Intro), 'an intro'));
    expect(new Set(intros.map((m) => m.variant))).toEqual(new Set(Object.keys(INTRO_TEXTURES)));
    expect(new Set(intros.map((m) => m.harmony))).toEqual(new Set(Object.keys(INTRO.harmony)));
  });

  it('winds down in an outro of either style', () => {
    const songs = Array.from({ length: 150 }, (_, i) => Song.generate(`outro${i}`));
    const styles = new Set<string>();
    for (const song of songs) {
      const sec = song.form.first(Outro);
      if (!sec) continue;
      const mat = sec.material;
      styles.add(sec.variant);
      expect(sec.bars).toBe(OUTRO_STYLES[sec.variant].bars);
      expect(!!mat.trade).toBe(sec.variant === 'trade');
      if (mat.trade) {
        // A line for every bar, over a vamp, for the soloists to trade.
        const { solo, soloists } = mat.trade;
        expect(mat.bars).toHaveLength(sec.bars);
        expect(solo.bars).toHaveLength(sec.bars);
        expect(mat.bass.bars).toHaveLength(sec.bars);
        expect(new Set(soloists).size).toBe(2);
        for (const i of song.soloists) expect(soloists.slice(0, song.soloists.length)).toContain(i);
      } else {
        const intro = defined(song.part(Intro), 'an intro');
        expect(mat.bars).toBe(intro.bars);
        expect(mat.melody).toBe(intro.melody);
      }
    }
    expect(styles).toEqual(new Set(['reprise', 'trade']));
  });

  it('varies the finale', () => {
    const endings = Array.from(
      { length: 100 },
      (_, i) => defined(Song.generate(`finale${i}`).part(Finale), 'a finale').variant,
    );
    expect(new Set(endings)).toEqual(new Set(Object.keys(FINALE_STYLES)));
  });

  it('varies the phrase form of each melody', () => {
    const songs = Array.from({ length: 100 }, (_, i) => Song.generate(`phrase${i}`));
    const forms = (kind: typeof Verse | typeof Chorus | typeof Bridge) =>
      new Set(songs.flatMap((song) => song.part(kind)?.melody.form ?? []));
    const all = ['period', 'pairs', 'sentence', 'aaba', 'callResponse'];
    expect(forms(Chorus)).toEqual(new Set(all));
    expect(forms(Verse)).toEqual(new Set(all));
    expect(forms(Bridge)).toEqual(new Set(all.filter((f) => f !== 'callResponse')));
    for (const song of songs) {
      const chorus = defined(song.part(Chorus), 'a chorus');
      expect(chorus.melody.bars).toHaveLength(chorus.bars.length);
    }
  });
});
