import { describe, expect, it } from 'vitest';
import { clock, playheadAt, seconds, startFor } from '../src/app/time';
import { Section } from '../src/model';

describe('time', () => {
  it('counts bars as seconds on a clock', () => {
    expect(seconds(8, 120)).toBe(16);
    expect(clock(0)).toBe('0:00');
    expect(clock(65.9)).toBe('1:05');
  });

  it('places the playhead by section', () => {
    const form = [new Section('intro', 4), new Section('verse', 8), new Section('finale', 2)];
    expect(playheadAt(form, -1)).toBeUndefined();
    expect(playheadAt(form, 0)).toEqual({ index: 0, through: 0 });
    expect(playheadAt(form, 6)).toEqual({ index: 1, through: 0.25 });
    expect(playheadAt(form, 20)).toEqual({ index: 2, through: 1 });
  });

  it('starts songs at 0 when stopped, else where asked or where the last started', () => {
    expect(startFor(false, 12, 4)).toBe(0);
    expect(startFor(true, 12, 4)).toBe(12);
    expect(startFor(true, undefined, 4)).toBe(4);
  });
});
