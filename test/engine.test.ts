import { describe, expect, it } from 'vitest';
import {
  CHORDS,
  Chord,
  FORM,
  Key,
  MODES,
  PALETTE,
  PRE_FLAVOURS,
  Roman,
  Scale,
  Song,
  Template,
  TONALITIES,
  BAND,
  GM_PROGRAMS,
  KIT_GAPS,
  KITS,
  PICKS,
  SAME_SOUND,
  SOUND_LEVELS,
  VOICES,
  type Mode,
  type PickedPart,
} from '../src/engine';
import { Harmonizer } from '../src/engine/harmony';
import { Rng } from '../src/engine/random';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('Song', () => {
  it('is deterministic for a seed', () => {
    expect(Song.generate({ seed: 'abc' })).toEqual(Song.generate({ seed: 'abc' }));
    expect(Song.generate({ seed: 'abc' }).materials).not.toEqual(Song.generate({ seed: 'abd' }).materials);
  });

  it('writes complete songs', () => {
    for (const seed of SEEDS) {
      const song = Song.generate({ seed });
      for (const mat of Object.values(song.materials)) {
        for (const chord of (mat.bars ?? []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if (mat.drums) expect(mat.drums.fills.length > 0).toBe(mat.drums.fill);
        if (mat.type !== 'finale' && mat.bars) expect(mat.bass?.pattern).toBeTruthy();
      }
      for (const s of song.form) expect(song.materials).toHaveProperty([s.type]);
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
    const forms = SEEDS.map((seed) => Song.generate({ seed }).form);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.type).join(' '))).size).toBeGreaterThan(20);
    for (const type of ['vamp', 'pre', 'riff', 'bridge', 'solo', 'breakdown', 'lift', 'outro', 'drumBreak']) {
      expect(forms.some((f) => f.some((s) => s.type === type))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.type !== type))).toBe(true);
    }
  });

  it('varies the pre-chorus', () => {
    const pres = Array.from({ length: 150 }, (_, i) => Song.generate({ seed: `pre${i}` }))
      .filter((song) => song.materials.pre)
      .map((song) => ({ mat: song.materials.pre!, bars: song.form.find((s) => s.type === 'pre')!.bars }));
    expect(new Set(pres.map((p) => p.mat.flavour))).toEqual(new Set(Object.keys(PRE_FLAVOURS)));
    expect(new Set(pres.map((p) => p.bars))).toEqual(new Set([2, 4, 6, 8]));
    for (const { mat, bars } of pres) {
      expect(mat.bars).toHaveLength(bars);
      expect(mat.melody!.bars).toHaveLength(bars);
    }
  });

  it.each(Object.keys(TONALITIES) as Mode[])('lifts the key up through varied %s turnarounds', (mode) => {
    const songs = Array.from({ length: 200 }, (_, i) => Song.generate({ seed: `lift${i}`, mode }));
    const used = new Set<string>();
    let multiple = 0;
    for (const song of songs) {
      const lifts = song.form.filter((s) => s.type === 'lift');
      const mats = song.materials.lift?.lifts ?? [];
      expect(mats).toHaveLength(lifts.length);
      if (lifts.length > 1) multiple++;
      // Each lift goes up from the key before it, never past the cap.
      let shift = 0;
      for (const [i, sec] of song.form.entries()) {
        if (sec.type === 'lift') {
          expect(sec.opts.liftTo!).toBeGreaterThan(shift);
          expect(sec.opts.liftTo!).toBeLessThanOrEqual(FORM.lift.maxShift);
          expect(song.form[i + 1]).toMatchObject({ type: 'chorus', opts: { shift: sec.opts.liftTo } });
          shift = sec.opts.liftTo!;
        } else if (song.form.slice(0, i).some((s) => s.type === 'lift')) {
          expect(sec.shift).toBe(shift);
        }
      }
      lifts.forEach((sec, i) => {
        const lift = mats[i];
        used.add(lift.turnaround);
        expect(lift.turnaround).toBe(sec.opts.turnaround);
        expect(lift.key.tonic).toBe((song.key.tonic + sec.opts.liftTo!) % 12);
        expect(lift.key.mode).toBe(mode);
        expect(lift.bars).toHaveLength(sec.bars);
        for (const chord of lift.bars.flat()) expect(MODES).toHaveProperty([chord.scale!]);
        expect(lift.bass?.pattern).toBeTruthy();
      });
    }
    expect(multiple).toBeGreaterThan(10);
    expect(used).toEqual(new Set(Object.keys(TONALITIES[mode].turnarounds)));
  });

  it('fits a pre-chorus template to end on its cadence', () => {
    const t = new Template('ii7 iii7 IVmaj7 V7sus');
    const texts = (n: number) => t.fitEnding(n).map((bar) => bar.map((r) => r.text).join(' '));
    expect(texts(2)).toEqual(['IVmaj7', 'V7sus']);
    expect(texts(4)).toEqual(['ii7', 'iii7', 'IVmaj7', 'V7sus']);
    expect(texts(6)).toEqual(['IVmaj7', 'V7sus', 'ii7', 'iii7', 'IVmaj7', 'V7sus']);
  });

  it('honours key, mode and tempo choices', () => {
    const song = Song.generate({ seed: 'x', key: 2, bpm: 99 });
    expect(song.key.tonic).toBe(2);
    expect(song.bpm).toBe(99);
    expect(Song.generate({ seed: 'x', key: 2, mode: 'dorian' }).key).toEqual(new Key(2, 'dorian'));
  });

  it('picks every mode from seeds', () => {
    const modes = SEEDS.map((seed) => Song.generate({ seed }).key.mode);
    expect(new Set(modes)).toEqual(new Set(Object.keys(TONALITIES)));
  });

  it('writes a major-key song as it did before there were modes', () => {
    const song = Song.generate({ seed: 'snap0', mode: 'major' });
    expect(song.key.name).toBe('G major');
    expect(song.materials.chorus!.bars!.flat().map((c) => c.name(song.key))).toEqual([
      'G^9',
      'B9',
      'Bb13#11',
      'Am9',
      'A13',
      'D13',
      'Bm7',
      'E13b9',
      'Am11',
      'Ab13#11',
    ]);
  });

  it.each(Object.keys(TONALITIES) as Mode[])('writes complete %s songs', (mode) => {
    const { tonic, tonics, finale } = TONALITIES[mode];
    for (const seed of SEEDS) {
      const song = Song.generate({ seed, mode });
      expect(song.key.mode).toBe(mode);
      expect(tonics).toContain(song.key.tonic);
      for (const mat of Object.values(song.materials)) {
        for (const chord of (mat.bars ?? []).flat()) {
          expect(CHORDS).toHaveProperty([chord.symbol]);
          expect(MODES).toHaveProperty([chord.scale!]);
        }
        if (mat.type !== 'finale' && mat.bars) expect(mat.bass?.pattern).toBeTruthy();
      }
      const fin = song.materials.finale!.bars![0][0];
      expect(fin.root).toBe(song.key.tonic);
      expect(fin.cls).toBe(tonic);
      expect(finale.map(([symbol]) => symbol)).toContain(fin.symbol);
    }
  });
});

