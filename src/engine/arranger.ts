// Turns a song into one Strudel pattern: each section of the form as a
// stack of drums and instruments, arranged end to end. Note sequences
// are written in mini-notation, Strudel's sequence language.

import { arrange, chord, s, saw, silence, stack, type Pattern } from '@strudel/core';
import { mini } from '@strudel/mini';
import { Band, DOUBLE_TOP, FIGURES, type Instruments, Mini, TAIL_SECONDS } from './band';
import { BassWriter } from './bass';
import { STYLE } from './constants';
import type { Section } from './form';
import { Solo } from './melody';
import type { Song } from './song';
import type { DrumFill, DrumRole, Material, SectionType, StepGains } from './types';

export type { Instruments };

export class Arranger {
  private readonly band: Band;

  constructor(
    private readonly song: Song,
    { sounds = song.sounds, kit = song.kit }: Instruments = {},
  ) {
    this.band = new Band(kit, sounds);
  }

  /**
   * The whole song as one pattern, its tempo in cycles per second (a
   * cycle is a bar), and how many cycles it lasts before it loops: the
   * song's bars and TAIL_SECONDS of silence.
   */
  pattern(): { pattern: Pattern; cps: number; cycles: number } {
    const { song } = this;
    const cps = song.bpm / 4 / 60;
    const sections = song.form.map((sec, index): [number, Pattern] => {
      const repeat = song.form.slice(0, index).filter((x) => x.type === sec.type).length;
      const { drums, pitched } = new SectionArranger(song, sec, repeat, this.band).parts();
      const tonal = pitched.filter((p): p is Pattern => !!p);
      const tonalPart = sec.shift ? [stack(...tonal).transpose(sec.shift)] : tonal;
      const parts = stack(...drums, ...tonalPart);
      return [sec.bars, parts.swingBy(song.swing, 8)];
    });
    // The tail is a fraction of a bar. Coming last, it shifts no bar line
    // but the loop's own: the next time round starts a second later.
    const tail = TAIL_SECONDS * cps;
    return { pattern: arrange(...sections, [tail, silence]), cps, cycles: song.bars + tail };
  }
}

/** One section's parts: its drums and a recipe of instruments per section type. */
class SectionArranger {
  private readonly mat: Material;
  private readonly len: number;

  constructor(
    private readonly song: Song,
    private readonly sec: Section,
    private readonly repeat: number, // earlier sections of this type
    private readonly band: Band,
  ) {
    this.mat = song.material(sec.type);
    this.len = sec.bars;
  }

  parts(): { drums: Pattern[]; pitched: (Pattern | null | false | undefined)[] } {
    const recipes: Record<SectionType, () => ReturnType<SectionArranger['parts']>> = {
      intro: () => this.intro(),
      outro: () => this.outro(),
      vamp: () => this.vamp(),
      verse: () => this.verse(),
      pre: () => this.pre(),
      chorus: () => this.chorus(),
      riff: () => this.riff(),
      bridge: () => this.bridge(),
      solo: () => this.solo(),
      solo2: () => this.solo(),
      breakdown: () => this.breakdown(),
      lift: () => this.lift(),
      drumBreak: () => this.drumBreak(),
      finale: () => this.finale(),
    };
    return recipes[this.sec.type]();
  }

  // ---- Shared material ------------------------------------------------

  // The material whose harmony this section plays.
  private get harmony(): Material {
    return this.sec.type === 'outro' ? this.song.material('intro') : this.mat;
  }
  private get C(): Pattern {
    return Mini.chords(this.harmony.bars!, this.harmony.key);
  }
  private get S(): Pattern {
    return mini(BassWriter.scales(this.harmony.bars!, this.harmony.key));
  }
  private get B(): Pattern {
    return this.band.bass(this.mat.bass!.pattern, this.S);
  }
  private get scale(): string {
    return `${this.mat.key.tonicName}4:${this.mat.key.mode}`;
  }
  // A material's melody as degrees, and as a line in this section's key.
  private degrees(x: Material, which: 'melody' | 'answer' = 'melody'): Pattern {
    return Mini.perBar(x[which]!.render(x.key));
  }
  private mel(x: Material = this.mat): Pattern {
    return this.band.line(this.degrees(x), this.scale);
  }
  // The intro's line on vibes, if it has one.
  private teaser(): Pattern | undefined {
    const intro = this.song.material('intro');
    return intro.melody && this.band.bell(this.band.line(this.degrees(intro), this.scale, 12));
  }
  private from(start: number): string {
    return Mini.from(this.len, start);
  }

  // ---- Recipes --------------------------------------------------------

  private intro(): ReturnType<SectionArranger['parts']> {
    const { band, C, B } = this;
    const drums = this.drums();
    const halfway = (p: Pattern) => p.mask(this.from(this.len / 2));
    switch (this.mat.texture) {
      case 'keys':
        return {
          drums: [halfway(stack(...drums))],
          pitched: [band.keys(C).room(0.35), halfway(B.gain(0.6)), this.teaser()],
        };
      case 'groove':
        return { drums, pitched: [B, band.keys(C).gain(0.26), band.clav(C), this.teaser()] };
      case 'bassFirst':
        return { drums, pitched: [B, halfway(band.softKeys(C)), halfway(band.pad(C)), this.teaser()] };
      default:
        return { drums, pitched: [band.softKeys(C), band.strings(C), B.gain(0.6), this.teaser()] };
    }
  }

