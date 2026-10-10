import { describe, expect, it } from 'vitest';
import { bars, clock, seconds } from '../src/app/time';
import { Form, planned } from '../src/engine';

describe('time', () => {
  it('counts bars as seconds on a clock, and back', () => {
    expect(seconds(8, 120)).toBe(16);
    expect(bars(16, 120)).toBe(8);
    expect(bars(seconds(37, 97), 97)).toBeCloseTo(37, 9);
    expect(clock(0)).toBe('0:00');
    expect(clock(65.9)).toBe('1:05');
  });

  it('places the playhead by section', () => {
    const form = new Form([planned('intro', 4), planned('verse', 8, { later: false }), planned('finale', 2)]);
    expect(form.playhead(-1)).toEqual({ index: 0, through: 0 });
    expect(form.playhead(0)).toEqual({ index: 0, through: 0 });
    expect(form.playhead(6)).toEqual({ index: 1, through: 0.25 });
    expect(form.playhead(20)).toEqual({ index: 2, through: 1 });
    // And back: the bar a playhead stands at.
    for (const pos of [0, 3, 6, 12.5, 13]) expect(form.barAt(form.playhead(pos))).toBe(pos);
    expect(form.barAt({ index: 1, through: 2 })).toBe(12); // kept within the section
  });
});
