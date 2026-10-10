import type { MaterialOf } from '../../model';
import type { Parts, PlayedScoreContext } from './context';

// A reprise of the intro's chords, quietly, or soloists trading lines.
export function outro(ctx: PlayedScoreContext<'outro'>): Parts {
  const { band, C, B, mat } = ctx;
  if (mat.variant === 'trade') return trade(ctx, mat);
  return { drums: ctx.drums(), pitched: [band.softKeys(C), band.strings(C), B.gain(0.6), ctx.teaser(mat.melody)] };
}

// A pared-back vamp, soft keys over light drums, while two soloists
// trade two-bar lines: the first on bars 1-2, 5-6, ...
function trade(
  ctx: PlayedScoreContext<'outro'>,
  { solo, soloists: [first, second] }: Extract<MaterialOf<'outro'>, { variant: 'trade' }>,
): Parts {
  const { band, C, B } = ctx;
  const line = ctx.soloLine(solo);
  const turn = (mine: number) => line.filter((n) => Math.floor(Math.floor(n.time) / 2) % 2 === mine);
  return {
    drums: ctx.drums().map((p) => p.postgain(0.7)),
    pitched: [
      B.gain(0.65),
      band.softKeys(C).gain(0.24),
      band.soloist(first, turn(0)).pan(0.4),
      band.soloist(second, turn(1)).pan(0.62),
    ],
  };
}
