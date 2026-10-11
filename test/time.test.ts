import { describe, expect, it } from 'vitest';
import { bars, clock, seconds, songLength } from '../src/app/time';
import { Finale, Form, Intro, planned, Song, Verse } from '../src/engine';
import { FERMATA } from '../src/style';
import { heldBars, songWhere } from './helpers';
import { Timeline } from '../src/lib/timeline';

const ending = (song: Song) => song.part(Finale)?.variant === 'fermata';
const midSong = (song: Song) => song.form.sections.some((sec) => sec.fermata);
// Songs ending on a fermata, holding one mid-song, both, and neither.
const songs = {
  ending: songWhere((s) => ending(s) && !midSong(s), 'a song ending on a fermata, and none before'),
  midSong: songWhere((s) => midSong(s) && !ending(s), 'a song holding a fermata mid-song only'),
  both: songWhere((s) => midSong(s) && ending(s), 'a song with fermatas mid-song and at its end'),
  neither: songWhere((s) => !midSong(s) && !ending(s), 'a song with no fermata'),
};
const held = Object.values(songs).filter((s) => heldBars(s).length);

describe('time', () => {
  it('counts bars as seconds on a clock, and back', () => {
    const steady = Timeline.steady(120);
    expect(steady.seconds(8)).toBe(16);
    expect(steady.timeAt(16)).toBe(8);
    const odd = Timeline.steady(97);
    expect(odd.timeAt(odd.seconds(37))).toBeCloseTo(37, 9);
    expect(clock(0)).toBe('0:00');
    expect(clock(65.9)).toBe('1:05');
  });

  it('times a song on its timeline', () => {
    const song = Song.generate('time');
    // At least as long as its bars at its tempo: a fermata only slows it.
    expect(songLength(song)).toBeGreaterThanOrEqual((song.bars * 4 * 60) / song.bpm - 1e-9);
    expect(songLength(song)).toBe(song.timeline.seconds(song.bars));
    expect(bars(song, seconds(song, 12.25))).toBeCloseTo(12.25, 9);
  });

  it('times tempo changes', () => {
    // Halving the tempo from bar 2 doubles the rest's length.
    const slowed = new Timeline([
      { at: 0, bpm: 120 },
      { at: 2, bpm: 60 },
    ]);
    expect(slowed.seconds(2)).toBe(4);
    expect(slowed.seconds(4)).toBe(12);
    expect(slowed.bpmAt(1.5)).toBe(120);
    expect(slowed.bpmAt(3)).toBe(60);
    for (const time of [0, 1.75, 2, 2.5, 3.9]) expect(slowed.timeAt(slowed.seconds(time))).toBeCloseTo(time, 9);
    expect(slowed.tempoChanges).toEqual([
      { quarter: 0, bpm: 120 },
      { quarter: 8, bpm: 60 },
    ]);
  });

  it('places the playhead by section', () => {
    const form = new Form([planned(Intro, 4), planned(Verse, 8, { later: false }), planned(Finale, 2)]);
    expect(form.playhead(-1)).toEqual({ index: 0, through: 0 });
    expect(form.playhead(0)).toEqual({ index: 0, through: 0 });
    expect(form.playhead(6)).toEqual({ index: 1, through: 0.25 });
    expect(form.playhead(20)).toEqual({ index: 2, through: 1 });
    // And back: the bar a playhead stands at.
    for (const pos of [0, 3, 6, 12.5, 13]) expect(form.barAt(form.playhead(pos))).toBe(pos);
    expect(form.barAt({ index: 1, through: 2 })).toBe(12); // kept within the section
  });

  it('slows each held bar to its fermata, and only that bar: the finale to half, mid-song less', () => {
    expect(FERMATA.midSong).toBeGreaterThan(FERMATA.ending);
    for (const song of Object.values(songs)) {
      const { bpm, timeline } = song;
      const held = heldBars(song);
      expect(timeline.tempoChanges).toEqual([
        { quarter: 0, bpm },
        ...held.flatMap(({ bar, scale }) => [
          { quarter: bar * 4, bpm: bpm * scale },
          { quarter: (bar + 1) * 4, bpm },
        ]),
      ]);
      for (const { bar, scale } of held) {
        expect(timeline.bpmAt(bar - 0.01)).toBe(bpm);
        expect(timeline.bpmAt(bar + 0.5)).toBe(bpm * scale);
        expect(timeline.bpmAt(bar + 1)).toBe(bpm);
      }
    }
    expect(heldBars(songs.ending).map((h) => h.scale)).toEqual([FERMATA.ending]);
    expect(heldBars(songs.midSong).map((h) => h.scale)).toEqual([FERMATA.midSong]);
    expect(heldBars(songs.both).map((h) => h.scale)).toEqual([FERMATA.midSong, FERMATA.ending]);
    expect(heldBars(songs.neither)).toEqual([]);
  });

  it('times a song with fermatas: longer by each held bar, its sections where they start', () => {
    for (const song of Object.values(songs)) {
      const { bpm, form } = song;
      const bar = 240 / bpm; // seconds a bar at the song's tempo
      const held = heldBars(song);
      // A held bar lasts 1 / scale bars' time.
      const at = (time: number) =>
        (time + held.reduce((sum, h) => sum + Math.min(Math.max(time - h.bar, 0), 1) * (1 / h.scale - 1), 0)) * bar;
      expect(songLength(song)).toBeCloseTo(at(song.bars), 9);
      expect(songLength(song)).toBeCloseTo((song.bars + held.reduce((sum, h) => sum + 1 / h.scale - 1, 0)) * bar, 9);
      form.starts.forEach((s) => expect(seconds(song, s)).toBeCloseTo(at(s), 9));
      for (const { bar: b, scale } of held) {
        expect(seconds(song, b + 0.5)).toBeCloseTo(seconds(song, b) + bar / (2 * scale), 9);
        expect(seconds(song, b + 1)).toBeCloseTo(seconds(song, b) + bar / scale, 9);
      }
    }
  });

  it("places the playhead by section in songs with fermatas, as the page does from the player's time", () => {
    for (const song of held) {
      const { form } = song;
      // The page: the player's time in seconds, to bars, to a section and how far through it.
      const at = (time: number) => form.playhead(bars(song, time));
      form.sections.forEach((sec, i) => {
        // Halfway through each section's time, in bars: past a bar it
        // holds (`offset` bars in), that bar took 1 / scale bars' time.
        const start = seconds(song, form.starts[i]);
        const end = seconds(song, form.starts[i] + sec.bars);
        const half = (end - start) / 2 / (240 / song.bpm); // in bars' time
        const h = heldBars(song).find(({ bar }) => bar >= form.starts[i] && bar < form.starts[i] + sec.bars);
        let expected = half;
        if (h) {
          const offset = h.bar - form.starts[i];
          const stretch = 1 / h.scale;
          if (half > offset)
            expected = half <= offset + stretch ? offset + (half - offset) * h.scale : half - (stretch - 1);
        }
        const { index, through } = at((start + end) / 2);
        expect(index).toBe(i);
        expect(through * sec.bars).toBeCloseTo(expected, 9);
      });
      // Through a held bar, the playhead moves at its fermata's pace.
      for (const { bar: b, scale } of heldBars(song)) {
        const bar = 240 / song.bpm;
        const from = seconds(song, b);
        const i = form.playhead(b + 0.5).index;
        const len = form.sections[i].bars;
        expect(at(from + bar / 2).index).toBe(i);
        expect((at(from + bar / 2).through - at(from).through) * len).toBeCloseTo(scale / 2, 9);
      }
      // At the end, held there through the silence after it.
      const last = form.length - 1;
      expect(at(songLength(song))).toEqual({ index: last, through: 1 });
      expect(at(songLength(song) + 1)).toEqual({ index: last, through: 1 });
      // And back: seeking to a section from the form strip lands on its start.
      form.starts.forEach((s) => expect(bars(song, seconds(song, s))).toBeCloseTo(s, 9));
    }
  });
});
