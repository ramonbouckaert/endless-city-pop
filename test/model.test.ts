import { describe, expect, it } from 'vitest';
import { Rng } from '../src/lib/random';
import { Harmonizer, Song, voiceGain, type Grace } from '../src/model';
import { soloDegrees, soloSlides } from '../src/render/notation';
import {
  BAND,
  FINALE_STYLES,
  FORM,
  GM_PROGRAMS,
  INTRO,
  INTRO_TEXTURES,
  KIT_GAPS,
  KITS,
  LIFT_STYLES,
  MAX_SHIFT,
  PALETTE,
  PICKS,
  PRE_FLAVOURS,
  SAME_SOUND,
  SOUND_LEVELS,
  TONALITIES,
  VOICES,
  type PickedPart,
} from '../src/style';
import { CHORDS, Key, MODES, parseChordSpec, Template, type Mode } from '../src/theory';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('Song', () => {
  it('is deterministic for a seed', () => {
    expect(Song.generate('abc')).toEqual(Song.generate('abc'));
    expect(Song.generate('abc').materials).not.toEqual(Song.generate('abd').materials);
  });

  it('writes complete songs', () => {
    for (const seed of SEEDS) {
      const song = Song.generate(seed);
      for (const mat of Object.values(song.materials)) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if ('drums' in mat) expect(mat.drums.fills.length > 0).toBe(mat.drums.fill);
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      for (const s of song.form) expect(song.materials).toHaveProperty([s.part]);
      const types = song.form.map((s) => s.type);
      expect(types[0]).toBe('intro');
      expect(types.at(-1)).toBe('finale');
      expect(types).toContain('verse');
      expect(types).toContain('chorus');
      const brk = types.indexOf('drumBreak');
      if (brk >= 0) expect(types[brk + 1]).not.toBe('finale');
      expect(song.describe().bars).toBe(song.bars);
    }
  });

  it('varies the form from seed to seed', () => {
    const forms = SEEDS.map((seed) => Song.generate(seed).form);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.type).join(' '))).size).toBeGreaterThan(20);
    for (const type of ['vamp', 'pre', 'riff', 'bridge', 'solo', 'breakdown', 'lift', 'outro', 'drumBreak']) {
      expect(forms.some((f) => f.some((s) => s.type === type))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.type !== type))).toBe(true);
    }
  });

  it('brings a vamp back at most once, never straight after a verse', () => {
    const forms = Array.from({ length: 300 }, (_, i) => Song.generate(`vamp${i}`).form);
    let returns = 0;
    for (const form of forms) {
      const vamps = form.flatMap((s, i) => (s.type === 'vamp' ? [i] : []));
      expect(vamps.length).toBeLessThanOrEqual(2);
      if (vamps.length) expect(vamps[0]).toBe(1); // the first opens the song, after the intro
      if (vamps.length === 2) {
        returns++;
        const back = vamps[1];
        expect(FORM.vamp.after).toContain(form[back - 1].type);
        expect(form[back].bars).toBe(form[vamps[0]].bars);
        expect(form[back].opts.second).toBe(true);
      }
    }
    expect(returns).toBeGreaterThan(20);
  });

  it("starts the opening vamp's drums late, light or with the whole kit", () => {
    const entries = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const song = Song.generate(`vamp${i}`);
      const vamp = song.part('vamp');
      if (vamp) entries.add(vamp.entry);
      else expect(song.form.some((s) => s.type === 'vamp')).toBe(false);
    }
    expect(entries).toEqual(new Set(['late', 'light', 'full']));
  });

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

  it("writes solos as long as their sections, in the song's mode", () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`solo${i}`));
    let sixteens = 0;
    let split = 0;
    let fromHome = 0;
    let notes = 0;
    const graces: Grace[] = [];
    const minorHalfDiminished: number[] = [];
    for (const song of songs) {
      for (const sec of song.form.filter((s) => s.type === 'solo')) {
        const mat = song.material(sec);
        if (mat.type !== 'solo') throw new Error('not a solo');
        expect(mat.comp).toBe(sec.opts.second ? 'bossa' : 'band');
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
        for (const n of mat.solo.bars.flat().filter((n) => n.grace)) {
          const { from, chromatic, semis } = n.grace!;
          expect(Math.sign(semis)).toBe(from);
          expect(Math.abs(semis)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(semis)).toBeLessThanOrEqual(chromatic ? 1 : 3); // up to an augmented second
        }
        const bends = slides
          .join(' ')
          .match(/(?<=[[ ])-?\d+/g)!
          .map(Number)
          .filter((x) => x !== 0);
        expect(bends.length).toBe(mat.solo.bars.flat().filter((n) => n.grace?.slur).length);
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
    const pres = Array.from({ length: 150 }, (_, i) => Song.generate(`pre${i}`))
      .filter((song) => song.part('pre'))
      .map((song) => ({ mat: song.part('pre')!, bars: song.form.find((s) => s.type === 'pre')!.bars }));
    expect(new Set(pres.map((p) => p.mat.flavour))).toEqual(new Set(Object.keys(PRE_FLAVOURS)));
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
      const lifts = song.form.filter((s) => s.type === 'lift');
      const mats = song.parts('lift');
      expect(mats).toHaveLength(lifts.length);
      if (lifts.length > 1) multiple++;
      // Each lift goes up from the key before it, never past the cap.
      let shift = 0;
      for (const [i, sec] of song.form.entries()) {
        if (sec.type === 'lift') {
          expect(sec.opts.liftTo!).toBeGreaterThan(shift);
          expect(sec.opts.liftTo!).toBeLessThanOrEqual(MAX_SHIFT);
          expect(song.form[i + 1]).toMatchObject({ type: 'chorus', opts: { shift: sec.opts.liftTo } });
          shift = sec.opts.liftTo!;
        } else if (song.form.slice(0, i).some((s) => s.type === 'lift')) {
          expect(sec.shift).toBe(shift);
        }
      }
      lifts.forEach((sec, i) => {
        const lift = mats[i];
        used.add(lift.turnaround);
        styles.add(lift.style);
        // Each lift is played differently from the one before.
        if (i) expect(lift.style).not.toBe(mats[i - 1].style);
        expect(lift.turnaround).toBe(sec.opts.turnaround);
        expect(lift.key.tonic).toBe((song.key.tonic + sec.opts.liftTo!) % 12);
        expect(lift.key.mode).toBe(mode);
        expect(lift.bars).toHaveLength(sec.bars);
        for (const chord of lift.bars.flat()) expect(MODES).toHaveProperty([chord.scale!]);
        expect(lift.bass.bars).toHaveLength(sec.bars);
      });
    }
    expect(multiple).toBeGreaterThan(10);
    expect(used).toEqual(new Set(Object.keys(TONALITIES[mode].turnarounds)));
    expect(styles).toEqual(new Set(LIFT_STYLES.map(([name]) => name)));
  });

  it('varies the intro', () => {
    const intros = Array.from({ length: 150 }, (_, i) => Song.generate(`intro${i}`).part('intro')!);
    expect(new Set(intros.map((m) => m.texture))).toEqual(new Set(Object.keys(INTRO_TEXTURES)));
    expect(new Set(intros.map((m) => m.harmony))).toEqual(new Set(INTRO.harmony.map(([name]) => name)));
  });

  it('winds down in an outro of either style', () => {
    const songs = Array.from({ length: 150 }, (_, i) => Song.generate(`outro${i}`));
    const styles = new Set<string>();
    for (const song of songs) {
      const sec = song.form.find((s) => s.type === 'outro');
      if (!sec) continue;
      const mat = song.part('outro')!;
      styles.add(mat.outro);
      expect(mat.outro).toBe(sec.opts.outro);
      expect(sec.bars).toBe(FORM.outro.bars[mat.outro]);
      if (mat.outro === 'trade') {
        // A line for every bar, over a vamp, for the soloists to trade.
        expect(mat.bars).toHaveLength(sec.bars);
        expect(mat.solo.bars).toHaveLength(sec.bars);
        expect(mat.bass.bars).toHaveLength(sec.bars);
        expect(new Set(mat.soloists).size).toBe(2);
        for (const i of song.soloists) expect(mat.soloists.slice(0, song.soloists.length)).toContain(i);
      } else {
        expect(mat.bars).toBe(song.part('intro')!.bars);
        expect(mat.melody).toBe(song.part('intro')!.melody);
      }
    }
    expect(styles).toEqual(new Set(['reprise', 'trade']));
  });

  it('varies the finale', () => {
    const endings = Array.from({ length: 100 }, (_, i) => Song.generate(`finale${i}`).part('finale')!.ending);
    expect(new Set(endings)).toEqual(new Set(FINALE_STYLES.map(([name]) => name)));
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
      const chorus = song.part('chorus')!;
      expect(chorus.melody.bars).toHaveLength(chorus.bars.length);
    }
  });

  it('fits a pre-chorus template to end on its cadence', () => {
    const t = new Template('ii7 iii7 IVmaj7 V7sus');
    const texts = (n: number) => t.fitEnding(n).map((bar) => bar.map((r) => r.text).join(' '));
    expect(texts(2)).toEqual(['IVmaj7', 'V7sus']);
    expect(texts(4)).toEqual(['ii7', 'iii7', 'IVmaj7', 'V7sus']);
    expect(texts(6)).toEqual(['IVmaj7', 'V7sus', 'ii7', 'iii7', 'IVmaj7', 'V7sus']);
  });

  it('picks every mode from seeds', () => {
    const modes = SEEDS.map((seed) => Song.generate(seed).key.mode);
    expect(new Set(modes)).toEqual(new Set(Object.keys(TONALITIES)));
  });

  it('writes the same chorus for a seed as it did', () => {
    const song = Song.generate('snap0');
    expect(song.key.name).toMatchSnapshot();
    expect(
      song
        .part('chorus')!
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
      for (const mat of Object.values(song.materials)) {
        for (const chord of ('bars' in mat ? mat.bars : []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if ('bass' in mat) expect(mat.bass.bars).toHaveLength(mat.bars.length);
      }
      const fin = song.part('finale')!.chord;
      expect(fin.root).toBe(song.key.tonic);
      expect(fin.cls).toBe(tonic);
      expect(finale.map(([symbol]) => symbol)).toContain(fin.symbol);
    }
  });
});

