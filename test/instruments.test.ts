import { describe, expect, it } from 'vitest';
import { ScoreArranger, Song } from '../src/engine';
import { GM, PERCUSSION, type Program } from '../src/lib/general-midi';
import {
  BALLAD,
  BALLAD_KITS,
  BAND,
  KIT_VOICES,
  KITS,
  PICKS,
  SOUND_LEVELS,
  SYNTH_DRUM,
  VOICES,
  type PickedPart,
} from '../src/style';
import { defined } from './helpers';

describe('instruments', () => {
  const { pool, soloists } = VOICES;
  const parts = Object.keys(PICKS) as PickedPart[];
  const voicesOf = ({ instruments: { sounds } }: Song) => [sounds.lead, sounds.double, ...sounds.soloists];
  const soundOf = (song: Song, part: PickedPart) => song.instruments.sounds[part];
  const songs = Array.from({ length: 200 }, (_, i) => Song.generate(`band${i}`));

  it('picks every part from its list, the same for a seed', () => {
    const seen = new Map<string, Set<Program>>();
    for (const song of songs) {
      expect(voicesOf(song)).toHaveLength(2 + soloists);
      for (const s of voicesOf(song)) expect(pool).toContain(s);
      const { lead, soloists: picked } = song.instruments.sounds;
      for (const s of [lead, ...picked]) expect(VOICES.slow.has(s)).toBe(false);
      for (const part of parts) {
        expect(PICKS[part]).toContain(soundOf(song, part));
        seen.set(part, (seen.get(part) ?? new Set()).add(soundOf(song, part)));
      }
    }
    for (const part of parts) expect(seen.get(part)).toEqual(new Set(PICKS[part]));
    expect(Song.generate('band0').instruments).toEqual(songs[0].instruments);
  });

  it('never plays one sound in two parts while a part has another to choose', () => {
    let repeats = 0;
    for (const song of songs) {
      const taken = new Set(voicesOf(song));
      expect(taken.size).toBe(2 + soloists);
      for (const part of parts) {
        const sound = soundOf(song, part);
        if (taken.has(sound)) {
          // Only when every sound on its list was already playing.
          for (const s of PICKS[part]) expect(taken).toContain(s);
          repeats++;
        }
        taken.add(sound);
      }
    }
    expect(repeats).toBeLessThan(songs.length / 10);
  });

  it('reads a sound by its path, soloists by index', () => {
    const { instruments } = songs[0];
    const { sounds } = instruments;
    expect(instruments.sound('keys')).toBe(sounds.keys);
    expect(instruments.sound('soloists.2')).toBe(sounds.soloists[2]);
  });

  it('leaves out the instruments taken off the lists', () => {
    const everywhere = [...pool, ...Object.values(PICKS).flat()];
    for (const gone of [GM.bowedPad, GM.newAgePad]) expect(everywhere).not.toContain(gone);
  });

  it("trims a melody voice by the sound's level, a band part by its level over BAND's", () => {
    for (const { instruments } of songs.slice(0, 20)) {
      const { lead, keys } = instruments.sounds;
      const level = (program: Program) => defined(SOUND_LEVELS[program], `a level for program ${program}`);
      expect(instruments.trim('lead')).toBe(level(lead));
      expect(instruments.trim('keys')).toBe(level(keys) / level(BAND.keys));
    }
  });

  it('has a level for every instrument a song may pick', () => {
    const programs = [...pool, ...Object.values(PICKS).flat(), ...Object.values(BAND)];
    for (const program of programs) {
      expect(SOUND_LEVELS[program], `program ${program}`).toBeGreaterThanOrEqual(0.5);
      expect(SOUND_LEVELS[program], `program ${program}`).toBeLessThanOrEqual(2);
    }
  });

  it("plays each song on one of the soundfont's drum kits (perhaps a ballad's, for a slow one)", () => {
    const kits = KITS.map(([k]) => k);
    const ballads = BALLAD_KITS.map(([k]) => k);
    const slow = (song: Song) => song.bpm <= BALLAD.tempo[0];
    const fast = (song: Song) => song.bpm >= BALLAD.tempo[1];
    for (const song of songs) {
      expect(slow(song) ? ballads : fast(song) ? kits : [...kits, ...ballads]).toContainEqual(song.instruments.kit);
    }
    expect(new Set(songs.filter(fast).map((s) => s.instruments.kit))).toEqual(new Set(kits));
    for (const { program } of [...kits, ...ballads]) expect(program).toBeGreaterThanOrEqual(0);
  });

  it("plays each song's own kick and crashes on its kit, and now and then a synth drum on the band's hits", () => {
    const kicks = new Set<number>();
    const crashes = new Set<number>();
    let pairs = 0;
    for (const song of songs) {
      const { kick, crashes: own } = song.instruments.kitVoices;
      kicks.add(kick);
      for (const c of own) crashes.add(c);
      if (own.length === 2) pairs++;
      expect(new Set(own).size).toBe(own.length);
    }
    expect(kicks).toEqual(new Set(KIT_VOICES.kick.map(([drum]) => drum)));
    expect(crashes).toEqual(new Set(KIT_VOICES.crashes.map(([drum]) => drum)));
    expect(pairs).toBeGreaterThan(0);
    // Its notes: the kit's own kick and crash never, where the song plays others.
    for (const song of songs.slice(0, 40)) {
      const { kick, crashes: own, synthDrum } = song.instruments.kitVoices;
      const notes = new ScoreArranger(song).arrange().notes;
      const drums = notes.filter((n) => n.program === 'drums').map((n) => n.note);
      if (kick !== PERCUSSION.kick) expect(drums).not.toContain(PERCUSSION.kick);
      if (!own.includes(PERCUSSION.crash)) expect(drums).not.toContain(PERCUSSION.crash);
      expect(drums).toContain(kick);
      // (Two crashes taking turns, section by section: both heard.)
      for (const crash of own) expect(drums).toContain(crash);
      if (!synthDrum) expect(notes.some((n) => n.program === SYNTH_DRUM.program)).toBe(false);
    }
    const synths = songs.filter((s) => s.instruments.kitVoices.synthDrum);
    expect(synths.length).toBeGreaterThan(0);
    // On the kit, with the kick: never transposed, and swung with it.
    let struck = 0;
    for (const song of synths) {
      const notes = new ScoreArranger(song).arrange().notes;
      const kicks = notes.filter((n) => n.program === 'drums' && n.note === song.instruments.kitVoices.kick);
      for (const n of notes.filter((n) => n.program === SYNTH_DRUM.program)) {
        struck++;
        expect(n.path).toBe('kit');
        expect(n.note).toBe(SYNTH_DRUM.note);
        expect(kicks.some((k) => Math.abs(k.time - n.time) < 1e-9)).toBe(true);
      }
    }
    expect(struck).toBeGreaterThan(0);
  });
});
