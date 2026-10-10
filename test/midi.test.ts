import { describe, expect, it } from 'vitest';
import { Key } from '../src/theory';
import { channelsFor, songToMidi } from '../src/midi/from-score';
import { CC, DRUM_CHANNEL, keySignature, PPQ, vlq, writeMidi, type MidiSong } from '../src/midi/writer';
import { Song } from '../src/model';
import { defined } from './helpers';

// A small Standard MIDI File reader: each track's events with absolute ticks.
function read(bytes: Uint8Array) {
  let p = 0;
  const str = (n: number) => String.fromCharCode(...bytes.slice(p, (p += n)));
  const u = (n: number) => [...bytes.slice(p, (p += n))].reduce((a, b) => a * 256 + b, 0);
  const vq = () => {
    let n = 0;
    let b: number;
    do n = n * 128 + ((b = bytes[p++]) & 0x7f);
    while (b & 0x80);
    return n;
  };
  expect(str(4)).toBe('MThd');
  expect(u(4)).toBe(6);
  const header = { format: u(2), tracks: u(2), division: u(2) };
  const tracks = Array.from({ length: header.tracks }, () => {
    expect(str(4)).toBe('MTrk');
    const end = u(4) + p;
    const events: { tick: number; status: number; type?: number; data: number[] }[] = [];
    let tick = 0;
    while (p < end) {
      tick += vq();
      const status = bytes[p++];
      if (status === 0xff) {
        const type = bytes[p++];
        const len = vq();
        events.push({ tick, status, type, data: [...bytes.slice(p, (p += len))] });
      } else {
        const len = (status & 0xf0) === 0xc0 ? 1 : 2;
        events.push({ tick, status, data: [...bytes.slice(p, (p += len))] });
      }
    }
    expect(p).toBe(end);
    return events;
  });
  return { header, tracks };
}

const song = (tracks: MidiSong['tracks']): MidiSong => ({
  title: 'Test',
  bpm: 120,
  key: new Key(2, 'minor'),
  markers: [
    { tick: 0, text: 'intro 4' },
    { tick: 4 * 4 * PPQ, text: 'verse 8' },
  ],
  tracks,
});

