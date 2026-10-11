import { describe, expect, it } from 'vitest';
import { DrumBreak, Finale, HALF, ShortBar, Song } from '../src/engine';
import { BASS_FEELS, WALKING_BASS } from '../src/style';
import { partSections } from './helpers';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('rhythm', () => {
  const songs = SEEDS.map((seed) => Song.generate(seed));

  it('gives every playing section drums with at least one part', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        expect(sec.material.drums, sec.kind.label).toBeDefined();
        expect(sec.material.drums.parts.length, sec.kind.label).toBeGreaterThan(0);
      }
    }
  });

  it('gives each drum part exactly 4 bars of 16 steps', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        for (const part of sec.material.drums.parts) {
          expect(part.bars).toHaveLength(4);
          for (const bar of part.bars) expect(bar).toHaveLength(16);
        }
      }
    }
  });

  it('produces well-formed fills', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof ShortBar) continue;
        for (const f of sec.material.drums.fills) {
          expect(f.start).toBeGreaterThanOrEqual(0);
          expect(f.start).toBeLessThan(16);
          expect(f.hits.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every section with chords a bass line', () => {
    for (const song of songs) {
      for (const sec of partSections(song)) {
        // The finale has the final chord but no bass line; a short bar, neither.
        if (sec instanceof Finale || sec instanceof DrumBreak || sec instanceof ShortBar) continue;
        expect(sec.material.bass.bars, sec.kind.label).toHaveLength(sec.material.bars.length);
        expect(sec.material.bass.bars.flat().length, sec.kind.label).toBeGreaterThan(0);
      }
    }
  });

  it('writes bass riffs as bars of sixteen sixteenths, starting on the root', () => {
    for (const { cells = [] } of Object.values(BASS_FEELS)) {
      for (const cell of cells) {
        expect(cell).toMatch(/^R[RTFSO.]{15}$/);
      }
    }
  });

  it("locks a song's kick to its bass, perhaps on one riff, and plays its guitar figure", () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`trait${i}`));
    const seen = new Set<string>();
    for (const song of songs) {
      const { lock, riff, ostinato } = song.traits;
      for (const sec of partSections(song)) {
        if (sec instanceof Finale || sec instanceof DrumBreak || sec instanceof ShortBar) continue;
        const mat = sec.material;
        const kick = mat.drums.parts.find((p) => p.role === 'kick');
        const grooves = ['funk', 'disco', 'fusion', 'halfTime'].includes(mat.drums.feel);
        // (A half chorus's bass starts halfway through the chorus's; its kick follows the chorus's first bar.)
        if (lock && grooves && kick && sec.part !== HALF) {
          seen.add('lock');
          // A kick wherever the bass starts a note in its first bar, and nowhere else.
          const starts = new Set(mat.bass.bars[0].map((n) => n.start));
          kick.bars[0].forEach((gain, step) => expect(gain > 0).toBe(starts.has(step)));
        }
        if (riff && grooves) {
          seen.add('riff');
          expect(mat.bass.feel).toBe('riff');
        }
        expect(mat.signature).toBe(ostinato && grooves ? ostinato : undefined);
        if (mat.signature) seen.add('guitar');
      }
    }
    expect(seen).toEqual(new Set(['lock', 'riff', 'guitar']));
  });

  it('walks a bass line in quarter notes, on the upright', () => {
    const songs = Array.from({ length: 300 }, (_, i) => Song.generate(`walk${i}`));
    let walks = 0;
    for (const song of songs) {
      for (const sec of song.form.sections) {
        if (sec instanceof Finale || sec instanceof DrumBreak || sec instanceof ShortBar) continue;
        if (sec.material.bass.feel !== 'walk') continue;
        walks++;
        expect(sec.sounds(song.instruments.sounds)?.bass).toBe(WALKING_BASS);
        for (const [b, notes] of sec.material.bass.bars.entries()) {
          expect(notes.every((n) => n.len === 4 && n.start % 4 === 0)).toBe(true);
          expect(notes).toHaveLength(4);
          expect(notes[0].start, `bar ${b}`).toBe(0);
        }
      }
    }
    expect(walks).toBeGreaterThan(5);
  });
});
