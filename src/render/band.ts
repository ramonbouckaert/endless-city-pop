// The instruments: a song's sounds as Strudel patterns. Harmony parts
// take a chord pattern; lines take degrees against a scale. The band
// notes which of its parts each section type asks for (`uses`).

import './strudel-setup';
import { chord, n, noteToMidi, rand, stack, type Pattern } from '@strudel/core';
import { mini } from '@strudel/mini';
import { level, voiceGain, type Instruments, type PartPath, type SoundPath, type Sounds } from '../model';
import { BAND, KIT_GAPS, MAX_SHIFT, SOUND_TOPS, type PickedPart, type SectionType } from '../style';
import type { Bar, Key } from '../theory';
import { COMP, FIGURES } from './figures';
import { chordSeq, scaleSeq, seq } from './notation';

// The parts that play chords.
type ChordPart = 'keys' | 'guitar' | 'pad' | 'strings' | 'choir' | 'stabs';

/** A part that plays lines: its sound, at a gain. */
export interface Voice {
  path: SoundPath;
  sound: string;
  gain: number;
}

// The answer and bell lines' gain, before their sound's trim.
const ANSWER_GAIN = 0.3;
const BELL_GAIN = 0.3;

/** One item per bar, as a pattern. */
export const perBar = (items: readonly string[]): Pattern => mini(seq(items));
/** Bars of chords, as a chord pattern. */
export const chords = (bars: readonly Bar[], key: Key): Pattern => chord(chordSeq(bars, key));
/** Bars of chord-scales from the bass root, for n().scale(). */
export const scales = (bars: readonly Bar[], key: Key): Pattern => mini(scaleSeq(bars, key));

export class Band {
  readonly sounds: Sounds;
  /** The section types each part plays in, in the order they first asked for it. */
  readonly uses = new Map<PartPath, Set<SectionType>>();
  private readonly kit: string | null;
  private section?: SectionType;

  constructor({ sounds, kit }: Instruments) {
    this.sounds = sounds;
    this.kit = kit;
  }

  /** The type of section the parts asked for next play in. */
  playing(type: SectionType): void {
    this.section = type;
  }

  private use(path: PartPath): void {
    if (!this.section) return;
    const types = this.uses.get(path) ?? new Set();
    this.uses.set(path, types.add(this.section));
  }

  /**
   * How much louder or quieter a picked part plays than with its sound in
   * BAND, which its gains were set for. Applied as postgain, so a
   * section's own gain for the part still holds.
   */
  trim(part: PickedPart): number {
    return level(this.sounds[part]) / level(BAND[part]);
  }

  /** A drum part on this song's kit; sounds the kit lacks play from the default samples. */
  drum(p: Pattern): Pattern {
    this.use('kit');
    const { kit } = this;
    if (!kit) return p;
    // Bank names are case-insensitive in Strudel (the debug panel lists them lower case).
    const gaps = Object.entries(KIT_GAPS).find(([k]) => k.toLowerCase() === kit.toLowerCase())?.[1] ?? [];
    return p.withValue((v: { s?: string }) => (v.s && gaps.includes(v.s) ? v : { ...v, bank: kit }));
  }

  // Sets the sound, dropping notes above its top by octaves. Sections
  // shifted up a key transpose after this, so the top allows for the
  // highest lift.
  private voiced(p: Pattern, sound: string): Pattern {
    const top = SOUND_TOPS[sound];
    if (top === undefined) return p.sound(sound);
    return p
      .withValue((v: { note?: number | string }) => {
        if (v.note === undefined) return v;
        let note = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
        while (note > top - MAX_SHIFT) note -= 12;
        return { ...v, note };
      })
      .sound(sound);
  }

  /** A chord pattern voiced on a part's sound, at a gain, trimmed for the sound picked. */
  chords(part: ChordPart, c: Pattern, gain: number) {
    this.use(part);
    return c.voicing().sound(this.sounds[part]).gain(gain).postgain(this.trim(part));
  }

  keys(c: Pattern, rhythm: Pattern | string = COMP.main) {
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
    this.use('clav');
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
  bass(degrees: Pattern | string, scale: Pattern | string) {
    this.use('bass');
    return n(degrees).scale(scale).sound(this.sounds.bass).clip(0.8).gain(0.75).postgain(this.trim('bass'));
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
  voice({ path, sound, gain }: Voice, p: Pattern) {
    this.use(path);
    return this.voiced(p, sound).gain(gain);
  }
  lead(p: Pattern) {
    const { lead } = this.sounds;
    return this.voice({ path: 'lead', sound: lead, gain: voiceGain(lead, 'lead') }, p).room(0.25);
  }
  double(p: Pattern, up = 12) {
    const { double } = this.sounds;
    return this.voice({ path: 'double', sound: double, gain: voiceGain(double, 'double') }, p.transpose(up)).room(0.35);
  }
  /** A line on one of the song's soloists, in the solo room. */
  soloist(index: number, p: Pattern) {
    return this.voice(this.soloistVoice(index), p).room(0.3).delay(0.15).delaytime(0.27);
  }
  counter(p: Pattern) {
    const voice: Voice = { path: 'answer', sound: this.sounds.answer, gain: ANSWER_GAIN };
    return this.voice(voice, p).postgain(this.trim('answer')).pan(0.62).room(0.25);
  }
  bell(p: Pattern) {
    return this.voice(this.bellVoice(), p).postgain(this.trim('bell')).room(0.4);
  }
  horns(p: Pattern) {
    const { stabs, hornDouble } = this.sounds;
    return stack(
      this.voice({ path: 'stabs', sound: stabs, gain: 0.3 }, p).postgain(this.trim('stabs')),
      this.voice({ path: 'hornDouble', sound: hornDouble, gain: 0.18 }, p).postgain(this.trim('hornDouble')),
    ).room(0.25);
  }

  /** The voices that stack up the final chord in a cascade, each at its gain. */
  finaleVoices(): Voice[] {
    const { lead, double, soloists } = this.sounds;
    return [
      { path: 'lead', sound: lead, gain: voiceGain(lead, 'lead') * 0.6 },
      ...soloists.map((_, i) => this.soloistVoice(i)),
      { ...this.bellVoice(), gain: BELL_GAIN * this.trim('bell') },
      { path: 'double', sound: double, gain: voiceGain(double, 'double') * 1.5 },
    ];
  }

  private soloistVoice(index: number): Voice {
    const { soloists } = this.sounds;
    const i = index % soloists.length;
    return { path: `soloists.${i}`, sound: soloists[i], gain: voiceGain(soloists[i], 'soloists') };
  }

  private bellVoice(): Voice {
    return { path: 'bell', sound: this.sounds.bell, gain: BELL_GAIN };
  }
}
