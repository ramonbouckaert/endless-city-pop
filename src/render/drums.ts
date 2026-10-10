// A section's drums as patterns: the groove, maybe a crash on the first
// bar, and maybe a fill over the end of the last bar (a different one for
// each repeat). The fill replaces the kick and snare from where it
// starts, or everything for a stop.

import { s, type Pattern } from '@strudel/core';
import { at } from '../lib/steps';
import type { Drums } from '../model';
import type { DrumRole } from '../style';
import type { Band } from './band';
import { perBar } from './band';
import { gains, hits, lastBar } from './notation';

/**
 * `len` bars of drums, for the `repeat`th time the part plays. `enter`
 * may hold a part back, by role, with a mask.
 */
export function renderDrums(
  band: Band,
  d: Drums,
  len: number,
  repeat: number,
  enter?: (role: DrumRole) => string | undefined,
): Pattern[] {
  const fill = d.fill ? d.fills[repeat % d.fills.length] : null;
  const cut = fill && lastBar(len, fill.start ? `[1@${fill.start} 0@${16 - fill.start}]` : '0', '1');
  const groove = d.parts.map(({ sound, role, bars }) => {
    const p = s(perBar(bars.map((b) => hits(b, sound)))).gain(perBar(bars.map(gains)));
    const held = enter?.(role);
    const entered = held ? p.mask(held) : p;
    return cut && (fill.stop || role === 'kick' || role === 'snare' || role === 'ghost') ? entered.mask(cut) : entered;
  });
  // The fill's hits, one part per sound, in the last bar.
  const fillParts = [...new Set(fill?.hits.map((h) => h.sound))].map((sound) => {
    const bar = at(Object.fromEntries(fill!.hits.filter((h) => h.sound === sound).map((h) => [h.step, h.gain])));
    return s(lastBar(len, hits(bar, sound), '~')).gain(lastBar(len, gains(bar), '0'));
  });
  const crash = d.crash ? [s(`<cr ${'~ '.repeat(len - 1)}>`).gain(0.2)] : [];
  return [...groove, ...fillParts, ...crash].map((p) => band.drum(p));
}
