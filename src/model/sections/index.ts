// Writes the material each part of a form plays: its harmony, then its
// melody, then the drums and bass that play it. Each section type has
// its writer here (as each has its recipe in render/sections/); each
// part draws on its own forked stream.

import type { Rng } from '../../lib/random';
import type { Key } from '../../theory';
import type { Material } from '../material';
import type { Form } from '../form';
import { breakdown } from './breakdown';
import { bridge } from './bridge';
import { chorus } from './chorus';
import { WriteContext, type Writers } from './context';
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

const WRITERS: Writers = {
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

/** Each part's material, by part id. */
export function writeMaterials(key: Key, form: Form, rng: Rng): Record<string, Material> {
  const ctx = new WriteContext(key, form, rng, WRITERS);
  return Object.fromEntries(form.sections.map((sec) => [sec.part, ctx.material(sec)]));
}
