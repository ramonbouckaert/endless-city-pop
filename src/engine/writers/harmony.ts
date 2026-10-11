// Chord progressions: roman-numeral templates realised in a key as
// extended jazz chords, reharmonised with the usual substitutions. The
// key's mode decides its tonality (TONALITIES): its tonic chord, how it
// cadences, where its bridges go and how it lifts.

import type { Odds, Rng } from '../../lib/random';
import {
  COLOURS,
  PALETTE,
  PLANING_STARTS,
  REHARM,
  SOLO_CHANGES,
  tonalityOf,
  TONIC_CHORDS,
  type Colour,
  type PaletteName,
  type Placing,
  type Tonality,
} from '../../style';
import { Chord, Key, PitchClass, Roman, Template, type Bar, type ChordClass, type ChordSpec } from '../../theory';

/** Writes harmony in a key, drawing on one random stream. */
export class Harmonizer {
  /** `colour`: how lush the song's chords are (COLOURS). */
  constructor(
    readonly key: Key,
    private readonly rng: Rng,
    readonly colour: Colour = 'lush',
  ) {}

  // A palette's colours in the song's colour.
  private colours(palette: PaletteName): Odds<string> {
    return COLOURS[this.colour].palettes[palette] ?? PALETTE[palette];
  }

  get tonality(): Tonality {
    return tonalityOf(this.key.mode);
  }

  /**
   * A template filled to `bars` bars (ending on its cadence if
   * `ending`; two chords a bar if `paired`), coloured and reharmonised
   * as the style says (unless `reharm` is false).
   */
  progression(template: string, bars: number, { ending = false, reharm = true, paired = false } = {}): Bar[] {
    const t = new Template(template);
    let fitted = ending ? t.fitEnding(bars) : t.fit(bars);
    if (paired) fitted = t.fitPaired(bars);
    const realized = this.realise(fitted);
    return reharm ? this.reharmonize(realized) : realized;
  }

  /** Each numeral as a concrete extended chord. */
  realise(bars: Roman[][]): Bar[] {
    const flat = bars.flat();
    const chords = flat.map((rn, i) => {
      const root = rn.root(this.key);
      const palette = this.palette(rn, flat[(i + 1) % flat.length]);
      const chord = new Chord(root, rn.symbol ?? this.rng.weightedKey(this.colours(palette)));
      const bass = rn.bassOf(this.key, chord);
      return bass === undefined ? chord : new Chord(root, Harmonizer.over(chord, bass), undefined, bass);
    });
    return this.scaled(Chord.inBars(chords, bars));
  }

  // A chord's symbol over a slash bass: a tone a semitone from the bass
  // (a minor seventh over a line cliché's major one) rubs, so such a
  // major or minor chord plays its plain triad instead.
  private static over(chord: Chord, bass: number): string {
    const rubs = chord.pcs.some((pc) => [1, 11].includes(PitchClass.of(pc - bass)));
    if (!rubs) return chord.symbol;
    if (chord.cls === 'maj') return '';
    if (chord.cls === 'min') return 'm';
    return chord.symbol;
  }

  // The colours a numeral takes, by its family, where it sits in the key and the numeral after it.
  private palette(rn: Roman, next: Roman): PaletteName {
    const root = rn.root(this.key);
    const down5 = (root - next.root(this.key) + 12) % 12 === 7;
    // In jazz harmony an unadorned V is still a dominant.
    const cls = rn.cls === 'maj' && rn.offset === 7 && down5 ? 'dom' : rn.cls;
    const { tonic, tonicPalette, borrowedPalette } = this.tonality;
    if (rn.bass) {
      if (cls === 'min' || cls === 'hdim') return 'slashMin';
      if (cls === 'dom') return 'slashDom';
      if (cls === 'maj') return 'slashMaj';
    }
    // A minor key's V is altered wherever it goes, even into the next section.
    const minorV = this.key.minor && rn.offset === 7;
    if (rn.offset === 0 && cls === tonic && tonicPalette) return tonicPalette;
    if (cls === 'dom' && ((down5 && (next.cls === 'min' || next.cls === 'hdim')) || minorV)) return 'domToMinor';
    if (cls === 'sus' && minorV) return 'susToMinor';
    if (cls === 'maj' && borrowedPalette && this.key.modeAt(root) === undefined) return borrowedPalette;
    // Major chords take #11 unless they are the key's ionian chord.
    if (cls === 'maj' && this.key.modeAt(root) !== 'major') return 'majLydian';
    if (cls === 'min' && this.key.modeAt(root) === 'phrygian') return 'minPhrygian';
    return cls;
  }