describe('MIDI', () => {
  it('writes variable-length quantities', () => {
    expect(vlq(0)).toEqual([0]);
    expect(vlq(127)).toEqual([0x7f]);
    expect(vlq(128)).toEqual([0x81, 0x00]);
    expect(vlq(0x3fff)).toEqual([0xff, 0x7f]);
    expect(vlq(0x200000)).toEqual([0x81, 0x80, 0x80, 0x00]);
  });

  it('signs keys by their relative major', () => {
    expect(keySignature(new Key(2, 'minor'))).toEqual({ sf: -1, minor: true }); // D minor: Bb
    expect(keySignature(new Key(4, 'dorian'))).toEqual({ sf: 2, minor: false }); // E dorian: D major
    expect(keySignature(new Key(7, 'mixolydian'))).toEqual({ sf: 0, minor: false });
    expect(keySignature(new Key(6))).toEqual({ sf: -6, minor: false }); // Gb major
    expect(keySignature(new Key(11))).toEqual({ sf: 5, minor: false }); // B major
  });

  it('writes a type-1 file with a conductor track', () => {
    const file = read(
      writeMidi(
        song([
          { name: 'bass', channel: 0, program: 33, notes: [{ tick: 0, dur: PPQ, pitch: 38, velocity: 100 }] },
          { name: 'Drums', channel: DRUM_CHANNEL, notes: [{ tick: PPQ, dur: 120, pitch: 36, velocity: 90 }] },
        ]),
      ),
    );
    expect(file.header).toEqual({ format: 1, tracks: 3, division: PPQ });
    const [conductor, bass, drums] = file.tracks;
    const metaOf = (type: number) => conductor.filter((e) => e.type === type);
    expect(metaOf(0x51)[0].data).toEqual([0x07, 0xa1, 0x20]); // 500000 us: 120 BPM
    expect(metaOf(0x58)[0].data).toEqual([4, 2, 24, 8]);
    expect(metaOf(0x59)[0].data).toEqual([0xff, 1]); // one flat, minor
    expect(metaOf(0x06).map((e) => [e.tick, String.fromCharCode(...e.data)])).toEqual([
      [0, 'intro 4'],
      [16 * PPQ, 'verse 8'],
    ]);
    for (const t of file.tracks) expect(t.at(-1)).toMatchObject({ status: 0xff, type: 0x2f });

    expect(bass.filter((e) => e.status !== 0xff)).toEqual([
      { tick: 0, status: 0xc0, data: [33] },
      { tick: 0, status: 0x90, data: [38, 100] },
      { tick: PPQ, status: 0x80, data: [38, 0] },
    ]);
    // Drums: channel 10, and no program change.
    expect(drums.filter((e) => e.status !== 0xff).map((e) => e.status)).toEqual([0x99, 0x89]);
  });

  it('slides notes in with pitch bends', () => {
    const notes = [
      { tick: 0, dur: PPQ, pitch: 60, velocity: 80, slide: { semis: -1, ticks: 48 } },
      { tick: PPQ, dur: 20, pitch: 62, velocity: 80, slide: { semis: 3, ticks: 48 } }, // slides past its end
      { tick: 2 * PPQ, dur: PPQ, pitch: 64, velocity: 80 },
    ];
    const [, track] = read(writeMidi(song([{ name: 'sax', channel: 2, program: 65, notes }]))).tracks;
    const ccs = track.filter((e) => e.status === 0xb2).map((e) => e.data);
    // The bend range reaches the widest slide, three semitones.
    expect(ccs).toEqual([
      [101, 0],
      [100, 0],
      [6, 3],
      [38, 0],
      [101, 127],
      [100, 127],
    ]);
    const bends = track
      .filter((e) => e.status === 0xe2)
      .map((e) => ({ tick: e.tick, bend: e.data[0] + (e.data[1] << 7) - 8192 }));
    // A semitone below at the note-on (before it), back to centre 48 ticks on.
    expect(track.findIndex((e) => e.status === 0xe2)).toBeLessThan(track.findIndex((e) => e.status === 0x92));
    expect(bends[0]).toEqual({ tick: 0, bend: Math.round(-8192 / 3) });
    expect(bends[8]).toEqual({ tick: 48, bend: 0 });
    expect(bends.slice(0, 9).every((b, i) => !i || b.bend >= bends[i - 1].bend)).toBe(true);
    // Three semitones above, cut to the note's 20 ticks.
    expect(bends[9]).toEqual({ tick: PPQ, bend: 8191 });
    expect(bends.at(-1)).toEqual({ tick: PPQ + 20, bend: 0 });
    expect(bends).toHaveLength(18);
  });

  it('never lets a note-off cut a repeated note short', () => {
    const notes = [
      { tick: 0, dur: 2 * PPQ, pitch: 60, velocity: 80 },
      { tick: PPQ, dur: PPQ, pitch: 60, velocity: 80 }, // overlaps the first
      { tick: 2 * PPQ, dur: PPQ, pitch: 60, velocity: 80 }, // starts as the second ends
    ];
    const [, track] = read(writeMidi(song([{ name: 'keys', channel: 1, program: 4, notes }]))).tracks;
    const sounding = track
      .filter((e) => (e.status & 0xf0) === 0x90 || (e.status & 0xf0) === 0x80)
      .map((e) => [e.tick, (e.status & 0xf0) === 0x90 ? 'on' : 'off']);
    expect(sounding).toEqual([
      [0, 'on'],
      [PPQ, 'off'],
      [PPQ, 'on'],
      [2 * PPQ, 'off'],
      [2 * PPQ, 'on'],
      [3 * PPQ, 'off'],
    ]);
  });
  it('writes controller changes before the notes at their tick', () => {
    const file = read(
      writeMidi(
        song([
          {
            name: 'lead',
            channel: 2,
            notes: [
              { tick: 0, dur: PPQ, pitch: 60, velocity: 100 },
              { tick: PPQ, dur: PPQ, pitch: 62, velocity: 100 },
            ],
            controls: [
              { tick: 0, controller: CC.volume, value: 90 },
              { tick: PPQ, controller: CC.pan, value: 30 },
            ],
          },
        ]),
      ),
    );
    expect(file.tracks[1].filter((e) => e.status !== 0xff)).toEqual([
      { tick: 0, status: 0xb2, data: [CC.volume, 90] },
      { tick: 0, status: 0x92, data: [60, 100] },
      { tick: PPQ, status: 0x82, data: [60, 0] },
      { tick: PPQ, status: 0xb2, data: [CC.pan, 30] },
      { tick: PPQ, status: 0x92, data: [62, 100] },
      { tick: 2 * PPQ, status: 0x82, data: [62, 0] },
    ]);
  });

  it("gives each of a song's tracks its volume, pan and reverb before its first note", () => {
    const tracks = read(songToMidi(Song.generate('mix'))).tracks.slice(1);
    let panned = 0;
    for (const track of tracks) {
      const first = track.findIndex((e) => (e.status & 0xf0) === 0x90);
      const mix: number[] = [CC.volume, CC.pan, CC.reverb];
      const before = track.slice(0, first).filter((e) => (e.status & 0xf0) === 0xb0 && mix.includes(e.data[0]));
      expect(before.map((e) => e.data[0]).sort((a, b) => a - b)).toEqual(mix);
      const pans = track.filter((e) => (e.status & 0xf0) === 0xb0 && e.data[0] === CC.pan);
      if (pans.some((e) => e.data[1] !== 64)) panned++;
      // The loudest note plays at full velocity: the track's volume sets its level.
      const velocities = track.filter((e) => (e.status & 0xf0) === 0x90).map((e) => e.data[1]);
      expect(Math.max(...velocities)).toBe(127);
    }
    expect(panned).toBeGreaterThan(0);
  });
  it('shares a channel only between sounds that never play at once, set up as each starts', () => {
    // Fifteen sounds playing throughout, then two in the finale; the
    // first two finish early.
    const spans = [
      { first: 0, last: 100 },
      { first: 0, last: 200 },
      ...Array.from({ length: 13 }, () => ({ first: 0, last: 1000 })),
      { first: 900, last: 1000 },
      { first: 950, last: 1000 },
    ];
    const channels = channelsFor(spans);
    expect(new Set(channels.slice(0, 15).map((c) => c.channel)).size).toBe(15);
    expect(channels.map((c) => c.channel)).not.toContain(DRUM_CHANNEL);
    expect(channels[15]).toEqual({ channel: channels[0].channel, start: 900 });
    expect(channels[16]).toEqual({ channel: channels[1].channel, start: 950 });
  });

  it("never plays two of a song's tracks on one channel at once", () => {
    // ch1 has seventeen melodic sounds, two of them only in the finale.
    const tracks = read(songToMidi(Song.generate('ch1'))).tracks.slice(1);
    const spans = new Map<number, [number, number][]>();
    for (const track of tracks) {
      const notes = track.filter((e) => (e.status & 0xf0) === 0x90 || (e.status & 0xf0) === 0x80);
      if (!notes.length) continue;
      const ch = notes[0].status & 0x0f;
      spans.set(ch, [...(spans.get(ch) ?? []), [notes[0].tick, defined(notes.at(-1), 'a last note').tick]]);
      // Its program comes no later than its first note.
      const program = track.find((e) => (e.status & 0xf0) === 0xc0);
      if (program) expect(program.tick).toBeLessThanOrEqual(notes[0].tick);
    }
    expect([...spans.values()].some((s) => s.length > 1)).toBe(true);
    for (const list of spans.values()) {
      const sorted = list.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i][0]).toBeGreaterThanOrEqual(sorted[i - 1][1]);
    }
  });
});
