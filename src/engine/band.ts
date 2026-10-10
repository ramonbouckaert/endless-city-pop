// Instrument abstraction: maps a song's sounds to Strudel patterns.
// Mini builds mini-notation strings from song data; Band builds the
// patterns themselves.

import './strudel-setup';
import { chord, n, noteToMidi, rand, stack, type Pattern } from '@strudel/core';
import { mini } from '@strudel/mini';
import { STYLE } from './constants';
import { FORM } from './form';
import { BAND, KIT_GAPS, SOUND_LEVELS, SOUND_TOPS } from './instruments';
import { barTokens, type Key } from './music';
import type { Bar, BandSounds, PickedPart, Sounds, StepGains, Voice } from './types';

// The parts that play chords.
type ChordPart = 'keys' | 'guitar' | 'pad' | 'strings' | 'choir' | 'stabs';

export const FIGURES = {
  arp: '[0 1 2 3]*2',
  clav: '[~ 0 ~ 2] [~ ~ 1 ~] [~ 0 ~ 2] [~ 3 ~ ~]',
  scratch: '[0 ~ 0 2] [~ 1 ~ 0] [~ 0 2 ~] [1 ~ 0 ~]',
  stab: 'x ~ ~ ~',
  stops: '[x ~ ~ x ~ ~ x ~]',
  liftLine: '<[0 [~ 1] 2 [~ 3]] [4 [~ 4] 5 ~]>',
  liftHold: '[4@6 ~@2]',
  liftRun: '[~ ~ ~ ~ 0 1 2 3 4 5 6 7 8 9 10 11]',
  liftPickup: '[~ ~ ~ [-2 -1]]',
  pickup: '<~ [~ ~ ~ [-2 -1]]>',
  finaleDegrees: [4, 9, 13, 15, 17, 19],
  // Two bars as one: the band's pushed hits, then a last stab.
  finaleHits: '<[x ~ ~ x ~ ~ x ~] [x ~ ~ ~]>',
  // Up the chord in sixteenths (chord-scale degrees), then held.
  finaleRun: '[0 2 4 6 7 9 11 13 14@24]',
};

export const DOUBLE_TOP = 100;
export const TAIL_SECONDS = 1;

export const Mini = {
  /** One item per bar, as "<a b c ...>". */
  perBar: (items: string[]) => mini(`<${items.join(' ')}>`),
  /** `len` bars: `rest` in all but the last, which plays `last`. */
  lastBar: (len: number, last: string, rest: string) => `<${(rest + ' ').repeat(len - 1)}${last}>`,
  /** A mask that plays from bar `start` of `len`. */
  from: (len: number, start: number) => `<${Array.from({ length: len }, (_, i) => (i < start ? 0 : 1)).join(' ')}>`,
  /** A 16-step bar: the sound where it hits, "[[bd ~ ~ bd] [~ ...] ...]". */
  hits: (bar: StepGains, sound: string) => Mini.groups(bar.map((v) => (v ? sound : '~'))),
  /** A 16-step bar's gains. */
  gains: (bar: StepGains) => Mini.groups(bar.map((v) => Math.round(v * 1000) / 1000)),
  groups: (tokens: (string | number)[]) =>
    '[' + [0, 4, 8, 12].map((i) => '[' + tokens.slice(i, i + 4).join(' ') + ']').join(' ') + ']',
  /** A chord pattern, one bar per item. */
  chords: (bars: Bar[], key: Key) => chord(Mini.perBar(barTokens(bars, (c) => c.name(key)))),
};

/**
 * Instruments to play a song with instead of its own: `sounds` in place
 * of the song's, `kit` in place of its drum kit (null: the default
 * samples).
 */
export interface Instruments {
  sounds?: Sounds;
  kit?: string | null;
}

/** The instruments. Harmony parts take a chord pattern; lines take degrees against a scale. */
export class Band {
  constructor(
    private readonly kit: string | null,
    readonly sounds: Sounds,
  ) {}

  /**
   * How much louder or quieter a picked part plays than with its sound in
   * BAND, which its gains were set for. Applied as postgain, so a
   * section's own gain for the part still holds.
   */
  trim(part: PickedPart): number {
    const sound = (s: BandSounds) => {
      const v = s[part];
      return typeof v === 'string' ? v : v[0];
    };
    const level = (s: string) => SOUND_LEVELS[s] ?? 1;
    return level(sound(this.sounds)) / level(sound(BAND));
  }