  /** Tritone subs, related ii chords, secondary dominants and diatonic stand-ins. */
  reharmonize(bars: Bar[]): Bar[] {
    const amount = REHARM.amount * this.tonality.reharm * COLOURS[this.colour].reharm;
    return this.scaled(
      bars.map((bar, b) => {
        const target = bars[(b + 1) % bars.length][0];
        const last = bar.at(-1);
        // A line over a moving bass (a cliché, a descent) is left as it is.
        if (bar.some((c) => c.bass !== undefined) || target.bass !== undefined) return bar;
        if (
          last &&
          last.dominant &&
          last.fallsFifthTo(target) &&
          !this.tonality.isTonic(last, this.key) &&
          this.rng.chance(amount * REHARM.tritone)
        ) {
          const sub = new Chord(last.root + 6, '13#11');
          if (bar.length > 1) return bar.with(-1, sub);
          return this.place(last, sub, this.rng.weightedKey(REHARM.tritonePlacing));
        }
        return (bar.length === 1 && this.substitute(bar[0], target, amount)) || bar;
      }),
    );
  }

  // A whole-bar chord split in two or replaced, or nothing.
  private substitute(only: Chord, target: Chord, amount: number): Bar | undefined {
    const { rng } = this;
    // Related ii: a dominant becomes ii-V.
    if (only.dominant) {
      if (!rng.chance(amount * REHARM.relatedII)) return;
      const minorTarget = only.fallsFifthTo(target) && target.minorish;
      return [new Chord(only.root + 7, minorTarget ? 'm7b5' : rng.pick(REHARM.iiSymbols)), only];
    }
    // Secondary dominant: the bar's second half points at the next
    // chord, sometimes as its tritone sub.
    if (target.root !== only.root && rng.chance(amount * REHARM.secondary)) {
      if (rng.chance(REHARM.secondaryTritone)) return [only, new Chord(target.root + 1, '13#11')];
      return [only, new Chord(target.root + 7, rng.pick(target.minorish ? REHARM.toMinor : REHARM.toMajor))];
    }
    // Stand-in: a chord a third away, beside the chord or in its place.
    const choices = this.standIns(only).filter(({ root }) => root !== target.root);
    if (!choices.length || !rng.chance(amount * REHARM.standIn)) return;
    const { root, cls } = rng.pick(choices);
    const next = new Roman(PitchClass.of(target.root - this.key.tonic), target.cls, '');
    const palette = this.palette(new Roman(PitchClass.of(root - this.key.tonic), cls, ''), next);
    const standIn = new Chord(root, rng.weightedKey(this.colours(palette)));
    const home = this.tonality.isTonic(only, this.key);
    return this.place(only, standIn, rng.weightedKey(REHARM.standInPlacing, home ? 'whole' : undefined));
  }

  // A chord and its substitute in one bar, as `placing` says.
  private place(chord: Chord, sub: Chord, placing: Placing): Bar {
    if (placing === 'whole') return [sub];
    return placing === 'after' ? [chord, sub] : [sub, chord];
  }

  // The diatonic chords a third above and below a diatonic major or
  // minor chord that are themselves major or minor (their roots and
  // families): Em and Am for C in C major, F for Dm (not Bø).
  private standIns(chord: Chord): { root: number; cls: ChordClass }[] {
    if (this.diatonicClass(chord.root) !== chord.cls) return [];
    const { scale, tonic } = this.key;
    const degree = scale.steps.indexOf(PitchClass.of(chord.root - tonic));
    return [degree + 2, degree - 2]
      .map((d) => PitchClass.of(tonic + scale.semis(d)))
      .flatMap((root) => {
        const cls = this.diatonicClass(root);
        return cls ? [{ root, cls }] : [];
      });
  }

  // The family of the key's seventh chord on a root, if it is major or minor.
  private diatonicClass(root: number): 'maj' | 'min' | undefined {
    const { scale, tonic } = this.key;
    const degree = scale.steps.indexOf(PitchClass.of(root - tonic));
    if (degree < 0) return;
    const [third, fifth, seventh] = [2, 4, 6].map((up) => scale.semis(degree + up) - scale.semis(degree));
    if (fifth !== 7) return;
    if (third === 4 && seventh === 11) return 'maj';
    if (third === 3 && seventh === 10) return 'min';
  }

  /** Two bars leading into the key's tonic: ii-V in major, iiø-V7alt in minor, bVII-IV in dorian. */
  approach(): Bar[] {
    return this.into(this.tonality.approach);
  }

  /** A named turnaround (the tonality's turnarounds) into the key's tonic. */
  turnaround(name: string): Bar[] {
    return this.into(this.tonality.turnaround(name).bars);
  }

  /**
   * Bars of "numeral:symbol|symbol" chords in a key (this one unless
   * given), with chord-scales as they resolve to its tonic.
   */
  into(specs: readonly (readonly ChordSpec[])[], key = this.key): Bar[] {
    const bars = specs.map((bar) =>
      bar.map((spec) => {
        const { offset, symbols, bass } = Roman.parseSpec(spec);
        const chord = new Chord(key.tonic + offset, this.rng.pick(symbols));
        const under = bass?.bassOf(key, chord);
        return under === undefined ? chord : new Chord(chord.root, chord.symbol, undefined, under);
      }),
    );
    const flat = [...bars.flat(), new Chord(key.tonic, tonalityOf(key.mode).finaleSymbol)];
    return Chord.inBars(Chord.fitScales(flat, key), bars);
  }

