import { describe, expect, it } from 'vitest';
import { Song, soundAt, voiceGain, withSound } from '../src/model';
import {
  BAND,
  GM_PROGRAMS,
  KIT_GAPS,
  KITS,
  PICKS,
  SAME_SOUND,
  SOUND_LEVELS,
  VOICES,
  type PickedPart,
} from '../src/style';

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

  it('reads and replaces a sound by its path, soloists by index', () => {
    const { sounds } = songs[0].instruments;
    expect(soundAt(sounds, 'keys')).toBe(sounds.keys);
    expect(soundAt(sounds, 'soloists.2')).toBe(sounds.soloists[2]);
    const changed = withSound(withSound(sounds, 'bass', 'sawtooth'), 'soloists.1', 'sine');
    expect(changed).toEqual({ ...sounds, bass: 'sawtooth', soloists: sounds.soloists.with(1, 'sine') });
    expect(sounds.bass).not.toBe('sawtooth'); // the original is left as it was
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
