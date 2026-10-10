// The instruments: a song's sounds as Strudel patterns. Harmony parts
// take a chord pattern; lines take degrees against a scale. Each part
// plays at its level in the mix (mix.ts). A band plays one section, and
// notes which of its parts that section asks for (`uses`).

import './strudel-setup';
import { chord, n, noteToMidi, rand, stack, type Pattern } from '@strudel/core';
import { mini } from '@strudel/mini';
import type { Instruments, PartPath, SoundPath } from '../model';
import { MAX_SHIFT, SOUND_TOPS } from '../style';
import type { Bar, Key } from '../theory';
import { COMP, FIGURES } from './figures';
import { MIX, type Level, type MixName } from './mix';
import { chordSeq, scaleSeq, seq } from './notation';

// The parts that play chords.
type ChordPart = 'keys' | 'clav' | 'guitar' | 'pad' | 'strings' | 'choir' | 'stabs';

/** A part that plays lines, at a gain (before its sound's trim). */
export interface Voice {
  path: SoundPath;
  gain: number;
}

/** One item per bar, as a pattern. */
export const perBar = (items: readonly string[]): Pattern => mini(seq(items));
/** Bars of chords, as a chord pattern. */
export const chords = (bars: readonly Bar[], key: Key): Pattern => chord(chordSeq(bars, key));
/** Bars of chord-scales from the bass root, for n().scale(). */
export const scales = (bars: readonly Bar[], key: Key): Pattern => mini(scaleSeq(bars, key));

export class Band {
  private readonly used = new Set<PartPath>();

  constructor(private readonly instruments: Instruments) {}

  /** The parts asked for so far, in the order they first were. */
  get uses(): ReadonlySet<PartPath> {
    return new Set(this.used);
  }

  private use(path: PartPath): void {
    this.used.add(path);
  }

  /** A drum part on this song's kit; sounds the kit lacks play from the default samples. */
  drum(p: Pattern): Pattern {
    this.use('kit');
    const { kit } = this.instruments;
    if (!kit.bank) return p;
    return p.withValue((v: { s?: string }) => {
      const bank = v.s && kit.bankFor(v.s);
      return bank ? { ...v, bank } : v;
    });
  }

  // A part's sound on a pattern at a level in the mix, trimmed for the
  // sound picked.
  private play(path: SoundPath, p: Pattern, { gain, room, pan, clip }: Level): Pattern {
    this.use(path);
    const sound = this.instruments.sound(path);
    let out = this.voiced(p, sound).sound(sound).gain(gain).postgain(this.instruments.trim(path));
    if (room !== undefined) out = out.room(room);
    if (pan !== undefined) out = out.pan(pan);
    if (clip !== undefined) out = out.clip(clip);
    return out;
  }

  // Notes above the sound's top, dropped by octaves. Sections shifted up
  // a key transpose after this, so the top allows for the highest lift.
  private voiced(p: Pattern, sound: string): Pattern {
    const top = SOUND_TOPS[sound];
    if (top === undefined) return p;
    return p.withValue((v: { note?: number | string }) => {
      if (v.note === undefined) return v;
      let note = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
      while (note > top - MAX_SHIFT) note -= 12;
      return { ...v, note };
    });
  }

  // A chord pattern voiced on a part's sound, at a level in the mix.
  private chords(part: ChordPart, c: Pattern, mix: MixName): Pattern {
    return this.play(part, c.voicing(), MIX[mix]);
  }

  keys(c: Pattern, rhythm: Pattern | string = COMP.main) {
    return this.chords('keys', c.struct(rhythm), 'keys').velocity(rand.range(0.8, 1));
  }
  softKeys(c: Pattern) {
    return this.chords('keys', c, 'softKeys');
  }
  arp(c: Pattern) {
    return this.chords('keys', n(FIGURES.arp).set(c), 'arp').delay(0.2).delaytime(0.375);
  }
  /** The final chord, held on the keys. */
  finaleKeys(c: Pattern) {
    return this.chords('keys', c, 'finaleKeys');
  }
  /** A line on the keys' sound, for the finale's run. */
  keysRun(p: Pattern) {
    return this.play('keys', p, MIX.keysRun);
  }
  clav(c: Pattern) {
    return this.chords('clav', n(FIGURES.clav).set(c), 'clav').velocity(rand.range(0.7, 1));
  }
  scratch(c: Pattern) {
    return this.chords('guitar', n(FIGURES.scratch).set(c), 'scratch').velocity(rand.range(0.7, 1));
  }
  pad(c: Pattern) {
    return this.chords('pad', c.anchor('a4'), 'pad');
  }
  strings(c: Pattern) {
    return this.chords('strings', c.anchor('d6'), 'strings');
  }
  choir(c: Pattern) {
    return this.chords('choir', c.anchor('e5'), 'choir');
  }
  stabs(c: Pattern, rhythm: Pattern | string = FIGURES.stab) {
    return this.chords('stabs', c.struct(rhythm).anchor('g5'), 'stabs');
  }
  bass(degrees: Pattern | string, scale: Pattern | string) {
    return this.play('bass', n(degrees).scale(scale), MIX.bass);
  }
  /** Degrees against a key or chord-scale, optionally shifted up. */
  line(degrees: Pattern | string, scale: Pattern | string, up = 0) {
    return n(degrees).scale(scale).transpose(up);
  }
  /** Diatonic harmony: the line plus copies `steps` scale steps below. */
  harmonize(p: Pattern, ...steps: number[]) {
    return stack(p, ...steps.map((st) => p.sub(st)));
  }
  /** A line on a part's sound, at a gain. */
  voice({ path, gain }: Voice, p: Pattern) {
    return this.play(path, p, { gain });
  }
  lead(p: Pattern) {
    return this.play('lead', p, MIX.lead);
  }
  double(p: Pattern, up = 12) {
    return this.play('double', p.transpose(up), MIX.double);
  }
  /** A line on one of the song's soloists, in the solo room. */
  soloist(index: number, p: Pattern) {
    return this.play(this.soloistPath(index), p, MIX.soloist).delay(0.15).delaytime(0.27);
  }
  counter(p: Pattern) {
    return this.play('answer', p, MIX.answer);
  }
  bell(p: Pattern) {
    return this.play('bell', p, MIX.bell);
  }
  horns(p: Pattern) {
    return stack(this.play('stabs', p, MIX.horns), this.play('hornDouble', p, MIX.hornDouble));
  }

  /** The voices that stack up the final chord in a cascade, each at its gain. */
  finaleVoices(): Voice[] {
    const { soloists } = this.instruments.sounds;
    return [
      { path: 'lead', gain: MIX.lead.gain * 0.6 },
      ...soloists.map((_, i) => ({ path: this.soloistPath(i), gain: MIX.soloist.gain })),
      { path: 'bell', gain: MIX.bell.gain },
      { path: 'double', gain: MIX.double.gain * 1.5 },
    ];
  }

  private soloistPath(index: number): SoundPath {
    return `soloists.${index % this.instruments.sounds.soloists.length}`;
  }
}