  /** add9 chords planing down in whole steps from bIII or bVI, then a sus dominant. */
  planing(): Bar[] {
    const start = this.key.tonic + this.rng.pick(PLANING_STARTS);
    const add9 = (root: number) => new Chord(root, 'add9', 'major');
    return [
      [add9(start)],
      [add9(start - 2)],
      [add9(start - 4)],
      [add9(start - 6), new Chord(this.key.tonic + 7, '9sus', 'mixolydian')],
    ];
  }

  /**
   * A key for a bridge (major, unless the tonality says otherwise).
   * Closely related keys suit a cautious bridge; distant ones add colour
   * to an adventurous one (`adventurous`, 0..1).
   */
  bridgeKey(adventurous: number): Key {
    return this.rng.weighted(
      this.tonality.bridgeKeys.map(({ offset, weight, adventurous: bold, mode = 'major' }) => {
        const key = new Key(this.key.tonic + offset, mode);
        const w = (bold ? weight * adventurous : weight) * (this.key.fifthsTo(key) <= 1 ? 1.5 - adventurous : 1);
        return [key, w] as const;
      }),
    );
  }

  // The bars, with chord-scales fitted in this key.
  private scaled(bars: Bar[]): Bar[] {
    return Chord.inBars(Chord.fitScales(bars.flat(), this.key), bars);
  }
}

// Solo changes, in eights that each end with the cadence home: the
// mode's pairs moving through keys, a stretch on the home tonic first,
// one of its vamps, or the tonic side-slipped outside the key and back
// (Tonality.solo). Reharmonised like any section; each
// chord's scale is the one it has in the key of its bar (a pair's own
// key, or home).

// Bars, each with the key its chord-scales come from.
interface Keyed {
  bars: Bar[];
  key: Key;
}

export class SoloChangesWriter {
  private readonly harmony: Harmonizer;

  constructor(
    private readonly key: Key,
    private readonly rng: Rng,
    colour: Colour = 'lush',
  ) {
    this.harmony = new Harmonizer(key, rng.fork('harmony'), colour);
  }

  /** Changes `bars` long. */
  write(bars: number): Bar[] {
    const keyed = Array.from({ length: Math.ceil(bars / 8) }, () => this.eight()).flat();
    const out = keyed.flatMap((k) => k.bars);
    const keys = keyed.flatMap((k) => k.bars.map(() => k.key));
    const changes = this.harmony.reharmonize(out);
    return changes.map((bar, b) =>
      bar.map((chord, i) =>
        chord.withScale(chord.fitScale(keys[b], bar[i + 1] ?? changes[(b + 1) % changes.length][0])),
      ),
    );
  }

  // Eight bars: a shape's lead-in, then the cadence home.
  private eight(): Keyed[] {
    const { harmony, rng, key: home } = this;
    const { solo, templates } = harmony.tonality;
    const shape = rng.weighted(solo.shapes);
    let lead: Keyed[];
    if (shape === 'cycle') lead = this.pairs(3);
    else if (shape === 'home') lead = [this.tonic(2), ...this.pairs(2)];
    else if (shape === 'outside')
      lead = [this.tonic(2), ...rng.weighted(SOLO_CHANGES.outside).map((off) => this.tonic(1, off))];
    else if (shape === 'sidestep')
      lead = [{ bars: harmony.realise(new Template(SOLO_CHANGES.sidestep).fit(6)), key: home }];
    else lead = [{ bars: harmony.realise(new Template(rng.pick(templates.vamp)).fit(6)), key: home }];
    return [...lead, { bars: harmony.approach(), key: home }];
  }

  // `n` bars of the home tonic's chord, or one bar of it side-slipped
  // `off` semitones (its chord-scale from the key it slips into).
  private tonic(n: number, off = 0): Keyed {
    const { harmony, key: home } = this;
    const bars = harmony.realise(new Template(TONIC_CHORDS[harmony.tonality.tonic]).fit(n));
    const key = home.transpose(off);
    return {
      bars: bars.map((bar) =>
        bar.map((c) => new Chord(c.root + off, c.symbol, undefined, c.bass === undefined ? undefined : c.bass + off)),
      ),
      key,
    };
  }

  // `n` of the mode's pairs, each in a key a step on from the one before.
  private pairs(n: number): Keyed[] {
    const { harmony, rng, key: home } = this;
    const { solo } = harmony.tonality;
    const step = rng.weighted(solo.steps ?? SOLO_CHANGES.steps);
    const start = home.tonic + rng.pick(SOLO_CHANGES.starts);
    return Array.from({ length: n }, (_, p) => {
      const key = home.transpose(start - home.tonic + p * step);
      return { bars: harmony.into(solo.pair, key), key };
    });
  }
}
