import { describe, expect, it } from 'vitest';
import { bars, clock, seconds } from '../src/app/time';
import { Form, section } from '../src/model';

describe('time', () => {
  it('counts bars as seconds on a clock, and back', () => {
    expect(seconds(8, 120)).toBe(16);
    expect(bars(16, 120)).toBe(8);
    expect(bars(seconds(37, 97), 97)).toBeCloseTo(37, 9);
    expect(clock(0)).toBe('0:00');
    expect(clock(65.9)).toBe('1:05');
  });

  it('places the playhead by section', () => {
    const form = new Form([section('intro', 4), section('verse', 8, { later: false }), section('finale', 2)]);
    expect(form.playhead(-1)).toBeUndefined();
    expect(form.playhead(0)).toEqual({ index: 0, through: 0 });
    expect(form.playhead(6)).toEqual({ index: 1, through: 0.25 });
    expect(form.playhead(20)).toEqual({ index: 2, through: 1 });
  });
});
