import { describe, expect, it } from 'vitest';
import {
  Breakdown,
  Bridge,
  Chorus,
  Finale,
  Intro,
  Lift,
  Link,
  OWN,
  Outro,
  PreChorus,
  Riff,
  ScoreArranger,
  sings,
  SoloSection,
  Song,
  Swell,
  Vamp,
  Verse,
  type Grace,
} from '../src/engine';
import {
  BALLAD,
  FINALE_AFTER,
  FINALE_CHORDS,
  FINALE_EASE,
  FINALE_STYLES,
  FINALE_SUITS,
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
import { MODES, Roman, type Bar, type Mode } from '../src/theory';
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
      // Over the chorus only in a song that has one.
      if (over === 'chorus') expect(song.part(Chorus)).toBeDefined();
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
      (song) => (song.key.mode === 'minor' || song.key.mode === 'dorian') && song.part(Chorus),
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
    expect(new Set(pres.map((p) => p.bars))).toEqual(new Set([2, 4, 6, 7, 8, 16]));
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
      // Each lift goes up from the key before it, never past the cap, into
      // a chorus or (at the end) a verse; or, mid-song, turns round into
      // the chorus again in the same key.
      let shift = 0;
      for (const [i, sec] of song.form.sections.entries()) {
        if (sec instanceof Lift) {
          const next = defined(song.form.at(i + 1), 'a chorus or verse');
          if (sec.shift === shift) {
            expect(next).toBeInstanceOf(Chorus);
            expect(song.form.at(i - 1)).toBeInstanceOf(Chorus);
          } else expect(sec.shift).toBeGreaterThan(shift);
          expect(sec.shift).toBeLessThanOrEqual(MAX_SHIFT);
          expect([Chorus, Verse]).toContain(next.kind);
          expect(next.shift).toBe(sec.shift);
          if (next instanceof Chorus || next instanceof Verse) expect(sec.material.into).toBe(next.material.bars[0][0]);
          shift = sec.shift;
        } else if (song.form.sections.slice(0, i).some((s) => s instanceof Lift && s.shift > 0)) {
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
    // A quiet one may have waves on the shore under it; no other does.
    const shores = intros.filter((m) => m.seashore);
    expect(shores.length).toBeGreaterThan(0);
    for (const m of shores) expect(['pads', 'rubato']).toContain(m.variant);
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
      // It leads only to an ending it may (a reprise to the finale, a loop or an obbligato to a fade), in one of
      // its lengths before that ending (a coda fifteen bars only before the finale).
      expect(OUTRO_STYLES[sec.variant].bars[sec.fade ? 'fade' : 'finale']).toContain(sec.bars);
      expect(!!mat.trade).toBe(sec.variant === 'trade');
      expect(!!mat.adLib).toBe(['coda', 'cadence', 'obbligato'].includes(sec.variant));
      expect(!!mat.hook).toBe(sec.variant === 'loop');
      if (mat.adLib || mat.hook) {
        expect(mat.bars).toHaveLength(sec.bars);
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
    // (The bare tonic only after a riff.)
    expect(new Set(finales.map(({ mat }) => mat.ends))).toEqual(new Set([...Object.keys(FINALE_CHORDS), 'unison']));
    for (const { song, mat } of finales) {
      const { chord, ends, variant } = mat;
      const finale = defined(song.form.first(Finale), 'a finale');
      const before = song.form.before(finale);
      // After a riff, the bare tonic, hit; after some outros, a chord that suits them.
      expect(ends === 'unison').toBe(before instanceof Riff);
      if (ends === 'unison') {
        expect(variant).toBe('hits');
        expect(chord.root).toBe(song.key.tonic);
        expect(chord.symbol).toBe('5');
      }
      const after = before instanceof Outro && FINALE_AFTER[before.variant];
      if (after) expect(Object.keys(after)).toContain(ends);
      // Easing, slower through its first bar (but a fermata, which has its own tempo).
      if (mat.eases) {
        expect(variant).not.toBe('fermata');
        expect(finale.tempo.map((m) => m.scale)).toEqual([...FINALE_EASE.scale]);
      } else if (variant !== 'fermata') expect(finale.tempo).toEqual([]);
      // Each style rings out a chord it suits: only the tonic slides or ends on a fermata; the neapolitan slides
      // onto the tonic's 9sus.
      expect(FINALE_SUITS[variant] ?? [ends]).toContain(ends);
      if (variant === 'neapolitan') {
        expect(chord.root).toBe(song.key.tonic);
        expect(chord.symbol).toBe('9sus');
      }
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
      const chorus = song.part(Chorus);
      if (chorus) expect(chorus.melody.bars).toHaveLength(chorus.bars.length);
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
    const choruses = Array.from({ length: 150 }, (_, i) => Song.generate(`answer${i}`).part(Chorus))
      .filter((c) => c !== undefined)
      .filter((c) => c.variant !== 'line' && c.variant !== 'echo');
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
    const tense = [PreChorus, Bridge, Breakdown, Lift, Vamp, Link];
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

  it('starts a verse bare after a lift into it: only the keys and the melody, the band (and its drums) in after', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`bare${i}`)).filter((song) =>
      song.form.sections.some((s) => s.bare),
    );
    expect(songs.length).toBeGreaterThan(0);
    for (const song of songs.slice(0, 5)) {
      const i = song.form.sections.findIndex((s) => s.bare);
      const start = song.form.starts[i];
      const notes = new ScoreArranger(song).arrange().notes;
      const early = notes.filter((n) => n.time >= start - 1e-9 && n.time < start + 2 - 1e-9 && n.path);
      for (const n of early) expect(n.path === 'keys' || sings(n)).toBe(true);
      const back = notes.filter((n) => Math.abs(n.time - (start + 2)) < 1e-9);
      // (A verse on the keys alone has no drums to crash back in.)
      const verse = song.form.sections[i];
      const drums = !(verse instanceof Verse && verse.material.variant === 'alone');
      expect(back.some((n) => n.note === PERCUSSION.crash && n.program === 'drums')).toBe(drums);
      // The band's chords back with it, even those it held over from before.
      expect(back.some((n) => n.program !== 'drums' && n.path !== 'keys' && !sings(n))).toBe(true);
    }
  });

  it('slides onto a suspended tonic from a bar of the bIImaj7#11 above it', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`neapolitan${i}`)).filter(
      (song) => song.part(Finale)?.variant === 'neapolitan',
    );
    expect(songs.length).toBeGreaterThan(0);
    for (const song of songs.slice(0, 5)) {
      const i = song.form.sections.findIndex((s) => s instanceof Finale);
      const start = song.form.starts[i];
      const shift = song.form.sections[i].shift;
      const bass = new ScoreArranger(song)
        .arrange()
        .notes.filter((n) => n.path === 'bass' && n.time >= start && n.time < start + 2);
      // The bass on the bII for a bar, then on the tonic.
      const pcs = (from: number) =>
        bass.filter((n) => n.time >= start + from && n.time < start + from + 1).map((n) => n.note % 12);
      expect(pcs(0)).toEqual([(song.key.tonic + shift + 1) % 12]);
      expect(pcs(1)).toEqual([(song.key.tonic + shift) % 12]);
    }
  });

  it("ends an intro a bar longer than its phrases on its key's approach home, a teaser resting over it", () => {
    const intros = Array.from({ length: 300 }, (_, i) => Song.generate(`odd${i}`)).flatMap((song) =>
      song.form
        .ofType(Intro)
        .filter((s) => s.extended)
        .map((sec) => ({ song, sec })),
    );
    expect(intros.length).toBeGreaterThan(0);
    for (const { song, sec } of intros) {
      const { bars, key, melody, harmony } = sec.material;
      expect(bars).toHaveLength(sec.bars);
      const [spec] = TONALITIES[key.mode].approach.at(-1) ?? [];
      expect(bars.at(-1)?.[0].root).toBe((key.tonic + Roman.parseSpec(spec).offset) % 12);
      expect(key.tonic === song.key.tonic || key.tonic === song.key.majorTonic).toBe(true);
      // The hook's teaser over its phrases, never over the bar home.
      if (melody && harmony === 'hook') {
        expect(melody.bars).toHaveLength(sec.bars);
        expect(melody.rests.at(-1)).toBe(true);
      }
    }
  });

  it('swells strings on a held chord before the intro', () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`swell${i}`)).filter((song) =>
      song.form.first(Swell),
    );
    expect(songs.length).toBeGreaterThan(0);
    for (const song of songs.slice(0, 5)) {
      const swell = defined(song.form.first(Swell), 'a swell');
      expect(song.form.sections[0]).toBe(swell);
      const notes = new ScoreArranger(song).arrange().notes.filter((n) => n.time < swell.bars);
      for (const n of notes) expect([undefined, 'strings', 'pad']).toContain(n.path);
      expect(notes.some((n) => n.program === RISER)).toBe(true);
      // The chord held through it, never struck again.
      const held = notes.filter((n) => n.path);
      expect(held.length).toBeGreaterThan(0);
      for (const n of held) expect([n.time, n.dur]).toEqual([0, swell.bars]);
    }
  });

  it('plays the keys alone under a verse only in a song leaning towards a ballad', () => {
    const songs = Array.from({ length: 600 }, (_, i) => Song.generate(`alone${i}`));
    const alone = songs.filter((song) => song.part(Verse)?.variant === 'alone');
    expect(alone.length).toBeGreaterThan(0);
    for (const song of alone) expect(song.bpm).toBeLessThan(BALLAD.tempo[1]);
    for (const song of alone.slice(0, 5)) {
      const i = song.form.sections.findIndex((s) => s instanceof Verse);
      const start = song.form.starts[i];
      const notes = new ScoreArranger(song)
        .arrange()
        .notes.filter((n) => n.time >= start && n.time < start + song.form.sections[i].bars);
      expect(notes.some((n) => n.path === 'kit')).toBe(false);
      expect(notes.some((n) => n.path === 'keys')).toBe(true);
    }
  });
});
