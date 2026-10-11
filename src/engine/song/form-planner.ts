// Plans a song's form: the ordered sections, their lengths, and what
// each repeat changes. The odds are in style/form.ts.

import type { Rng, Weighted } from '../../lib/random';
import { FORM, MAX_SHIFT, OUTRO_STYLES, SONG, type FormShape, type Turnaround } from '../../style';
import {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  Form,
  Intro,
  HALF,
  Lift,
  Link,
  Outro,
  planned,
  PreChorus,
  Riff,
  SoloSection,
  Vamp,
  Verse,
  type Plan,
  type SectionKind,
} from '../sections';

export class FormPlanner {
  private readonly shape: FormShape;
  private readonly preBars: number;
  private readonly chorusBars: number;
  // Whether its rounds open with a verse (and a pre-chorus), or are choruses alone.
  private readonly verses: boolean;
  // Whether its verses are all seven bars, and whether each round sings its verse twice.
  private readonly shortVerses: boolean;
  private readonly verseTwice: boolean;
  // How long the link before each verse after the first is (0: none).
  private readonly linkBars: number;
  // Whether its later choruses stop dead in their last bar.
  private readonly stops: boolean;
  // How much likelier a sixteen-bar section is at the song's tempo (1: as its odds say).
  private readonly sixteens: number;

  /** `turnarounds`: the lifts into a last chorus the song's tonality offers; `bpm`: the song's tempo, which favours sixteen-bar sections the faster it is. */
  constructor(
    private readonly rng: Rng,
    private readonly turnarounds: Readonly<Record<string, Turnaround>>,
    bpm: number,
  ) {
    const [slow, fast] = SONG.pace;
    const pace = Math.min(1, Math.max(0, (bpm - slow) / (fast - slow)));
    this.sixteens = 1 + (FORM.sixteenAtSpeed - 1) * pace;
    this.shape = rng.fork('shape').weightedKey(FORM.shape);
    const tune = this.shape === 'tune';
    const jpop = this.shape === 'jpop';
    const preBars = rng.weighted(FORM.preBars);
    // A J-pop form always has its B, the pre-chorus.
    this.preBars = jpop ? Math.max(4, preBars) : preBars;
    // A tune is eight bars, played again and again.
    const chorusBars = this.length(FORM.chorusBars);
    this.chorusBars = tune ? 8 : chorusBars;
    const verses = rng.chance(FORM.verseChance);
    this.verses = jpop || (verses && !tune);
    const extras = rng.fork('extras');
    this.shortVerses = extras.chance(FORM.shortVerse);
    this.verseTwice = jpop || extras.chance(FORM.verseTwice);
    this.linkBars = extras.chance(FORM.link.chance) ? extras.pick(FORM.link.bars) : 0;
    this.stops = extras.chance(FORM.stopChance);
  }

  // A section's length in bars, with sixteen weighted up by the tempo.
  private length(lengths: Weighted<number>): number {
    return this.rng.weighted(lengths.map(([bars, w]): [number, number] => [bars, bars === 16 ? w * this.sixteens : w]));
  }

  plan(): Form<Plan> {
    const opening = this.opening();
    const body = [...this.rounds(), ...this.middle()];
    const vamp = opening.find((s) => s.kind === Vamp);
    return new Form(this.held([...opening, ...(vamp ? this.vampReturn(body, vamp.bars) : body), ...this.ending()]));
  }

  // The intro, and perhaps a vamp.
  private opening(): Plan[] {
    const { rng } = this;
    const s: Plan[] = [planned(Intro, rng.weighted(FORM.introBars))];
    if (rng.chance(FORM.vamp.chance)) s.push(planned(Vamp, rng.pick(FORM.vamp.bars), { returning: false }));
    return s;
  }

