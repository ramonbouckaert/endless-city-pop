// Plans a song's form: the ordered sections, their lengths, and what
// each repeat changes. The odds are in style/form.ts.

import { along, lerp } from '../../lib/math';
import { blend, only, type Rng, type Weighted } from '../../lib/random';
import {
  FORM,
  MAX_SHIFT,
  OUTRO_STYLES,
  SONG,
  type FormShape,
  type OutroStyle,
  type SongEnding,
  type Turnaround,
} from '../../style';
import {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  Form,
  FREE,
  Intro,
  HALF,
  Lift,
  Link,
  OWN,
  Outro,
  planned,
  PreChorus,
  Riff,
  ShortBar,
  SoloSection,
  Swell,
  Vamp,
  Verse,
  type Plan,
  type SectionKind,
} from '../sections';

export class FormPlanner {
  private readonly shape: FormShape;
  private readonly preBars: number;
  private readonly chorusBars: number;
  // Whether it has a chorus (all but the `ab` shape).
  private readonly choruses: boolean;
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
  // How many lifts it has planned, each a part of its own.
  private lifts = 0;

  /**
   * `turnarounds`: the lifts into a last chorus the song's tonality
   * offers; `bpm`: the song's tempo, which favours sixteen-bar sections
   * the faster it is; `ballad`: how far that tempo leans it towards a
   * ballad (0 to 1, BALLAD), for fewer rounds and solos (FORM.ballad).
   */
  constructor(
    private readonly rng: Rng,
    private readonly turnarounds: Readonly<Record<string, Turnaround>>,
    bpm: number,
    private readonly ballad: number,
  ) {
    this.sixteens = lerp(1, FORM.sixteenAtSpeed, along(bpm, SONG.pace));
    this.shape = rng.fork('shape').weightedKey(FORM.shape);
    const tune = this.shape === 'tune';
    const jpop = this.shape === 'jpop';
    this.choruses = this.shape !== 'ab';
    const preBars = this.length(FORM.preBars);
    // A J-pop form always has its B, the pre-chorus, and so does a song without a chorus.
    this.preBars = jpop || !this.choruses ? Math.max(4, preBars) : preBars;
    // A tune is eight bars, played again and again.
    const chorusBars = this.length(FORM.chorusBars);
    this.chorusBars = tune ? 8 : chorusBars;
    const verses = rng.chance(FORM.verseChance);
    this.verses = jpop || !this.choruses || (verses && !tune);
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

  // Whether the song has an intro in time (set as its opening is planned).
  private intro = false;

  plan(): Form<Plan> {
    const opening = this.opening();
    this.intro = opening.some((p) => p.kind === Intro && p.part !== FREE);
    const rounds = this.rounds();
    const body = [...rounds, ...this.middle()];
    const vamp = opening.find((s) => s.kind === Vamp);
    // (Verses after the last lift are as long as the first round's.)
    const verseBars = rounds.find((p) => p.kind === Verse)?.bars ?? 8;
    const plans = [...opening, ...(vamp ? this.vampReturn(body, vamp.bars) : body), ...this.ending(verseBars)];
    return new Form(this.held(this.shortBars(plans)));
  }

  // Now and then, short bars: a 2/4 break before every chorus that
  // follows a verse or pre-chorus (each a part of the same), and a 1/4
  // pickup into the first section after the intro (or into the song).
  private shortBars(plans: readonly Plan[]): Plan[] {
    const rng = this.rng.fork('shortBars');
    const breaks = rng.chance(FORM.shortBars.beforeChorus);
    const pickup = rng.chance(FORM.shortBars.pickup);
    // The first section after the intros (the first, in a song without).
    const opening = plans.findIndex((p) => p.kind !== Intro && p.kind !== Swell);
    return plans.flatMap((p, i) => {
      const before = plans[i - 1]?.kind;
      if (breaks && p.kind === Chorus && p.part !== HALF && (before === Verse || before === PreChorus))
        return [planned(ShortBar, 0.5, { shift: p.shift }), p];
      if (pickup && i === opening)
        return [planned(ShortBar, 0.25, { shift: p.shift, part: `${ShortBar.id}:pickup` }), p];
      return [p];
    });
  }

  // The intro (perhaps after a free one, out of tempo, in a song with a
  // chorus to tease, or a swell; now and then none), and perhaps a vamp,
  // perhaps leading on into the riff.
  private opening(): Plan[] {
    const { rng } = this;
    const s: Plan[] = [];
    const starts = rng.fork('start');
    if (this.choruses && starts.chance(FORM.freeIntro.chance))
      s.push(planned(Intro, starts.pick(FORM.freeIntro.bars), { free: true, part: FREE }));
    else if (starts.chance(FORM.swell.chance)) s.push(planned(Swell, FORM.swell.bars));
    if (s.length || starts.chance(FORM.introChance)) s.push(planned(Intro, rng.weighted(FORM.introBars)));
    if (rng.chance(FORM.vamp.chance)) {
      s.push(planned(Vamp, rng.pick(FORM.vamp.bars), { returning: false }));
      if (starts.chance(FORM.vamp.riffAfter)) s.push(planned(Riff, 4));
    }
    return s;
  }

  // Now and then, one moment of tension held on a fermata: the last bar
  // of a pre-chorus, a bridge, a breakdown, a lift, a vamp or a link (one
  // of two bars or more, so a bar plays before the held one).
  private held(plans: readonly Plan[]): Plan[] {
    const rng = this.rng.fork('fermata');
    const tense: ReadonlySet<SectionKind> = new Set([PreChorus, Bridge, Breakdown, Lift, Vamp, Link]);
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
    // Never beside another vamp, nor between a riff and its repeat a
    // semitone up, nor between a round's chorus and its repeat (or the
    // turnaround into it).
    const apart = (s: Plan, next: Plan | undefined) =>
      next?.kind !== Vamp &&
      !(next?.kind === Riff && next.shift) &&
      !(s.kind === Chorus && (next?.kind === Chorus || next?.kind === Lift) && next.round === s.round);
    const spots = body.flatMap((s, i) => (s.kind.handsOver && s.kind !== Vamp && apart(s, body[i + 1]) ? [i + 1] : []));
    if (!spots.length) return body;
    const at = rng.pick(spots);
    const back = [...body.slice(0, at), planned(Vamp, bars, { returning: true }), ...body.slice(at)];
    return chance === FORM.vamp.returns ? this.vampReturn(back, bars, FORM.vamp.returnsAgain) : back;
  }

  // Rounds of a verse (perhaps twice, after a link) and pre-chorus (in a
  // song that has them), a chorus (but in a song without), and perhaps a
  // riff (perhaps again a semitone up); a later round may leave out its
  // verse or pre-chorus, or play just the chorus's second half, and the
  // last may play its chorus twice. A tune's rounds are its chorus twice.
  // Each section is marked with its round.
  private rounds(): Plan[] {
    const { rng } = this;
    const riffChance = this.shape === 'jpop' ? 1 : rng.pick(FORM.riffChance);
    const rounds = blend(FORM.rounds, FORM.ballad.rounds, this.ballad);
    const count = this.shape === 'tune' ? rng.weighted(TUNE_ROUNDS) : rng.weighted(rounds);
    return Array.from({ length: count }, (_, r) =>
      this.round(r, count, riffChance).map((p) => ({ ...p, round: r })),
    ).flat();
  }

  // The `r`th of `count` rounds.
  private round(r: number, count: number, riffChance: number): Plan[] {
    const { rng } = this;
    const later = r > 0;
    if (this.shape === 'tune') {
      return [
        planned(Chorus, this.chorusBars, { answer: later, big: false }),
        planned(Chorus, this.chorusBars, { answer: true, big: false, stop: later && this.stops }),
      ];
    }
    const pre = this.verses && this.preBars > 0;
    // (Without a chorus, neither the verse nor the B is ever left out.)
    const dropVerse = later && pre && this.choruses && rng.chance(FORM.later.dropVerse);
    const dropPre = later && !dropVerse && this.choruses && rng.chance(FORM.later.dropPre);
    return [
      ...(this.verses && !dropVerse ? this.verse(later) : []),
      ...(pre && !dropPre ? [planned(PreChorus, this.preBars, { later })] : []),
      ...(this.choruses ? this.roundChorus(later, r === count - 1) : []),
      ...this.riffs(riffChance),
    ];
  }

  // A round's verse (perhaps sung twice), after a link in a later round.
  private verse(later: boolean): Plan[] {
    const link = later && this.linkBars ? [planned(Link, this.linkBars)] : [];
    // (A verse sung twice is at most eight bars.)
    let bars = 7;
    if (!this.shortVerses) bars = this.verseTwice ? 8 : this.length(FORM.verseBars);
    const verses = Array.from({ length: this.verseTwice ? 2 : 1 }, () => planned(Verse, bars, { later }));
    return [...link, ...verses];
  }

  // A round's chorus; the `last` round's perhaps twice (whole, the first
  // time too), perhaps re-entered through a turnaround.
  private roundChorus(later: boolean, last: boolean): Plan[] {
    const { rng } = this;
    const again = last && rng.chance(FORM.later.again);
    const first = this.chorus({ answer: later, big: false, stop: later && this.stops }, later && !again);
    if (!again) return [first];
    const reentry = rng.chance(FORM.later.reentry) ? [this.lift(0, rng.chance(FORM.lift.own))] : [];
    return [first, ...reentry, this.chorus({ answer: true, big: false }, false)];
  }

  // Perhaps the riff (`chance`), perhaps again a semitone up.
  private riffs(chance: number): Plan[] {
    const { rng } = this;
    if (!rng.chance(chance)) return [];
    return rng.chance(FORM.riffSideStep) ? [planned(Riff, 4), planned(Riff, 4, { shift: 1 })] : [planned(Riff, 4)];
  }

  // A chorus, or (`mayHalve`, now and then) its second half alone: a part of its own.
  private chorus(fields: { answer: boolean; big: boolean; stop?: boolean; shift?: number }, mayHalve: boolean): Plan {
    if (mayHalve && this.rng.chance(FORM.later.halfChorus)) {
      return planned(Chorus, Math.ceil(this.chorusBars / 2), { ...fields, half: true, part: HALF });
    }
    return planned(Chorus, this.chorusBars, fields);
  }

  // A turnaround into a key `shift` up from the song's (perhaps the
  // chorus's own last bars bent onto its V: `own`), a part of its own.
  private lift(shift: number, own: boolean): Plan {
    const turnaround = own ? OWN : this.rng.weightedKey(this.turnarounds);
    const bars = own ? 2 : this.turnarounds[turnaround].bars.length;
    return planned(Lift, bars, { turnaround, part: `${Lift.id}:${this.lifts++}`, shift });
  }

  // A bridge and up to two solos, in either order, then perhaps a
  // breakdown (in a song with a chorus, for it to play), and perhaps a
  // drum break into a solo or the last choruses.
  // Each solo is a part of its own, with its own soloist.
  private middle(): Plan[] {
    const { rng } = this;
    const parts: Plan[][] = [];
    if (this.shape === 'tune' || rng.chance(FORM.bridgeChance)) parts.push([planned(Bridge, 8)]);
    const soloCount = rng.weighted(blend(FORM.soloCount, FORM.ballad.soloCount, this.ballad));
    if (soloCount) {
      const soloists = rng.shuffle(FORM.soloists);
      parts.push(
        Array.from({ length: soloCount }, (_, i) =>
          planned(SoloSection, this.length(FORM.soloBars), { soloist: soloists[i], part: `${SoloSection.id}:${i}` }),
        ),
      );
    }
    const body = rng.shuffle(parts).flat();
    if (this.choruses && rng.chance(FORM.breakdown.chance)) {
      body.push(planned(Breakdown, rng.pick(FORM.breakdown.bars)));
    }
    if (rng.chance(FORM.drumBreakChance * (1 - this.ballad))) {
      const spots = body.flatMap((x, i) => (x.kind === SoloSection ? [i] : []));
      body.splice(rng.pick([...spots, body.length]), 0, planned(DrumBreak, 2));
    }
    return body;
  }

  // The last choruses, each perhaps lifted a key by a turnaround (a part
  // of its own), then perhaps an outro (or, before the finale, perhaps the
  // riff three times); then the finale, or (in a song that fades out)
  // more choruses, the song fading over the outro or the last of them. A
  // fading song with verses may instead play one last chorus and lift
  // into its verse, played again and again; a song without a chorus plays
  // its B once more, then a coda fading or the finale.
  private ending(verseBars: number): Plan[] {
    const { rng } = this;
    // A tune fades out.
    const ending = this.shape === 'tune' ? 'fade' : rng.weightedKey(FORM.ending);
    const fades = ending === 'fade';
    if (!this.choruses) return this.lastB(ending);
    // (A tune has no verses.)
    if (fades && this.verses && rng.chance(FORM.verseEnding.chance)) return this.verseEnding(verseBars);
    const { choruses, shift } = this.finalChoruses(fades);
    const riffs = !fades && rng.fork('riffEnding').chance(FORM.riffEnding);
    const tail = riffs
      ? Array.from({ length: RIFF_ENDING }, () => planned(Riff, 4, { shift }))
      : this.outro(ending, shift);
    return this.close([...choruses, ...tail], ending, shift);
  }

  // The last choruses (before a fade, if the song `fades`), each perhaps
  // lifted a key by a turnaround (a part of its own), and the key they end
  // in.
  private finalChoruses(fades: boolean): { choruses: Plan[]; shift: number } {
    const { rng } = this;
    const { lift } = FORM;
    const choruses: Plan[] = [];
    let shift = 0;
    const finals = rng.weighted(fades ? FORM.fade.choruses : FORM.finalChoruses);
    for (let i = 0; i < finals; i++) {
      const step = rng.weighted(lift.steps);
      if (shift + step <= MAX_SHIFT && rng.chance(i ? lift.again : lift.first)) {
        shift += step;
        choruses.push(this.lift(shift, rng.chance(lift.own)));
      }
      // The last chorus has everything; a fading song's last two do. In a
      // song that fades, one after the first may play just its second
      // half; any but the last may stop dead.
      const big = i >= finals - (fades ? 2 : 1);
      const stop = this.stops && i < finals - 1;
      choruses.push(this.chorus({ answer: true, big, shift, stop }, fades && i > 0));
    }
    return { choruses, shift };
  }

  // The last sections, then the finale (`shift` with them), or the song
  // fading out over them.
  private close(s: Plan[], ending: SongEnding, shift = 0): Plan[] {
    return ending === 'fade' ? this.faded(s) : [...s, planned(Finale, 2, { shift })];
  }

  // Now and then (FORM's outro chances) an outro in a style that leads to
  // the song's `ending`, shifted with the last choruses; or none, if no
  // style suits.
  private outro(ending: SongEnding, shift: number): Plan[] {
    if (!this.rng.chance(ending === 'fade' ? FORM.fade.outroChance : FORM.outroChance)) return [];
    // (A reprise needs an intro in time to play again.)
    const styles = only(OUTRO_STYLES, (name, style) => !!style.bars[ending] && (name !== 'reprise' || this.intro));
    if (!Object.keys(styles).length) return [];
    return [this.outroOf(this.rng.weightedKey(styles), ending, shift)];
  }

  // An outro in a style, one of its lengths before the song's `ending`.
  private outroOf(variant: OutroStyle, ending: SongEnding, shift = 0): Plan {
    const bars = OUTRO_STYLES[variant].bars[ending];
    if (!bars) throw new Error(`A ${variant} outro never leads to a ${ending}`);
    return planned(Outro, this.rng.pick(bars), { variant, shift });
  }

  // A song without a chorus: its B once more, then a coda fading (Sparkle's), or the finale.
  private lastB(ending: SongEnding): Plan[] {
    const outro = ending === 'fade' ? [this.outroOf('coda', ending)] : this.outro(ending, 0);
    return this.close([planned(PreChorus, this.preBars, { later: true }), ...outro], ending);
  }

  // The last chorus, with everything, then a lift a key up into the verse
  // (ANRI's), the verse played again and again to the end, the song
  // fading over it; perhaps the band dropping out under the keys and the
  // lead for the first two bars after the lift.
  private verseEnding(verseBars: number): Plan[] {
    const { rng } = this;
    const shift = rng.weighted(FORM.lift.steps);
    const bare = rng.chance(FORM.verseEnding.bare);
    // As many eight-bar verses as a fade's choruses, fewer (but two) if they are longer.
    const count = Math.max(2, Math.round((rng.weighted(FORM.fade.choruses) * 8) / verseBars));
    const verses = Array.from({ length: count }, (_, i) =>
      planned(Verse, verseBars, { later: true, shift, ...(i === 0 && bare ? { bare } : {}) }),
    );
    const last = this.chorus({ answer: true, big: true }, false);
    return this.faded([last, this.lift(shift, false), ...verses]);
  }

  // The ending fading out over its last sections (its outro, and the
  // choruses, verses, pre-choruses and lifts before it), at least
  // FADE_BARS of them.
  private faded(ending: Plan[]): Plan[] {
    const fading: ReadonlySet<SectionKind> = new Set([Outro, Chorus, Verse, PreChorus, Lift]);
    let bars = 0;
    let from = ending.length;
    while (from > 0 && bars < FADE_BARS && fading.has(ending[from - 1].kind)) bars += ending[--from].bars;
    return ending.map((p, i) => (i >= from ? { ...p, fade: true } : p));
  }
}

// The fewest bars a song fades out over (its last choruses).
const FADE_BARS = 12;

// How many times a song ending on its riff plays it (Flyday Chinatown's twelve bars).
const RIFF_ENDING = 3;

// How many rounds a tune plays its chorus in, twice each.
const TUNE_ROUNDS: Weighted<number> = [
  [2, 1],
  [3, 2],
];
