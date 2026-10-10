// Plans a song's form: the ordered sections, their lengths, and what
// each repeat changes. The odds are in style/form.ts.

import type { Rng } from '../lib/random';
import { FORM, MAX_SHIFT, OUTRO_STYLES, SECTION_TYPES, type Turnaround } from '../style';
import { Form } from './form';
import { Breakdown, Bridge, Chorus, DrumBreak, Finale, Intro, Lift, Outro, PreChorus, Riff, SoloSection, Vamp, Verse } from './sections';
import type { Section } from './sections';

export class FormPlanner {
  private readonly preBars: number;
  private readonly chorusBars: number;

  /** `turnarounds`: the lifts into a last chorus the song's tonality offers. */
  constructor(
    private readonly rng: Rng,
    private readonly turnarounds: Readonly<Record<string, Turnaround>>,
  ) {
    this.preBars = rng.pick(FORM.preBars);
    this.chorusBars = rng.chance(FORM.chorusTag) ? 10 : 8;
  }

  plan(): Form {
    const opening = this.opening();
    const body = [...this.rounds(), ...this.middle()];
    const vamp = opening.find((s) => s.type === 'vamp');
    return new Form([...opening, ...(vamp ? this.vampReturn(body, vamp.bars) : body), ...this.ending()]);
  }

  private opening(): Section[] {
    const { rng } = this;
    const s: Section[] = [new Intro(rng.pick(FORM.introBars))];
    if (rng.chance(FORM.vamp.chance)) s.push(new Vamp(rng.pick(FORM.vamp.bars), { returning: false }));
    return s;
  }

  // The body, perhaps with the opening vamp back once, after a section
  // that hands over to anything (not a verse, which leads on to its
  // pre-chorus or chorus).
  private vampReturn(body: Section[], bars: number): Section[] {
    const { rng } = this;
    if (!rng.chance(FORM.vamp.returns)) return body;
    const spots = body.flatMap((s, i) => (SECTION_TYPES[s.type].handsOver ? [i + 1] : []));
    if (!spots.length) return body;
    const at = rng.pick(spots);
    return [...body.slice(0, at), new Vamp(bars, { returning: true }), ...body.slice(at)];
  }

  // Verse / pre-chorus / chorus rounds.
  private rounds(): Section[] {
    const { rng } = this;
    const riffChance = rng.pick(FORM.riffChance);
    return Array.from({ length: rng.weighted(FORM.rounds) }, (_, r) => {
      const later = r > 0;
      const round: Section[] = [new Verse(rng.pick(FORM.verseBars), { later })];
      if (this.preBars) round.push(new PreChorus(this.preBars, { later }));
      round.push(new Chorus(this.chorusBars, { answer: later, big: false }));
      if (rng.chance(riffChance)) round.push(new Riff(4));
      return round;
    }).flat();
  }

  // A bridge and up to two solos, in either order, then perhaps a
  // breakdown, and perhaps a drum break into a solo or the last choruses.
  // Each solo is a part of its own, with its own soloist.
  private middle(): Section[] {
    const { rng } = this;
    const parts: Section[][] = [];
    if (rng.chance(FORM.bridgeChance)) parts.push([new Bridge(8)]);
    const soloCount = rng.weighted(FORM.soloCount);
    if (soloCount) {
      const soloists = rng.shuffle(FORM.soloists);
      parts.push(
        Array.from(
          { length: soloCount },
          (_, i) => new SoloSection(rng.pick(FORM.soloBars), { soloist: soloists[i], part: `solo:${i}` }),
        ),
      );
    }
    const body = rng.shuffle(parts).flat();
    if (rng.chance(FORM.breakdown.chance)) {
      body.push(new Breakdown(rng.pick(FORM.breakdown.bars)));
    }
    if (rng.chance(FORM.drumBreakChance)) {
      const spots = body.flatMap((x, i) => (x.type === 'solo' ? [i] : []));
      body.splice(rng.pick([...spots, body.length]), 0, new DrumBreak(2));
    }
    return body;
  }

  // The last choruses, each perhaps lifted a key by a turnaround (a part
  // of its own), then the ending.
  private ending(): Section[] {
    const { rng } = this;
    const { lift } = FORM;
    const s: Section[] = [];
    let shift = 0;
    let lifts = 0;
    const finals = rng.weighted(FORM.finalChoruses);
    for (let i = 0; i < finals; i++) {
      const step = rng.weighted(lift.steps);
      if (shift + step <= MAX_SHIFT && rng.chance(i ? lift.again : lift.first)) {
        shift += step;
        const turnaround = rng.weightedKey(this.turnarounds);
        const bars = this.turnarounds[turnaround].bars.length;
        s.push(new Lift(bars, { liftTo: shift, turnaround, part: `lift:${lifts++}` }));
      }
      const big = i === finals - 1;
      s.push(new Chorus(this.chorusBars, { answer: true, big, shift }));
    }
    if (rng.chance(FORM.outroChance)) {
      const variant = rng.weightedKey(OUTRO_STYLES);
      s.push(new Outro(OUTRO_STYLES[variant].bars, { variant, shift }));
    }
    s.push(new Finale(2, { shift }));
    return s;
  }
}