  // Now and then, one moment of tension held on a fermata: the last bar
  // of a pre-chorus, a bridge, a breakdown or a lift (one of two bars or
  // more, so a bar plays before the held one).
  private held(plans: readonly Plan[]): Plan[] {
    const rng = this.rng.fork('fermata');
    const tense: ReadonlySet<SectionKind> = new Set([PreChorus, Bridge, Breakdown, Lift]);
    const spots = plans.flatMap((p, i) => (tense.has(p.kind) && p.bars >= 2 ? [i] : []));
    if (!spots.length || !rng.chance(FORM.fermataChance)) return [...plans];
    const at = rng.pick(spots);
    return plans.map((p, i) => (i === at ? { ...p, fermata: true } : p));
  }

  // The body, perhaps with the opening vamp back (and perhaps once more),
  // each time after a section that hands over to anything (not a verse,
  // which leads on to its pre-chorus or chorus).
  private vampReturn(body: Plan[], bars: number, chance: number = FORM.vamp.returns): Plan[] {
    const { rng } = this;
    if (!rng.chance(chance)) return body;
    // Never beside another vamp, nor between a riff and its repeat a semitone up.
    const apart = (next: Plan | undefined) => next?.kind !== Vamp && !(next?.kind === Riff && next.shift);
    const spots = body.flatMap((s, i) => (s.kind.handsOver && s.kind !== Vamp && apart(body[i + 1]) ? [i + 1] : []));
    if (!spots.length) return body;
    const at = rng.pick(spots);
    const back = [...body.slice(0, at), planned(Vamp, bars, { returning: true }), ...body.slice(at)];
    return chance === FORM.vamp.returns ? this.vampReturn(back, bars, FORM.vamp.returnsAgain) : back;
  }

  // Rounds of a verse (perhaps twice, after a link) and pre-chorus (in a
  // song that has them), a chorus, and perhaps a riff (perhaps again a
  // semitone up); a later round may leave out its verse or pre-chorus,
  // or play just the chorus's second half. A tune's rounds are its
  // chorus twice.
  private rounds(): Plan[] {
    const { rng } = this;
    const riffChance = this.shape === 'jpop' ? 1 : rng.pick(FORM.riffChance);
    const count = this.shape === 'tune' ? rng.weighted(TUNE_ROUNDS) : rng.weighted(FORM.rounds);
    return Array.from({ length: count }, (_, r) => {
      const later = r > 0;
      if (this.shape === 'tune') {
        return [
          planned(Chorus, this.chorusBars, { answer: later, big: false }),
          planned(Chorus, this.chorusBars, { answer: true, big: false, stop: later && this.stops }),
        ];
      }
      const pre = this.verses && this.preBars > 0;
      const dropVerse = later && pre && rng.chance(FORM.later.dropVerse);
      const dropPre = later && !dropVerse && rng.chance(FORM.later.dropPre);
      const round: Plan[] = [];
      if (this.verses && !dropVerse) {
        if (later && this.linkBars) round.push(planned(Link, this.linkBars));
        // (A verse sung twice is at most eight bars.)
        const bars = this.shortVerses ? 7 : this.verseTwice ? 8 : this.length(FORM.verseBars);
        round.push(planned(Verse, bars, { later }));
        if (this.verseTwice) round.push(planned(Verse, bars, { later }));
      }
      if (pre && !dropPre) round.push(planned(PreChorus, this.preBars, { later }));
      round.push(this.chorus({ answer: later, big: false, stop: later && this.stops }, later));
      if (rng.chance(riffChance)) {
        round.push(planned(Riff, 4));
        if (rng.chance(FORM.riffSideStep)) round.push(planned(Riff, 4, { shift: 1 }));
      }
      return round;
    }).flat();
  }

  // A chorus, or (`mayHalve`, now and then) its second half alone: a part of its own.
  private chorus(fields: { answer: boolean; big: boolean; stop?: boolean; shift?: number }, mayHalve: boolean): Plan {
    if (mayHalve && this.rng.chance(FORM.later.halfChorus)) {
      return planned(Chorus, Math.ceil(this.chorusBars / 2), { ...fields, half: true, part: HALF });
    }
    return planned(Chorus, this.chorusBars, fields);
  }