describe('instruments', () => {
  const { pool, gains, soloists } = VOICES;
  const parts = Object.keys(PICKS) as PickedPart[];
  const voicesOf = ({ instruments: { sounds } }: Song) => [sounds.lead, sounds.double, ...sounds.soloists];
  const soundOf = (song: Song, part: PickedPart) => song.instruments.sounds[part];
  const songs = Array.from({ length: 200 }, (_, i) => Song.generate(`band${i}`));
  const recording = (s: string) => SAME_SOUND[s] ?? s;

  it('picks every part from its list, the same for a seed', () => {
    const seen = new Map<string, Set<string>>();
    for (const song of songs) {
      expect(voicesOf(song)).toHaveLength(2 + soloists);
      for (const s of voicesOf(song)) expect(pool).toContain(s);
      for (const part of parts) {
        expect(PICKS[part]).toContain(soundOf(song, part));
        seen.set(part, (seen.get(part) ?? new Set()).add(soundOf(song, part)));
      }
    }
    for (const part of parts) expect(seen.get(part)).toEqual(new Set(PICKS[part]));
    expect(Song.generate('band0').instruments).toEqual(songs[0].instruments);
  });

  it('never plays one recording in two parts while a part has another to choose', () => {
    let repeats = 0;
    for (const song of songs) {
      const taken = new Set(voicesOf(song).map(recording));
      expect(taken.size).toBe(2 + soloists);
      for (const part of parts) {
        const sound = recording(soundOf(song, part));
        if (taken.has(sound)) {
          // Only when every sound on its list was already playing.
          for (const s of PICKS[part]) expect(taken).toContain(recording(s));
          repeats++;
        }
        taken.add(sound);
      }
    }
    expect(repeats).toBeLessThan(songs.length / 10);
  });

  it('leaves out the sounds taken off the lists', () => {
    const everywhere = [...pool, ...Object.values(PICKS).flat()];
    for (const gone of ['brown', 'gm_pad_bowed', 'gm_pad_new_age']) expect(everywhere).not.toContain(gone);
  });

  it("plays a melody voice at its part's gain and the sound's level", () => {
    const { lead } = songs[0].instruments.sounds;
    expect(voiceGain(lead, 'lead')).toBeCloseTo(gains.lead * SOUND_LEVELS[lead], 3);
    expect(voiceGain('sawtooth', 'soloists')).toBe(gains.soloists * SOUND_LEVELS.sawtooth);
  });

  it('has a level and a General MIDI program for every sound a song may pick', () => {
    const sounds = [...pool, ...Object.values(PICKS).flat(), ...Object.values(BAND)];
    for (const sound of sounds) {
      expect(SOUND_LEVELS[sound], sound).toBeGreaterThanOrEqual(0.5);
      expect(SOUND_LEVELS[sound], sound).toBeLessThanOrEqual(2);
      expect(GM_PROGRAMS[sound], sound).toBeGreaterThanOrEqual(0);
    }
  });

  it('only fills gaps of kits it uses, with drum sounds the band plays', () => {
    const kits = KITS.map(([k]) => k);
    for (const [kit, gaps] of Object.entries(KIT_GAPS)) {
      expect(kits).toContain(kit);
      for (const g of gaps)
        expect(['bd', 'sd', 'hh', 'oh', 'rd', 'cr', 'rim', 'cp', 'lt', 'mt', 'ht', 'sh', 'tb', 'cb']).toContain(g);
    }
  });
});

