// The form's sections: one class per type, each built from its plan,
// writing its part's material (its harmony, then its melody, then the
// drums and bass that play it), and playing it, as notes. Each part draws
// on its own forked stream.

import type { Rng } from '../../lib/random';
import type { Key } from '../../theory';
import type { Form } from '../form';
import type { SectionPlan } from '../plan';
import { BuildContext, type SectionClasses } from './build-context';
import { Breakdown } from './breakdown';
import { Bridge } from './bridge';
import { Chorus } from './chorus';
import { DrumBreak } from './drum-break';
import { Finale } from './finale';
import { Intro } from './intro';
import { Lift } from './lift';
import { Outro } from './outro';
import { PreChorus } from './pre';
import { Riff } from './riff';
import { SoloSection } from './solo';
import { Vamp } from './vamp';
import { Verse } from './verse';

const CLASSES: SectionClasses = {
  intro: Intro,
  vamp: Vamp,
  verse: Verse,
  pre: PreChorus,
  chorus: Chorus,
  riff: Riff,
  bridge: Bridge,
  solo: SoloSection,
  breakdown: Breakdown,
  lift: Lift,
  outro: Outro,
  drumBreak: DrumBreak,
  finale: Finale,
};

/** A plan's sections, built in a key, each with its part's material. */
export function buildForm(plan: Form<SectionPlan>, key: Key, rng: Rng): Form {
  return new BuildContext(key, plan, rng, CLASSES).build();
}

export type { BuildContext } from './build-context';
export type { Parts } from './score-context';
export type { AnySection, Section, SectionOf } from './section';