  // A bridge and up to two solos, in either order, then perhaps a
  // breakdown, and perhaps a drum break into a solo or the last choruses.
  // Each solo is a part of its own, with its own soloist.
  private middle(): Plan[] {
    const { rng } = this;
    const parts: Plan[][] = [];
    if (this.shape === 'tune' || rng.chance(FORM.bridgeChance)) parts.push([planned(Bridge, 8)]);
    const soloCount = rng.weighted(FORM.soloCount);
    if (soloCount) {
      const soloists = rng.shuffle(FORM.soloists);
      parts.push(
        Array.from({ length: soloCount }, (_, i) =>
          planned(SoloSection, this.length(FORM.soloBars), { soloist: soloists[i], part: `${SoloSection.id}:${i}` }),
        ),
      );
    }
    const body = rng.shuffle(parts).flat();
    if (rng.chance(FORM.breakdown.chance)) {
      body.push(planned(Breakdown, rng.pick(FORM.breakdown.bars)));
    }
    if (rng.chance(FORM.drumBreakChance)) {
      const spots = body.flatMap((x, i) => (x.kind === SoloSection ? [i] : []));
      body.splice(rng.pick([...spots, body.length]), 0, planned(DrumBreak, 2));
    }
    return body;
  }

  // The last choruses, each perhaps lifted a key by a turnaround (a part
  // of its own), then perhaps an outro; then the finale, or (in a song
  // that fades out) more choruses, the song fading over the outro or the
  // last of them.
  private ending(): Plan[] {
    const { rng } = this;
    const { lift } = FORM;
    // A tune fades out.
    const ending = this.shape === 'tune' ? 'fade' : rng.weightedKey(FORM.ending);
    const fades = ending === 'fade';
    const s: Plan[] = [];
    let shift = 0;
    let lifts = 0;
    const finals = rng.weighted(fades ? FORM.fade.choruses : FORM.finalChoruses);
    for (let i = 0; i < finals; i++) {
      const step = rng.weighted(lift.steps);
      if (shift + step <= MAX_SHIFT && rng.chance(i ? lift.again : lift.first)) {
        shift += step;
        const turnaround = rng.weightedKey(this.turnarounds);
        const bars = this.turnarounds[turnaround].bars.length;
        s.push(planned(Lift, bars, { turnaround, part: `${Lift.id}:${lifts++}`, shift }));
      }
      // The last chorus has everything; a fading song's last two do. In a
      // song that fades, one after the first may play just its second
      // half; any but the last may stop dead.
      const big = i >= finals - (fades ? 2 : 1);
      const stop = this.stops && i < finals - 1;
      s.push(this.chorus({ answer: true, big, shift, stop }, fades && i > 0));
    }
    const styles = Object.fromEntries(
      Object.entries(OUTRO_STYLES).filter(([, style]) => style.ends.includes(ending)),
    ) as Partial<typeof OUTRO_STYLES>;
    if (rng.chance(fades ? FORM.fade.outroChance : FORM.outroChance)) {
      const variant = rng.weightedKey(styles);
      s.push(planned(Outro, OUTRO_STYLES[variant].bars, { variant, shift }));
    }
    if (!fades) return [...s, planned(Finale, 2, { shift })];
    return this.faded(s);
  }

  // The ending fading out over its last sections (its outro, and the
  // choruses and lifts before it), at least FADE_BARS of them.
  private faded(ending: Plan[]): Plan[] {
    const fading: ReadonlySet<SectionKind> = new Set([Outro, Chorus, Lift]);
    let bars = 0;
    let from = ending.length;
    while (from > 0 && bars < FADE_BARS && fading.has(ending[from - 1].kind)) bars += ending[--from].bars;
    return ending.map((p, i) => (i >= from ? { ...p, fade: true } : p));
  }
}

// The fewest bars a song fades out over (its last choruses).
const FADE_BARS = 12;

// How many rounds a tune plays its chorus in, twice each.
const TUNE_ROUNDS: Weighted<number> = [
  [2, 1],
  [3, 2],
];
