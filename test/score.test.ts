import { describe, expect, it } from 'vitest';
import { songToMidi } from '../src/midi/from-score';
import { ScoreArranger, Song } from '../src/engine';
import { PERCUSSION } from '../src/lib/general-midi';
import { BASS_LOW, Chord, voice, voicingNote } from '../src/theory';
import { defined } from './helpers';

const songs = Array.from({ length: 20 }, (_, i) => Song.generate(`score${i}`));
const scoreOf = (song: Song) => new ScoreArranger(song).arrange();

describe('score', () => {
  it('is the same for a seed', () => {
    expect(scoreOf(Song.generate('score0'))).toEqual(scoreOf(songs[0]));
  });

  it('plays every section, and nothing outside the song', () => {
    for (const song of songs) {
      const { notes, bars } = scoreOf(song);
      for (const n of notes) {
        expect(n.time).toBeGreaterThanOrEqual(0);
        expect(n.time).toBeLessThan(bars);
        expect(n.dur).toBeGreaterThan(0);
      }
      song.form.sections.forEach((sec, i) => {
        const start = song.form.starts[i];
        expect(notes.some((n) => n.time >= start && n.time < start + sec.bars)).toBe(true);
      });
    }
  });

  it("plays the band's drums on the kit", () => {
    const drums = Object.values(PERCUSSION);
    for (const song of songs) {
      for (const n of scoreOf(song).notes.filter((n) => n.program === 'drums')) {
        expect(n.path).toBe('kit');
        expect(drums).toContain(n.note);
      }
    }
  });

  it("plays a verse's melody in its key, from the tonic in octave 4", () => {
    for (const song of songs) {
      const index = song.form.sections.findIndex((s) => s.type === 'verse');
      const verse = defined(song.part('verse'), 'a verse');
      const start = song.form.starts[index];
      const lead = scoreOf(song).notes.filter((n) => n.path === 'lead' && n.time >= start && n.time < start + 1);
      // The first bar's notes, by their start (an eighth-note grid, so never swung).
      for (const m of verse.melody.bars[0]) {
        const at = start + m.start / 8;
        const note = defined(
          lead.find((n) => Math.abs(n.time - at) < 1e-9),
          `a lead note at bar ${at}`,
        ).note;
        expect(note).toBe(60 + verse.key.tonic + m.semis);
      }
    }
  });

  it('keeps the bass at or above its lowest note', () => {
    for (const song of songs) {
      const bass = scoreOf(song).notes.filter((n) => n.path === 'bass');
      expect(bass.length).toBeGreaterThan(0);
      for (const n of bass) expect(n.note).toBeGreaterThanOrEqual(BASS_LOW);
    }
  });

  it('writes a MIDI file from the score', () => {
    const bytes = songToMidi(songs[0]);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe('voicing', () => {
  const chords = ['^9', 'm9', '13', '7alt', 'm7b5', '9sus', '', 'm', '69', '13#11'].flatMap((symbol) =>
    [0, 5, 10].map((root) => new Chord(root, symbol)),
  );

  it('keeps the top note at or within an octave below the anchor', () => {
    for (const chord of chords) {
      for (const anchor of [69, 72, 79, 86]) {
        const notes = voice(chord, anchor);
        const top = defined(notes.at(-1), 'a top note');
        expect(top).toBeLessThanOrEqual(anchor);
        expect(top).toBeGreaterThan(anchor - 12);
        expect(notes).toEqual([...notes].sort((a, b) => a - b));
        expect(top - notes[0]).toBeLessThan(12);
      }
    }
  });

  it("plays a chord's third and seventh, and leaves the root to the bass in a big chord", () => {
    for (const chord of chords) {
      const pcs = voice(chord).map((n) => (n - chord.root + 120) % 12);
      for (const t of chord.tones.map((t) => t % 12)) {
        if ([3, 4, 10, 11].includes(t)) expect(pcs).toContain(t);
      }
      if (chord.tones.length >= 4) expect(pcs).not.toContain(0);
    }
  });

  it('counts past the top of a voicing an octave up', () => {
    const chord = new Chord(2, 'm9');
    const notes = voice(chord);
    expect(voicingNote(chord, 0)).toBe(notes[0]);
    expect(voicingNote(chord, notes.length)).toBe(notes[0] + 12);
    expect(voicingNote(chord, -1)).toBe(defined(notes.at(-1), 'a top note') - 12);
  });
});
