// The form's sections: one class per kind, each built from its plan,
// writing its part's material (its harmony, then its melody, then the
// drums and bass that play it), and playing it, as notes. Each part draws
// on its own forked stream.

import type { Rng } from '../../lib/random';
import type { Colour } from '../../style';
import type { Key } from '../../theory';
import type { Form } from './form';
import { BuildContext } from './build-context';
import { Breakdown } from './breakdown';
import { Bridge } from './bridge';
import { Chorus, HALF } from './chorus';
import { DrumBreak } from './drum-break';
import { Finale } from './finale';
import { Intro } from './intro';
import { Lift } from './lift';
import { Link } from './link';
import { Outro } from './outro';
import { PreChorus } from './pre';
import { Riff } from './riff';
import type { Plan } from './section';
import { SoloSection } from './solo';
import { Vamp } from './vamp';
import { Verse } from './verse';

/** Every kind of section. */
const KINDS = [
  Intro,
  Vamp,
  Link,
  Verse,
  PreChorus,
  Chorus,
  Riff,
  Bridge,
  SoloSection,
  Breakdown,
  Lift,
  Outro,
  DrumBreak,
  Finale,
] as const;

/** A section of any kind, as its kind's class (narrowed with instanceof). */
export type AnySection = InstanceType<(typeof KINDS)[number]>;
/** A part's material, of any kind. */
export type Material = AnySection['material'];

/** A plan's sections, built in a key at a tempo (in a colour), each with its part's material. */
export function buildForm(plan: Form<Plan>, key: Key, bpm: number, rng: Rng, colour?: Colour): Form {
  return new BuildContext(key, bpm, plan, rng, colour).build();
}

export { HALF };
export {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  Intro,
  Lift,
  Link,
  Outro,
  PreChorus,
  Riff,
  SoloSection,
  Vamp,
  Verse,
};
export { Form, type Playhead } from './form';
export { planned, type Plan, type SectionKind, type TempoMark } from './section';