  private outro(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    return { drums: this.drums(), pitched: [band.softKeys(C), band.strings(C), this.B.gain(0.6), this.teaser()] };
  }

  // The opening vamp's drums come in after two bars, start with kick and
  // hats alone, or play throughout, as the material says; when the vamp
  // comes back, the band is already going.
  private vamp(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    const entry = this.sec.opts.second ? 'full' : this.mat.entry;
    let drums;
    if (entry === 'late') drums = [stack(...this.drums()).mask(this.from(2))];
    else if (entry === 'light')
      drums = this.drums((role) => {
        if (role === 'kick' || role === 'hat') return undefined;
        return this.from(2);
      });
    else drums = this.drums();
    return {
      drums,
      pitched: [this.B, band.keys(C).lpf(saw.slow(this.len).range(700, 8000))],
    };
  }

  private verse(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    const second = this.sec.opts.second;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.keys(C),
        band.clav(C),
        band.lead(this.mel()),
        second && band.scratch(C),
        second && band.pad(C),
      ],
    };
  }

  // The pre-chorus, in its flavour's texture. Later rounds add a layer.
  private pre(): ReturnType<SectionArranger['parts']> {
    const { band, C, B, len } = this;
    const drums = this.drums();
    const lead = band.lead(this.mel());
    const later = this.sec.opts.second;
    const riser = s('white').gain(saw.slow(len).range(0, 0.07)).hpf(3000);
    switch (this.mat.flavour) {
      case 'pedal':
        // Long notes over a held bass, strings swelling.
        return {
          drums: [...drums, riser],
          pitched: [
            B,
            band.softKeys(C).gain(0.26),
            band.strings(C).gain(saw.slow(len).range(0.04, 0.14)),
            lead,
            later && band.choir(C),
          ],
        };
      case 'drop':
        // The drums drop out, then come back halfway.
        return {
          drums: [stack(...drums).mask(this.from(Math.floor(len / 2)))],
          pitched: [B.gain(0.6), band.pad(C), band.softKeys(C).gain(0.26), lead, later && band.strings(C)],
        };
      case 'stops': {
        // Stop-time hits under a free lead; the band drives the last bar.
        const hits = (last: string) => Mini.lastBar(len, last, FIGURES.stops);
        return {
          drums: [stack(...drums).mask(hits('x'))],
          pitched: [
            B.struct(hits('x*8')),
            band.keys(C, hits('[~ x]*4')).clip(0.3),
            band.stabs(C, hits('~')),
            lead,
            later && band.strings(C),
          ],
        };
      }
      case 'borrowed':
        return {
          drums,
          pitched: [B, band.keys(C).gain(0.28), band.strings(C), band.choir(C), lead, later && band.pad(C)],
        };
      default:
        // Climbing: eighth-note keys opening up over a noise riser.
        return {
          drums: [...drums, riser],
          pitched: [
            B,
            band.keys(C, 'x*8').clip(0.4).gain(0.3).lpf(saw.slow(len).range(800, 7000)),
            band.pad(C),
            lead,
            later && band.strings(C),
          ],
        };
    }
  }

  private chorus(): ReturnType<SectionArranger['parts']> {
    const { band, C, mat, song } = this;
    const { answer, big } = this.sec.opts;
    // The flute doubles the hook an octave up, unless that would take it
    // too high (melody notes count up from the tonic in octave 4).
    const up = 60 + song.key.tonic + this.sec.shift + mat.melody!.top + 12 <= DOUBLE_TOP ? 12 : 0;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.keys(C, STYLE.comp.chorus).clip(0.5).gain(0.28),
        band.clav(C),
        band.pad(C),
        band.lead(this.mel()),
        band.double(this.mel(), up),
        answer && band.counter(band.line(this.degrees(mat, 'answer'), this.scale)),
        big && band.stabs(C),
        big && band.strings(C),
        big && band.choir(C),
      ],
    };
  }

  private riff(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.horns(band.line(band.harmonize(this.degrees(this.mat), 2), this.scale)),
        band.keys(C).gain(0.28),
        band.clav(C),
      ],
    };
  }

  private bridge(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    return {
      drums: this.drums(),
      pitched: [
        this.B.gain(0.65),
        band.arp(C),
        band.strings(C),
        band.lead(this.mel()),
        band.bell(band.line(this.degrees(this.mat), this.scale, 12)).gain(0.15),
      ],
    };
  }

  // The first soloist plays over the band; the second over a bossa comp.
  private solo(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    const { soloists } = band.sounds;
    const [sound, gain] = soloists[this.sec.opts.soloist! % soloists.length];
    const bossa = this.sec.type === 'solo2';
    const solo = this.mat.solo!;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        bossa ? band.keys(C, STYLE.comp.bossa).gain(0.26) : band.keys(C).gain(0.3),
        bossa ? band.strings(C).gain(0.08) : band.clav(C),
        band
          .voiced(
            band
              .line(Mini.perBar(solo.render()), this.S, 24)
              .penv(Mini.perBar(solo.slides()))
              .pattack(Solo.slide),
            sound,
          )
          .gain(gain)
          .room(0.3)
          .delay(0.15)
          .delaytime(0.27)
          .pan(bossa ? 0.42 : 0.55),
      ],
    };
  }

  // The hook over pads, keys coming in halfway.
  private breakdown(): ReturnType<SectionArranger['parts']> {
    const { band, C } = this;
    return {
      drums: this.drums(),
      pitched: [
        this.B.gain(0.6),
        band.pad(C).gain(0.18),
        band.choir(C),
        band
          .keys(C, STYLE.comp.chorus)
          .clip(0.5)
          .gain(0.24)
          .mask(this.from(Math.floor(this.len / 2))),
        band.lead(this.mel(this.song.material('chorus'))),
      ],
    };
  }

  // This lift's turnaround into its key, a rising horn line over it.
  private lift(): ReturnType<SectionArranger['parts']> {
    const { band } = this;
    const lift = this.mat.lifts![this.repeat];
    const C = Mini.chords(lift.bars, lift.key);
    const S = mini(BassWriter.scales(lift.bars, lift.key));
    return {
      drums: this.drums(),
      pitched: [
        band.bass(lift.bass!.pattern, S),
        band.keys(C, 'x*4').clip(0.5).gain(0.32),
        band.horns(band.line(FIGURES.liftLine, S, 36)),
      ],
    };
  }

  // Drums alone, then a bass pickup into what follows.
  private drumBreak(): ReturnType<SectionArranger['parts']> {
    const { mat } = this;
    const into = mat.pickupInto!.bassScale(this.song.material(mat.pickupFrom!).key);
    const pickup = this.band.bass(FIGURES.pickup, into);
    return { drums: this.drums(), pitched: [mat.pickupShift ? pickup.transpose(mat.pickupShift) : pickup] };
  }

  // The final chord, built one instrument at a time.
  private finale(): ReturnType<SectionArranger['parts']> {
    const { band, song } = this;
    const fin = this.mat.bars![0][0];
    const name = fin.name(song.key);
    const voices = band.finaleVoices();
    const enters = FIGURES.finaleDegrees.map((d, i) => {
      const [sound, gain] = voices[i % voices.length];
      return band
        .voiced(band.line(`[${'~ '.repeat(i + 1)}${d}@${7 - i}]`, fin.bassScale(song.key, 2)).slow(2), sound)
        .gain(gain * 0.75)
        .room(0.5);
    });
    return {
      drums: [
        band.drum(s('[bd,cr]').slow(2).gain(0.55)),
        band.drum(s('rd*16').gain(0.09).velocity(saw.slow(2).range(0.3, 1))),
      ],
      pitched: [
        chord(name).voicing().slow(2).sound(band.sounds.keys).gain(0.4).postgain(band.trim('keys')).room(0.5),
        band.strings(chord(name)).slow(2),
        band.bass('0', fin.bassScale(song.key)).slow(2),
        ...enters,
      ],
    };
  }

  // ---- Drums ----------------------------------------------------------

  // The groove, maybe a crash on the first bar, and maybe a fill over the
  // end of the last bar (a different one for each repeat). The fill
  // replaces the kick and snare from where it starts, or everything for
  // a stop.
  // `enter` may hold a part back, by role, with a mask.
  private drums(enter?: (role: DrumRole) => string | undefined): Pattern[] {
    const d = this.mat.drums!;
    const { len } = this;
    const fill: DrumFill | null = d.fill ? d.fills[this.repeat % d.fills.length] : null;
    const cut = fill && Mini.lastBar(len, fill.start ? `[1@${fill.start} 0@${16 - fill.start}]` : '0', '1');
    const parts = d.parts.map(({ sound, role, bars }) => {
      let p = s(Mini.perBar(bars.map((b) => Mini.hits(b, sound)))).gain(Mini.perBar(bars.map(Mini.gains)));
      const held = enter?.(role);
      if (held) p = p.mask(held);
      return cut && (fill.stop || role === 'kick' || role === 'snare' || role === 'ghost') ? p.mask(cut) : p;
    });
    if (fill) {
      for (const sound of new Set(fill.hits.map((h) => h.sound))) {
        const bar: StepGains = new Array(16).fill(0);
        for (const h of fill.hits) if (h.sound === sound) bar[h.step] = h.gain;
        parts.push(s(Mini.lastBar(len, Mini.hits(bar, sound), '~')).gain(Mini.lastBar(len, Mini.gains(bar), '0')));
      }
    }
    if (d.crash) parts.push(s(`<cr ${'~ '.repeat(len - 1)}>`).gain(0.2));
    return parts.map((p) => this.band.drum(p));
  }
}