  /** A drum part on this song's kit; sounds the kit lacks play from the default samples. */
  drum(p: Pattern): Pattern {
    const { kit } = this;
    if (!kit) return p;
    // Bank names are case-insensitive in Strudel (the debug panel lists them lower case).
    const gaps = Object.entries(KIT_GAPS).find(([k]) => k.toLowerCase() === kit.toLowerCase())?.[1] ?? [];
    return p.withValue((v: { s?: string }) => (v.s && gaps.includes(v.s) ? v : { ...v, bank: kit }));
  }

  // Sets the sound, dropping notes above its top by octaves. Sections
  // shifted up a key transpose after this, so the top allows for the
  // highest lift.
  voiced(p: Pattern, sound: string): Pattern {
    const top = SOUND_TOPS[sound];
    if (top === undefined) return p.sound(sound);
    return p
      .withValue((v: { note?: number | string }) => {
        if (v.note === undefined) return v;
        let note = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
        while (note > top - FORM.lift.maxShift) note -= 12;
        return { ...v, note };
      })
      .sound(sound);
  }

  /** A chord pattern voiced on a part's sound, at a gain, trimmed for the sound picked. */
  chords(part: ChordPart, c: Pattern, gain: number) {
    return c.voicing().sound(this.sounds[part]).gain(gain).postgain(this.trim(part));
  }

  keys(c: Pattern, rhythm: Pattern | string = STYLE.comp.main) {
    return this.chords('keys', c.struct(rhythm), 0.34).velocity(rand.range(0.8, 1)).room(0.2);
  }
  softKeys(c: Pattern) {
    return this.chords('keys', c, 0.32).room(0.35);
  }
  arp(c: Pattern) {
    return this.chords('keys', n(FIGURES.arp).set(c), 0.24).room(0.4).delay(0.2).delaytime(0.375);
  }
  // The clavinet isn't picked per song, so it has no trim.
  clav(c: Pattern) {
    return n(FIGURES.clav).set(c).voicing().sound(this.sounds.clav).gain(0.19).velocity(rand.range(0.7, 1)).pan(0.28);
  }
  scratch(c: Pattern) {
    return this.chords('guitar', n(FIGURES.scratch).set(c), 0.28).clip(0.5).velocity(rand.range(0.7, 1)).pan(0.72);
  }
  pad(c: Pattern) {
    return this.chords('pad', c.anchor('a4'), 0.14).room(0.4);
  }
  strings(c: Pattern) {
    return this.chords('strings', c.anchor('d6'), 0.11).room(0.45);
  }
  choir(c: Pattern) {
    return this.chords('choir', c.anchor('e5'), 0.09).room(0.45);
  }
  stabs(c: Pattern, rhythm: Pattern | string = FIGURES.stab) {
    return this.chords('stabs', c.struct(rhythm).anchor('g5'), 0.22).clip(0.3);
  }
  bass(degrees: Pattern | string, scales: Pattern | string) {
    return n(degrees).scale(scales).sound(this.sounds.bass).clip(0.8).gain(0.75).postgain(this.trim('bass'));
  }
  /** Degrees against a key or chord-scale, optionally shifted up. */
  line(degrees: Pattern | string, scales: Pattern | string, up = 0) {
    return n(degrees).scale(scales).transpose(up);
  }
  /** Diatonic harmony: the line plus copies `steps` scale steps below. */
  harmonize(p: Pattern, ...steps: number[]) {
    return stack(p, ...steps.map((st) => p.sub(st)));
  }
  /** A line on a melody voice, at its gain. */
  voice([sound, gain]: Voice, p: Pattern) {
    return this.voiced(p, sound).gain(gain);
  }
  lead(p: Pattern) {
    return this.voice(this.sounds.lead, p).room(0.25);
  }
  double(p: Pattern, up = 12) {
    return this.voice(this.sounds.double, p.transpose(up)).room(0.35);
  }
  counter(p: Pattern) {
    return this.voice(this.sounds.answer, p).postgain(this.trim('answer')).pan(0.62).room(0.25);
  }
  bell(p: Pattern) {
    return this.voice(this.sounds.bell, p).postgain(this.trim('bell')).room(0.4);
  }
  horns(p: Pattern) {
    const { stabs, hornDouble } = this.sounds;
    return stack(
      this.voiced(p, stabs).gain(0.3).postgain(this.trim('stabs')),
      this.voiced(p, hornDouble).gain(0.18).postgain(this.trim('hornDouble')),
    ).room(0.25);
  }

  // Used by the finale section only.
  finaleVoices() {
    const { sounds } = this;
    return [
      [sounds.lead[0], sounds.lead[1] * 0.6],
      ...sounds.soloists,
      [sounds.bell[0], sounds.bell[1] * this.trim('bell')],
      [sounds.double[0], sounds.double[1] * 1.5],
    ] as const;
  }
}
