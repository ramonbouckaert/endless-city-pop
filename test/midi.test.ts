import { describe, expect, it } from 'vitest';
import { Key } from '../src/theory';
import { DRUM_CHANNEL, keySignature, PPQ, vlq, writeMidi, type MidiSong } from '../src/midi/writer';

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
});