describe('rhythm', () => {
  const songs = SEEDS.map((seed) => Song.generate(seed));

  it('gives every playing section drums with at least one part', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        expect(mat.drums, mat.type).toBeDefined();
        expect(mat.drums!.parts.length, mat.type).toBeGreaterThan(0);
      }
    }
  });

  it('gives each drum part exactly 4 bars of 16 steps', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        for (const part of mat.drums!.parts) {
          expect(part.bars).toHaveLength(4);
          for (const bar of part.bars) expect(bar).toHaveLength(16);
        }
      }
    }
  });

  it('produces fills iff the fill flag is set', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        if (mat.type === 'finale') continue;
        const { fill, fills } = mat.drums!;
        expect(fills.length > 0).toBe(fill);
        for (const f of fills) {
          expect(f.start).toBeGreaterThanOrEqual(0);
          expect(f.start).toBeLessThan(16);
          expect(f.hits.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every section with chords a bass line', () => {
    for (const song of songs) {
      for (const mat of Object.values(song.materials)) {
        // The finale has the final chord but no bass line.
        if (mat.type === 'finale' || mat.type === 'drumBreak') continue;
        expect(mat.bass.bars, mat.type).toHaveLength(mat.bars.length);
        expect(mat.bass.bars.flat().length, mat.type).toBeGreaterThan(0);
      }
    }
  });
});

