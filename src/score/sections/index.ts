// Each section type's recipe: which instruments play its material, and
// how, as notes.

import { isPlayed, type Section, type Song } from '../../model';
import type { SectionType } from '../../style';
import type { ScoreBand } from '../band';
import { breakdown } from './breakdown';
import { bridge } from './bridge';
import { chorus } from './chorus';
import { PlayedScoreContext, ScoreContext, type Parts, type ScoreContextOf } from './context';
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

// Each section type's context; RECIPES indexed by a type T takes ContextFor[T].
type ContextFor = { [T in SectionType]: ScoreContextOf<T> };

const RECIPES: { [T in SectionType]: (ctx: ContextFor[T]) => Parts } = {
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

/** The parts a section of a song plays, the `repeat`th time its part plays. */
export function sectionParts(song: Song, sec: Section, band: ScoreBand, repeat: number): Parts {
  const ctx = isPlayed(sec)
    ? new PlayedScoreContext(song, sec, song.material(sec), band, repeat)
    : new ScoreContext(song, sec, song.material(sec), band, repeat);
  // TypeScript can't follow isPlayed to the context of sec's own type.
  return play(sec.type, ctx as ContextFor[SectionType]);
}

// A type's recipe on its context: RECIPES indexed by T takes ContextFor[T].
function play<T extends SectionType>(type: T, ctx: ContextFor[T]): Parts {
  return RECIPES[type](ctx);
}

export type { Parts } from './context';
