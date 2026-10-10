// Each section type's recipe: which instruments play its material, and how.

import type { Material, MaterialOf } from '../../model';
import type { SectionType } from '../../style';
import { breakdown } from './breakdown';
import { bridge } from './bridge';
import { chorus } from './chorus';
import type { Parts, SectionContext } from './context';
import { drumBreak } from './drum-break';
import { finale } from './finale';
import { intro } from './intro';
import { lift } from './lift';
import { outro } from './outro';
import { pre } from './pre';
import { riff } from './riff';
import { solo } from './solo';
import { vamp } from './vamp';
import { verse } from './verse';

const RECIPES: { [T in SectionType]: (ctx: SectionContext<MaterialOf<T>>) => Parts } = {
  intro,
  vamp,
  verse,
  pre,
  chorus,
  riff,
  bridge,
  solo,
  breakdown,
  lift,
  outro,
  drumBreak,
  finale,
};

/** The parts a section plays, by its material's type. */
export function sectionParts(ctx: SectionContext<Material>): Parts {
  const recipe = RECIPES[ctx.mat.type] as (ctx: SectionContext<Material>) => Parts;
  return recipe(ctx);
}

export { SectionContext, type Parts } from './context';