describe('tonalities', () => {
  const modes = Object.keys(TONALITIES) as Mode[];
  const symbols = (palette: keyof typeof PALETTE) => PALETTE[palette].map(([s]) => s);

  it('has templates and chords that parse', () => {
    for (const mode of modes) {
      const t = TONALITIES[mode];
      const templates = [...Object.values(t.templates).flat(), ...Object.values(t.pre).flat()];
      for (const text of templates) expect(() => new Template(text)).not.toThrow();
      expect(Object.keys(t.pre).sort()).toEqual(Object.keys(PRE_FLAVOURS).sort());
      const specs = [...t.approach, ...Object.values(t.turnarounds).flatMap((x) => x.bars)].flat();
      for (const spec of specs) {
        for (const symbol of parseChordSpec(spec).symbols) expect(CHORDS).toHaveProperty([symbol]);
      }
      for (const [symbol, scale] of t.finale) {
        expect(CHORDS[symbol].cls).toBe(t.tonic);
        expect(MODES).toHaveProperty([scale]);
      }
      // A bridge's key needs bridge templates of its own.
      for (const { mode: m = 'major' } of t.bridgeKeys) expect(TONALITIES[m].templates.bridge?.length).toBeTruthy();
    }
  });

  it('colours the tonic chord by mode', () => {
    const tonicOf = (mode: Mode, template: string) =>
      new Harmonizer(new Key(0, mode), new Rng('t')).progression(template, 2, { reharm: false })[0][0];
    expect(symbols('minTonic')).toContain(tonicOf('minor', 'i7 iv7').symbol);
    expect(symbols('domTonic')).toContain(tonicOf('mixolydian', 'I7 IV7').symbol);
    expect(symbols('min')).toContain(tonicOf('dorian', 'i7 IV7').symbol);
  });

  it("alters a minor key's dominant, even where it leads out of the template", () => {
    for (let i = 0; i < 30; i++) {
      // V7 wraps round to iv, not i: only the key says it is the dominant.
      const v = new Harmonizer(new Key(2, 'minor'), new Rng(`v${i}`)).progression('iv7 V7', 2, { reharm: false })[1][0];
      expect(symbols('domToMinor')).toContain(v.symbol);
      expect(['altered', 'phrygian:dominant']).toContain(v.scale);
    }
  });

  it('cadences home in the way of each mode', () => {
    const names = (mode: Mode) => {
      const key = new Key(0, mode);
      return new Harmonizer(key, new Rng('a'))
        .approach()
        .flat()
        .map((c) => c.name(key));
    };
    expect(names('minor')[0]).toBe('Dm7b5'); // iiø-V7alt-i
    expect(names('minor')[1]).toMatch(/^G(7alt|7b9|13b9)$/);
    expect(names('dorian')[1]).toMatch(/^F(13|9)$/); // IV7-i
    expect(names('mixolydian')[1]).toMatch(/^Bb/); // bVII-I7
  });
});
