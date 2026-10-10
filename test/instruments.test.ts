import { describe, expect, it } from 'vitest';
import { Kit, Song } from '../src/model';
import {
  BAND,
  DRUM_SOUNDS,
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
  const { pool, soloists } = VOICES;
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
    const { instruments } = songs[0];
    const { sounds } = instruments;
    expect(instruments.sound('keys')).toBe(sounds.keys);
    expect(instruments.sound('soloists.2')).toBe(sounds.soloists[2]);
    const changed = instruments.with('bass', 'sawtooth').with('soloists.1', 'sine');
    expect(changed.sounds).toEqual({ ...sounds, bass: 'sawtooth', soloists: sounds.soloists.with(1, 'sine') });
    expect(sounds.bass).not.toBe('sawtooth'); // the original is left as it was
    expect(instruments.withKit('LinnDrum').kit.bank).toBe('LinnDrum');
  });

  it('leaves out the sounds taken off the lists', () => {
    const everywhere = [...pool, ...Object.values(PICKS).flat()];
    for (const gone of ['brown', 'gm_pad_bowed', 'gm_pad_new_age']) expect(everywhere).not.toContain(gone);
  });

  it("trims a melody voice by the sound's level, a band part by its level over BAND's", () => {
    const { instruments } = songs[0];
    expect(instruments.trim('lead')).toBe(SOUND_LEVELS[instruments.sounds.lead]);
    expect(instruments.with('soloists.0', 'sawtooth').trim('soloists.0')).toBe(SOUND_LEVELS.sawtooth);
    expect(instruments.with('keys', 'gm_epiano2').trim('keys')).toBe(SOUND_LEVELS.gm_epiano2 / SOUND_LEVELS[BAND.keys]);
  });

  it('plays the drum sounds a kit lacks from the default samples', () => {
    expect(new Kit(null).bankFor('bd')).toBeUndefined();
    expect(new Kit('RolandTR808').bankFor('bd')).toBe('RolandTR808');
    expect(new Kit('rolandtr808').bankFor('rd')).toBeUndefined();
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
      for (const g of gaps) expect(DRUM_SOUNDS).toHaveProperty(g);
    }
  });
});
