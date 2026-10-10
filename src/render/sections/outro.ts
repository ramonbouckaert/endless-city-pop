import { type Pattern } from '@strudel/core';
import type { MaterialOf } from '../../model';
import { perBar } from '../band';
import type { Parts, PlayedContext } from './context';

// A reprise of the intro's chords, quietly, or soloists trading lines.
export function outro(ctx: PlayedContext<'outro'>): Parts {
  const { band, C, B, mat } = ctx;
  if (mat.variant === 'trade') return trade(ctx, mat);
  return { drums: ctx.drums(), pitched: [band.softKeys(C), band.strings(C), B.gain(0.6), ctx.teaser(mat.melody)] };
}

// A pared-back vamp, soft keys over light drums, while two soloists
// trade two-bar lines: the first on bars 1-2, 5-6, ...
function trade(
  ctx: PlayedContext<'outro'>,
  { solo, soloists: [first, second] }: Extract<MaterialOf<'outro'>, { variant: 'trade' }>,
): Parts {
  const { band, C, B, len } = ctx;
  const line = ctx.soloLine(solo);
  const turns = (mine: number): Pattern =>
    perBar(Array.from({ length: len }, (_, b) => (Math.floor(b / 2) % 2 === mine ? '1' : '0')));
  return {
    drums: ctx.drums().map((p) => p.postgain(0.7)),
    pitched: [
      B.gain(0.65),
      band.softKeys(C).gain(0.24),
      band.soloist(first, line.mask(turns(0))).pan(0.4),
      band.soloist(second, line.mask(turns(1))).pan(0.62),
    ],
  };
}
