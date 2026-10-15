import { describe, expect, it } from 'vitest';
import {
  Chorus,
  DrumBreak,
  Finale,
  Intro,
  PreChorus,
  ScoreArranger,
  ShortBar,
  Song,
  Swell,
  Vamp,
  Verse,
} from '../src/engine';
import { BALLAD, BALLAD_FEELS, TONALITIES } from '../src/style';
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
      // Its intros (and a swell before them, if any) open it, after a pickup at most.
      const intros = kinds.flatMap((k, i) => (k === Intro || k === Swell ? [i] : []));
      intros.forEach((at, i) => expect(at).toBe(i + Number(kinds[0] === ShortBar)));
      // It ends on the finale, or fades out over its last sections (and has no finale).
      const fades = song.form.fadeFrom !== undefined;
      if (fades) {
        expect(kinds).not.toContain(Finale);
        expect(song.form.sections.at(-1)?.fade).toBe(true);
        const from = song.form.sections.findIndex((s) => s.fade);
        expect(song.form.sections.slice(from).every((s) => s.fade)).toBe(true);
        expect(song.bars - defined(song.form.fadeFrom, 'a fade')).toBeGreaterThanOrEqual(12);
      } else expect(kinds.at(-1)).toBe(Finale);
      // It has a chorus, or (Sparkle's way) verses and their B.
      if (!kinds.includes(Chorus)) expect(kinds).toEqual(expect.arrayContaining([Verse, PreChorus]));
      // A pre-chorus only follows a verse; every chorus is as long as the others.
      if (!kinds.includes(Verse)) expect(kinds).not.toContain(PreChorus);
      const choruses = song.form.ofType(Chorus);
      if (choruses.length) expect(new Set(choruses.filter((c) => !c.half).map((c) => c.bars)).size).toBe(1);
      // The last chorus has everything.
      if (choruses.length) expect(choruses.at(-1)?.big).toBe(true);
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
      const ending = song.part(Finale);
      if (ending?.ends === 'tonic') {
        const fin = ending.chord;
        expect(fin.root).toBe(song.key.tonic);
        expect(fin.cls).toBe(tonic);
        expect(finale.map(([symbol]) => symbol)).toContain(fin.symbol);
      }
    }
  });

  it('mixes its forms from independent rolls: verses or none, choruses of 8, 10 or 16 bars', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`form${i}`));
    const shape = (song: Song) =>
      `${song.form.first(Verse) ? 'verses' : 'no verses'}, ${song.form.first(Chorus)?.bars} bar choruses`;
    const seen = new Set(songs.map(shape));
    for (const verses of ['verses', 'no verses'])
      for (const bars of [8, 10, 16]) expect(seen).toContain(`${verses}, ${bars} bar choruses`);
    // J-Cycle's way among them: an intro and a vamp into sixteen-bar themes, with no verses.
    expect(
      songs.some(
        (song) => !song.form.first(Verse) && song.form.at(1)?.kind === Vamp && song.form.first(Chorus)?.bars === 16,
      ),
    ).toBe(true);
  });

  it('now and then swings only its guitar, melody voices and bells, the rest straight', () => {
    const song = defined(
      Array.from({ length: 200 }, (_, i) => Song.generate(`swingOnly${i}`)).find((s) => s.swingOnly),
      'a song swinging some parts',
    );
    expect(song.swingUnit).toBe(16);
    const notes = new ScoreArranger(song).arrange().notes;
    // (Times in bars: a straight note on a thirty-second, but for a few triplets.)
    const onGrid = (n: { time: number }) => Math.abs(n.time * 32 - Math.round(n.time * 32)) < 1e-9;
    const straight = notes.filter((n) => n.path === 'bass' || n.path === 'kit');
    expect(straight.filter(onGrid).length).toBeGreaterThan(straight.length * 0.99);
    // (A melody's cells are mostly eighths, which sixteenths' swing leaves be: a soloist's sixteenths swing.)
    const swingers = notes.filter((n) => n.path && song.swings(n.path));
    expect(swingers.some((n) => !onGrid(n))).toBe(true);
  });

  it('leans slower songs towards ballads: swung in eighths, eased grooves, easing back each phrase', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`ballad${i}`));
    const [slowest, fastest] = BALLAD.tempo;
    const ballads = songs.filter((s) => s.bpm <= slowest);
    const between = songs.filter((s) => s.bpm > slowest && s.bpm < fastest);
    expect(ballads.length).toBeGreaterThan(5);
    // Fully leaning: everything a ballad does (its swing in eighths and its
    // easing back most of the time, BALLAD.most).
    let paired = 0;
    const swung = ballads.filter((s) => s.swingUnit === 8);
    const eased = ballads.filter((s) => s.traits.ritard !== undefined);
    for (const group of [swung, eased]) {
      expect(group.length).toBeGreaterThan(ballads.length / 2);
      expect(group.length).toBeLessThan(ballads.length);
    }
    for (const song of ballads) {
      expect(song.traits.lock).toBe(false);
      expect(song.form.first(DrumBreak)).toBeUndefined();
      for (const mat of Object.values(materials(song))) {
        if (!('drums' in mat) || !('bass' in mat)) continue;
        // No grooving feel the ballad's eases.
        expect(Object.keys(BALLAD_FEELS.drums)).not.toContain(mat.drums.feel);
        expect(Object.keys(BALLAD_FEELS.bass)).not.toContain(mat.bass.feel);
      }
      // Two chords a bar, in a song that pairs them.
      const chorus = defined(song.part(Chorus), 'a chorus');
      if (song.traits.paired && chorus.bars.slice(0, 8).every((bar) => bar.length === 2)) paired++;
      // Easing back at the end of a four-bar phrase, if it does: all the way.
      if (!song.traits.ritard) continue;
      expect(song.traits.ritard).toBe(BALLAD.ritard);
      expect(song.timeline.tempoChanges.some((t) => Math.abs(t.bpm - song.bpm * BALLAD.ritard) < 1e-9)).toBe(true);
      // And at the end of a section that keeps time but ends between its phrases (an intro's tail, a ten-bar
      // chorus), its last beat eased back too.
      song.form.sections.forEach((sec, i) => {
        if (sec.tempo.length || sec.bars < 1 || sec.bars % 4 === 0) return;
        const end = song.form.starts[i] + sec.bars;
        expect(song.timeline.bpmAt(end - 0.125)).toBeCloseTo(song.bpm * BALLAD.ritard);
        if (sec.bars % 4 > 0.5) expect(song.timeline.bpmAt(end - 0.375)).toBeCloseTo(song.bpm);
      });
    }
    expect(paired).toBeGreaterThan(0);
    // Not leaning at all: none of it.
    for (const song of songs.filter((s) => s.bpm >= fastest)) {
      expect(song.swingUnit).toBe(16);
      expect(song.traits.ritard).toBeUndefined();
      expect(song.traits.paired).toBeUndefined();
    }
    // In between, some of it: each rolled on its own.
    expect(new Set(between.map((s) => s.swingUnit))).toEqual(new Set([8, 16]));
    expect(between.some((s) => (s.swingUnit === 8) !== (s.traits.ritard !== undefined))).toBe(true);
    for (const song of between) if (song.traits.ritard) expect(song.traits.ritard).toBeGreaterThan(BALLAD.ritard);
    // Its melodies in longer notes: fewer notes a bar, the slower it is.
    const perBar = (group: readonly Song[]) => {
      const bars = group.flatMap((song) => song.part(Verse)?.melody.bars ?? []);
      return bars.reduce((n, notes) => n + notes.length, 0) / bars.length;
    };
    expect(perBar(ballads)).toBeLessThan(perBar(songs.filter((s) => s.bpm >= fastest)) * 0.85);
  });
});
