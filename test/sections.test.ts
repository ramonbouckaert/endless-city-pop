import { describe, expect, it } from 'vitest';
import {
  Breakdown,
  Bridge,
  Chorus,
  Finale,
  Intro,
  Lift,
  OWN,
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
  FINALE_CHORDS,
  FINALE_STYLES,
  RESOLVED_FINALES,
  INTRO,
  INTRO_TEXTURES,
  LIFT_STYLES,
  MAX_SHIFT,
  OUTRO_STYLES,
  PRE_FLAVOURS,
  RISER,
  TRILL,
  VERSE_TEXTURES,
  TONALITIES,
} from '../src/style';
import { PERCUSSION } from '../src/lib/general-midi';
import { MODES, type Bar, type Mode } from '../src/theory';
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
        // before its note, a step or a semitone away; a slurred one slides
        // in.
        const index = song.form.sections.indexOf(sec);
        const start = song.form.starts[index];
        // (Unswung, so a note's length is as written.)
        const played = new ScoreArranger(new Song({ ...song, swing: 0 }))
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
        // The rest is of the mode's solo changes (the others loop the song's).
        if (mat.over !== 'cycle') continue;
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

  it("plays some solos over the song's own changes", () => {
    const solos = Array.from({ length: 200 }, (_, i) => Song.generate(`over${i}`)).flatMap((song) =>
      song.form.ofType(SoloSection).map((sec) => ({ song, sec })),
    );
    const overs = new Set<string>();
    for (const { song, sec } of solos) {
      const { over, bars } = sec.material;
      const names = (chords: readonly Bar[]) => chords.map((bar) => bar.map((c) => c.name(song.key)).join(' '));
      overs.add(over);
      if (over === 'verse') expect(song.form.first(Verse)).toBeDefined();
      // An interlude is in a key of its own, and comes home; the rest are in the song's.
      if (over === 'interlude') expect(sec.material.key).not.toEqual(song.key);
      else expect(sec.material.key).toEqual(song.key);
      // A loop of the chorus that comes round whole is the chorus's chords, over and over.
      const chorus = song.part(Chorus);
      if (over === 'chorus' && chorus && sec.bars % chorus.bars.length === 0) {
        expect(names(bars.slice(0, chorus.bars.length))).toEqual(names(chorus.bars));
      }
    }
    expect(overs).toEqual(new Set(['cycle', 'chorus', 'verse', 'intro', 'vamp', 'interlude']));
  });

  it("plays some minor songs' choruses in the relative major", () => {
    const minor = Array.from({ length: 300 }, (_, i) => Song.generate(`rel${i}`)).filter(
      (song) => song.key.mode === 'minor' || song.key.mode === 'dorian',
    );
    let relative = 0;
    for (const song of minor) {
      const chorus = defined(song.part(Chorus), 'a chorus');
      if (chorus.key.mode !== 'major') {
        expect(chorus.key).toEqual(song.key);
        continue;
      }
      relative++;
      expect(chorus.key.tonic).toBe(song.key.majorTonic);
      // The intro playing the hook is in its key too.
      const intro = song.part(Intro);
      if (intro?.harmony === 'hook') expect(intro.key).toEqual(chorus.key);
    }
    expect(relative).toBeGreaterThan(5);
    expect(relative).toBeLessThan(minor.length / 2);
  });

  it('plays a verse in full, sparsely, or building into the chorus', () => {
    const verses = Array.from({ length: 200 }, (_, i) => Song.generate(`vtex${i}`)).flatMap((song) =>
      song.form.ofType(Verse).map((sec) => ({ song, sec })),
    );
    expect(new Set(verses.map(({ sec }) => sec.material.variant))).toEqual(new Set(Object.keys(VERSE_TEXTURES)));
    for (const { song, sec } of verses.filter(({ sec }) => sec.material.variant === 'build').slice(0, 10)) {
      // Building, nothing but kick, bass, keys and lead in its first quarter.
      const index = song.form.sections.indexOf(sec);
      const start = song.form.starts[index];
      const early = new ScoreArranger(song)
        .arrange()
        .notes.filter((n) => n.time >= start && n.time < start + Math.floor(sec.bars / 4));
      for (const n of early) expect(['kit', 'bass', 'keys', 'lead']).toContain(n.path);
    }
  });

  it('varies the pre-chorus', () => {
    const pres = Array.from({ length: 150 }, (_, i) => Song.generate(`pre${i}`)).flatMap((song) => {
      const [mat, sec] = [song.part(PreChorus), song.form.first(PreChorus)];
      return mat && sec ? [{ mat, bars: sec.bars }] : [];
    });
    expect(new Set(pres.map((p) => p.mat.variant))).toEqual(new Set(Object.keys(PRE_FLAVOURS)));
    expect(new Set(pres.map((p) => p.bars))).toEqual(new Set([2, 4, 6, 7, 8]));
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
    // Every one of the tonality's turnarounds, and the chorus's own bent onto the new V.
    expect(used).toEqual(new Set([...Object.keys(TONALITIES[mode].turnarounds), OWN]));
    expect(styles).toEqual(new Set(Object.keys(LIFT_STYLES)));
  });

  it('varies the intro', () => {
    const songs = Array.from({ length: 200 }, (_, i) => Song.generate(`intro${i}`));
    const intros = songs.flatMap((song) =>
      song.form
        .ofType(Intro)
        .filter((s) => !s.free)
        .map((s) => s.material),
    );
    expect(new Set(intros.map((m) => m.variant))).toEqual(new Set(Object.keys(INTRO_TEXTURES)));
    expect(new Set(intros.map((m) => m.harmony))).toEqual(new Set(Object.keys(INTRO.harmony)));
    // Some songs have none; some open with a free intro, out of tempo, before the one in time.
    expect(songs.some((song) => !song.form.first(Intro))).toBe(true);
    const free = songs.filter((song) => song.form.first(Intro)?.free);
    expect(free.length).toBeGreaterThan(5);
    for (const song of free) {
      const [first, second] = song.form.sections;
      expect(first.material).toMatchObject({ variant: 'rubato' });
      expect(second).toBeInstanceOf(Intro);
      // It opens the song slower than its tempo, and the song comes up to tempo after it.
      const [start] = song.timeline.tempoChanges;
      expect(start.bpm).toBeLessThan(song.bpm);
      expect(song.timeline.bpmAt(first.bars)).toBe(song.bpm);
    }
  });

  it('winds down in an outro of every style', () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`outro${i}`));
    const styles = new Set<string>();
    for (const song of songs) {
      const sec = song.form.first(Outro);
      if (!sec) continue;
      const mat = sec.material;
      styles.add(sec.variant);
      expect(sec.bars).toBe(OUTRO_STYLES[sec.variant].bars);
      expect(!!mat.trade).toBe(sec.variant === 'trade');
      expect(!!mat.adLib).toBe(sec.variant === 'coda');
      expect(!!mat.hook).toBe(sec.variant === 'loop');
      // Only a trade leads to either ending; a reprise to the finale, a coda or a loop to a fade.
      if (sec.variant !== 'trade') expect(!!sec.fade).toBe(sec.variant !== 'reprise');
      if (mat.adLib || mat.hook) {
        expect(mat.bars).toHaveLength(sec.bars);
        expect(sec.fade).toBe(true);
      } else if (mat.trade) {
        // A line for every bar, over a vamp, for the soloists to trade.
        const { solo, soloists } = mat.trade;
        expect(mat.bars).toHaveLength(sec.bars);
        expect(solo.bars).toHaveLength(sec.bars);
        expect(mat.bass.bars).toHaveLength(sec.bars);
        expect(new Set(soloists).size).toBe(2);
        for (const i of song.soloists) expect(soloists.slice(0, song.soloists.length)).toContain(i);
      } else {
        const intro = defined(
          song.form.ofType(Intro).find((s) => !s.free),
          'an intro in time',
        ).material;
        expect(mat.bars).toBe(intro.bars);
        expect(mat.melody).toBe(intro.melody);
      }
    }
    expect(styles).toEqual(new Set(Object.keys(OUTRO_STYLES)));
  });

  it('varies the finale, and leaves some open', () => {
    const finales = Array.from({ length: 300 }, (_, i) => Song.generate(`finale${i}`)).flatMap((song) => {
      const mat = song.part(Finale);
      return mat ? [{ song, mat }] : [];
    });
    expect(new Set(finales.map(({ mat }) => mat.variant))).toEqual(new Set(Object.keys(FINALE_STYLES)));
    expect(new Set(finales.map(({ mat }) => mat.ends))).toEqual(new Set(Object.keys(FINALE_CHORDS)));
    for (const { song, mat } of finales) {
      const { chord, ends, variant } = mat;
      // Only the key's own chord slides or ends on a fermata.
      if (ends !== 'tonic') expect(RESOLVED_FINALES).not.toContain(variant);
      if (ends === 'V') expect(chord.root).toBe((song.key.tonic + 7) % 12);
      if (ends === 'sus') {
        expect(chord.root).toBe(song.key.tonic);
        expect(['sus2', '9sus']).toContain(chord.symbol);
      }
    }
  });

  it('varies the phrase form of each melody', () => {
    const songs = Array.from({ length: 200 }, (_, i) => Song.generate(`phrase${i}`));
    const forms = (kind: typeof Verse | typeof Chorus | typeof Bridge) =>
      new Set(songs.flatMap((song) => song.part(kind)?.melody.form ?? []));
    const all = ['period', 'pairs', 'sentence', 'aaba', 'callResponse'];
    // Sixteen bars in four-bar phrases: a theme, or a long verse.
    const long = ['theme', 'pairs4'];
    expect(forms(Chorus)).toEqual(new Set([...all, ...long]));
    expect(forms(Verse)).toEqual(new Set([...all, ...long]));
    expect(forms(Bridge)).toEqual(new Set(all.filter((f) => f !== 'callResponse')));
    for (const song of songs) {
      const chorus = defined(song.part(Chorus), 'a chorus');
      expect(chorus.melody.bars).toHaveLength(chorus.bars.length);
    }
  });

  it('never plays a verse shorter than its material', () => {
    for (let i = 0; i < 300; i++) {
      const song = Song.generate(`verses${i}`);
      const mat = song.part(Verse);
      if (!mat) continue;
      const shortest = Math.min(...song.form.ofType(Verse).map((v) => v.bars));
      expect(mat.bass.bars.length).toBeLessThanOrEqual(shortest);
    }
  });

  it("sings a theme in four-bar phrases, resting each phrase's last bar but the last", () => {
    const themes = Array.from({ length: 200 }, (_, i) => Song.generate(`theme${i}`))
      .map((song) => song.part(Chorus))
      .filter((c) => c?.melody.form === 'theme');
    expect(themes.length).toBeGreaterThan(0);
    for (const chorus of themes) {
      // (A twenty-bar chorus is a theme with a tag.)
      const all = defined(chorus, 'a theme').melody.rests;
      expect([16, 20]).toContain(all.length);
      const rests = all.slice(0, 16);
      expect([3, 7, 11].every((b) => rests[b])).toBe(true);
      expect(rests.filter(Boolean)).toHaveLength(3);
    }
  });

  it('answers a hook in its gaps, one note at a time, until the hook comes back', () => {
    const choruses = Array.from({ length: 150 }, (_, i) =>
      defined(Song.generate(`answer${i}`).part(Chorus), 'a chorus'),
    ).filter((c) => c.variant !== 'line' && c.variant !== 'echo');
    expect(choruses.length).toBeGreaterThan(0);
    const spans = (bars: { start: number; len: number }[][]) =>
      bars.flatMap((notes, b) => notes.map((n) => [b * 16 + n.start, b * 16 + n.start + n.len] as const));
    for (const { melody, answer } of choruses) {
      const hook = spans(melody.bars);
      const notes = spans(answer.bars).sort((a, b) => a[0] - b[0]);
      notes.forEach(([start, end], i) => {
        if (i) expect(start).toBeGreaterThanOrEqual(notes[i - 1][1]);
        const back = hook.find(([s]) => s >= start);
        if (back) expect(end).toBeLessThanOrEqual(back[0]);
      });
    }
  });

  it('now and then holds a moment of tension mid-song on a fermata', () => {
    const tense = [PreChorus, Bridge, Breakdown, Lift];
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`tension${i}`));
    const holding = songs.filter((song) => song.form.sections.some((sec) => sec.fermata));
    // Now and then: a song in three or so.
    expect(holding.length).toBeGreaterThan(50);
    expect(holding.length).toBeLessThan(140);
    for (const song of holding) {
      const held = song.form.sections.filter((sec) => sec.fermata);
      expect(held).toHaveLength(1);
      const [sec] = held;
      expect(tense).toContain(sec.kind);
      expect(sec.describe()).toContain('fermata');
      // Its last bar: everything stops on the downbeat, where the band
      // hits and holds a chord under a crash, a reverse cymbal swelling on.
      const i = song.form.sections.indexOf(sec);
      const last = song.form.starts[i] + sec.bars - 1;
      const inLast = new ScoreArranger(song).arrange().notes.filter((n) => n.time >= last && n.time < last + 1);
      const played = inLast.filter((n) => n.path);
      expect(played.every((n) => Math.abs(n.time - last) < 1e-9)).toBe(true);
      expect(played.some((n) => n.program === 'drums' && n.note === PERCUSSION.crash)).toBe(true);
      expect(played.filter((n) => n.path === 'keys').length).toBeGreaterThan(1);
      expect(inLast.some((n) => n.program === RISER)).toBe(true);
    }
  });

  it('trills a chorus coming back by its own chance, whatever its length', () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`trill${i}`));
    const trilling = songs.filter((song) => song.part(Chorus)?.trill);
    // About TRILL.chance of songs.
    expect(trilling.length).toBeGreaterThan(300 * TRILL.chance * 0.6);
    expect(trilling.length).toBeLessThan(300 * TRILL.chance * 1.4);
    const lengths = new Set<number>();
    for (const song of songs) {
      // (Unswung, so a note's length is as written.)
      const { notes } = new ScoreArranger(new Song({ ...song, swing: 0 })).arrange();
      song.form.sections.forEach((sec, i) => {
        if (!(sec instanceof Chorus)) return;
        const start = song.form.starts[i];
        // A trill's notes are thirty-seconds: no other lead note is.
        const shakes = notes.filter(
          (n) => n.path === 'lead' && n.time >= start && n.time < start + sec.bars && Math.abs(n.dur - 1 / 32) < 1e-9,
        );
        // Whether its hook (all of it, or its second half) has a note to trill: the trill finds one.
        const mat = sec.material;
        const holds = mat.melody.trilled((s) => s + 2) !== mat.melody;
        const trills = mat.trill && holds && song.form.repeatOf(i) > 0;
        expect(shakes.length > 0, `${song.seed} chorus ${i}`).toBe(trills);
        if (trills) lengths.add(sec.bars);
      });
    }
    // Not only the sixteen-bar themes.
    expect([...lengths].some((bars) => bars < 16)).toBe(true);
  });
});
