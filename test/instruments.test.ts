import { describe, expect, it } from 'vitest';
import { Song } from '../src/model';
import { GM, type Program } from '../src/lib/general-midi';
import { BAND, KITS, PICKS, SOUND_LEVELS, VOICES, type PickedPart } from '../src/style';
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

  it("plays each song on one of the soundfont's drum kits", () => {
    const kits = KITS.map(([k]) => k);
    expect(new Set(songs.map((s) => s.instruments.kit))).toEqual(new Set(kits));
    for (const { program } of kits) expect(program).toBeGreaterThanOrEqual(0);
  });
});