describe('instruments', () => {
  const { pool, gains, soloists } = VOICES;
  const parts = Object.keys(PICKS) as PickedPart[];
  const voicesOf = (song: Song) => [song.sounds.lead, song.sounds.double, ...song.sounds.soloists].map(([s]) => s);
  const soundOf = (song: Song, part: PickedPart) => {
    const v = song.sounds[part];
    return typeof v === 'string' ? v : v[0];
  };
  const songs = Array.from({ length: 200 }, (_, i) => Song.generate({ seed: `band${i}` }));
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
    expect(Song.generate({ seed: 'band0' }).sounds).toEqual(songs[0].sounds);
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
    const [lead, gain] = songs[0].sounds.lead;
    expect(gain).toBeCloseTo(gains.lead * SOUND_LEVELS[lead], 3);
    expect(Song.voice('sawtooth', 'soloists')).toEqual(['sawtooth', gains.soloists * SOUND_LEVELS.sawtooth]);
  });

  it('has a level and a General MIDI program for every sound a song may pick', () => {
    const sounds = [
      ...pool,
      ...Object.values(PICKS).flat(),
      ...Object.values(BAND).map((v) => (typeof v === 'string' ? v : v[0])),
    ];
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
        const [numeral, alternatives] = spec.split(':');
        expect(() => Roman.parse(numeral)).not.toThrow();
        for (const symbol of alternatives.split('|')) expect(CHORDS).toHaveProperty([symbol]);
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
      new Harmonizer(new Key(0, mode), new Rng('t')).progression(template, 2)[0][0];
    expect(symbols('minTonic')).toContain(tonicOf('minor', 'i7 iv7').symbol);
    expect(symbols('domTonic')).toContain(tonicOf('mixolydian', 'I7 IV7').symbol);
    expect(symbols('min')).toContain(tonicOf('dorian', 'i7 IV7').symbol);
  });

  it("alters a minor key's dominant, even where it leads out of the template", () => {
    for (let i = 0; i < 30; i++) {
      // V7 wraps round to iv, not i: only the key says it is the dominant.
      const v = new Harmonizer(new Key(2, 'minor'), new Rng(`v${i}`)).progression('iv7 V7', 2)[1][0];
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

describe('music', () => {
  it('round-trips every semitone through degree strings', () => {
    for (const steps of Object.values(MODES)) {
      const scale = new Scale(steps);
      for (let semis = -14; semis <= 26; semis++) {
        const [, d, acc] = /^(-?\d+)([#b]*)$/.exec(scale.degree(semis))!;
        const shift = [...acc].reduce((n, ch) => n + (ch === '#' ? 1 : -1), 0);
        expect(scale.semis(Number(d)) + shift).toBe(semis);
      }
    }
  });

  it('parses roman numerals', () => {
    expect(Roman.parse('IVmaj7')).toMatchObject({ offset: 5, cls: 'maj' });
    expect(Roman.parse('V7')).toMatchObject({ offset: 7, cls: 'dom' });
    expect(Roman.parse('#iv°')).toMatchObject({ offset: 6, cls: 'dim' });
    expect(Roman.parse('viiø')).toMatchObject({ offset: 11, cls: 'hdim' });
  });

  it('spells chromatic notes as flattened degrees', () => {
    expect([3, 8, 10, 6].map((pc) => new Key(0).spell(pc))).toEqual(['Eb', 'Ab', 'Bb', 'F#']);
    expect(new Key(2).spell(10)).toBe('Bb');
    expect(new Chord(10, 'm7').name(new Key(0))).toBe('Bbm7');
  });

  it('measures distance round the circle of fifths', () => {
    expect(new Key(0).fifthsTo(new Key(7))).toBe(1);
    expect(new Key(0).fifthsTo(new Key(9, 'minor'))).toBe(0);
    expect(new Key(0).fifthsTo(new Key(2, 'dorian'))).toBe(0);
    expect(new Key(0).fifthsTo(new Key(6))).toBe(6);
  });

  it('treats every mode as its relative major', () => {
    expect(new Key(9, 'minor').majorTonic).toBe(0);
    expect(new Key(2, 'dorian').majorTonic).toBe(0);
    expect(new Key(7, 'mixolydian').majorTonic).toBe(0);
    // F# dorian is in E major, so it spells with sharps; Eb dorian is in Db.
    expect(new Key(6, 'dorian').name).toBe('F# dorian');
    expect(new Key(3, 'dorian').name).toBe('Eb dorian');
    expect(new Key(7, 'mixolydian').spell(5)).toBe('F');
    expect([3, 11].map((pc) => new Key(0, 'minor').spell(pc))).toEqual(['Eb', 'B']);
    expect(new Key(2, 'dorian').modeAt(7)).toBe('mixolydian'); // IV7
    expect(new Key(9, 'minor').modeAt(5)).toBe('lydian'); // bVI
  });
});
