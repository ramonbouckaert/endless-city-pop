// Turns a song into one Strudel pattern: each section of the form as a
// stack of drums and instruments, arranged end to end. Note sequences
// are written in mini-notation, Strudel's sequence language.

import './strudel-setup';
import { arrange, chord, s, saw, silence, stack, type Pattern } from '@strudel/core';
import { mini } from '@strudel/mini';
import { Band, DOUBLE_TOP, FIGURES, type Instruments, Mini, TAIL_SECONDS } from './band';
import { BassWriter } from './bass';
import { STYLE } from './constants';
import { FORM, type Section } from './form';
import { type Melody, Solo } from './melody';
import { Chord, type Key } from './music';
import type { Song } from './song';
import { at } from './drums';
import type {
  Bar,
  Bass,
  DrumBreakMaterial,
  DrumFill,
  DrumRole,
  FinaleMaterial,
  LiftMaterial,
  Material,
  MaterialOf,
  SectionType,
} from './types';

export type { Instruments };

// A melody and the key it's written in.
type Tune = { melody: Melody; key: Key };

// A section's drums, and its pitched parts (falsy ones left out).
type Parts = { drums: Pattern[]; pitched: (Pattern | null | false | undefined)[] };

// Chords, chord-scales and bass for some bars in a key.
function harmonyParts(band: Band, bars: Bar[], key: Key, bass: Bass) {
  const C = Mini.chords(bars, key);
  const S = mini(BassWriter.scales(bars, key));
  return { C, S, B: band.bass(bass.pattern, S) };
}

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

  parts(): Parts {
    const { song } = this;
    const recipes: Record<SectionType, () => Parts> = {
      intro: () => this.intro(song.material('intro')),
      outro: () => this.outro(song.material('outro')),
      vamp: () => this.vamp(song.material('vamp')),
      verse: () => this.verse(song.material('verse')),
      pre: () => this.pre(song.material('pre')),
      chorus: () => this.chorus(song.material('chorus')),
      riff: () => this.riff(song.material('riff')),
      bridge: () => this.bridge(song.material('bridge')),
      solo: () => this.solo(song.material('solo').solo),
      solo2: () => this.solo(song.material('solo2').solo),
      breakdown: () => this.breakdown(song.material('breakdown')),
      lift: () => this.lift(song.material('lift')),
      drumBreak: () => this.drumBreak(song.material('drumBreak')),
      finale: () => this.finale(song.material('finale')),
    };
    return recipes[this.sec.type]();
  }

  // ---- Shared material ------------------------------------------------

  // The band's chords, scales and bass, built on first use. A reprise
  // plays the intro's chords.
  private played?: ReturnType<typeof harmonyParts>;
  private get chords() {
    if (this.played) return this.played;
    const { mat } = this;
    if (!('bass' in mat)) throw new Error(`A ${mat.type} has no band part`);
    const { bars, key } = mat.type === 'outro' && mat.outro === 'reprise' ? this.song.material('intro') : mat;
    this.played = harmonyParts(this.band, bars, key, mat.bass);
    return this.played;
  }
  private get C(): Pattern {
    return this.chords.C;
  }
  private get S(): Pattern {
    return this.chords.S;
  }
  private get B(): Pattern {
    return this.chords.B;
  }
  private get scale(): string {
    return `${this.mat.key.tonicName}4:${this.mat.key.mode}`;
  }
  // A melody as degrees of its key, and as a line in this section's key.
  private degrees({ melody, key }: Tune): Pattern {
    return Mini.perBar(melody.render(key));
  }
  private mel(tune: Tune): Pattern {
    return this.band.line(this.degrees(tune), this.scale);
  }
  // The intro's line on bells, if it has one: an octave up, if it fits.
  private teaser(): Pattern | undefined {
    const intro = this.song.material('intro');
    if (!intro.melody) return undefined;
    const { melody, key } = intro;
    return this.band.bell(this.band.line(this.degrees({ melody, key }), this.scale, this.octaveUp(melody)));
  }
  // 12 to play a melody an octave up, or 0 if that would take it too high
  // (melody notes count up from the tonic in octave 4).
  private octaveUp(melody: Melody): number {
    return 60 + this.song.key.tonic + this.sec.shift + melody.top + 12 <= DOUBLE_TOP ? 12 : 0;
  }
  private from(start: number): string {
    return Mini.from(this.len, start);
  }
  // Stop-time: the band and drums hit together, then drive the last bar.
  private stopTime(drums: Pattern[], C: Pattern, B: Pattern): Parts & { pitched: Pattern[] } {
    const { band, len } = this;
    const hits = (last: string) => Mini.lastBar(len, last, FIGURES.stops);
    return {
      drums: [stack(...drums).mask(hits('x'))],
      pitched: [B.struct(hits('x*8')), band.keys(C, hits('[~ x]*4')).clip(0.3), band.stabs(C, hits('~'))],
    };
  }
  // Strings swelling through the section, up to `top`.
  private swell(C: Pattern, top: number): Pattern {
    return this.band.strings(C).gain(saw.slow(this.len).range(0.04, top));
  }

  // ---- Recipes --------------------------------------------------------

  private intro(intro: MaterialOf<'intro'>): Parts {
    const { band, C, B, len } = this;
    const drums = this.drums();
    const halfway = (p: Pattern) => p.mask(this.from(len / 2));
    switch (intro.texture) {
      case 'arp':
        // A keyboard arpeggio over a pad; bass and drums join halfway.
        return {
          drums: [halfway(stack(...drums))],
          pitched: [band.arp(C), band.pad(C), halfway(B.gain(0.7)), this.teaser()],
        };
      case 'drumsFirst': {
        // The drums alone, then the band in halfway on a crash.
        const crash = s(Mini.perBar(Array.from({ length: len }, (_, i) => (i === len / 2 ? 'cr' : '~')))).gain(0.2);
        return {
          drums: [...drums, band.drum(crash)],
          pitched: [halfway(B), halfway(band.keys(C).gain(0.26)), halfway(band.clav(C)), this.teaser()],
        };
      }
      case 'fanfare': {
        // The band hits together, horns playing the teaser over it, then
        // grooves in the last bar.
        const { melody, key } = intro;
        const stop = this.stopTime(drums, C, B);
        return {
          drums: stop.drums,
          pitched: [...stop.pitched, melody && band.horns(band.line(this.degrees({ melody, key }), this.scale))],
        };
      }
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

  private outro(outro: MaterialOf<'outro'>): Parts {
    const { band, C } = this;
    if (outro.outro === 'trade') return this.trade(outro.solo);
    return { drums: this.drums(), pitched: [band.softKeys(C), band.strings(C), this.B.gain(0.6), this.teaser()] };
  }

  // The opening vamp's drums come in after two bars, start with kick and
  // hats alone, or play throughout, as the material says; when the vamp
  // comes back, the band is already going.
  private vamp(vamp: MaterialOf<'vamp'>): Parts {
    const { band, C } = this;
    const entry = this.sec.opts.second ? 'full' : vamp.entry;
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

  private verse(verse: MaterialOf<'verse'>): Parts {
    const { band, C } = this;
    const second = this.sec.opts.second;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.keys(C),
        band.clav(C),
        band.lead(this.mel(verse)),
        second && band.scratch(C),
        second && band.pad(C),
      ],
    };
  }

  // White noise rising through the section.
  private get riser(): Pattern {
    return s('white').gain(saw.slow(this.len).range(0, 0.07)).hpf(3000);
  }

  // The pre-chorus, in its flavour's texture. Later rounds add a layer.
  private pre(pre: MaterialOf<'pre'>): Parts {
    const { band, C, B, len, riser } = this;
    const drums = this.drums();
    const lead = band.lead(this.mel(pre));
    const later = this.sec.opts.second;
    switch (pre.flavour) {
      case 'pedal':
        // Long notes over a held bass, strings swelling.
        return {
          drums: [...drums, riser],
          pitched: [B, band.softKeys(C).gain(0.26), this.swell(C, 0.14), lead, later && band.choir(C)],
        };
      case 'drop':
        // The drums drop out, then come back halfway.
        return {
          drums: [stack(...drums).mask(this.from(Math.floor(len / 2)))],
          pitched: [B.gain(0.6), band.pad(C), band.softKeys(C).gain(0.26), lead, later && band.strings(C)],
        };
      case 'stops': {
        // Stop-time hits under a free lead.
        const stop = this.stopTime(drums, C, B);
        return { drums: stop.drums, pitched: [...stop.pitched, lead, later && band.strings(C)] };
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

  private chorus(chorus: MaterialOf<'chorus'>): Parts {
    const { band, C } = this;
    const { answer, big } = this.sec.opts;
    // The flute doubles the hook an octave up, if it fits.
    const up = this.octaveUp(chorus.melody);
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.keys(C, STYLE.comp.chorus).clip(0.5).gain(0.28),
        band.clav(C),
        band.pad(C),
        band.lead(this.mel(chorus)),
        band.double(this.mel(chorus), up),
        answer && band.counter(band.line(this.degrees({ melody: chorus.answer, key: chorus.key }), this.scale)),
        big && band.stabs(C),
        big && band.strings(C),
        big && band.choir(C),
      ],
    };
  }

  private riff(riff: MaterialOf<'riff'>): Parts {
    const { band, C } = this;
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        band.horns(band.line(band.harmonize(this.degrees(riff), 2), this.scale)),
        band.keys(C).gain(0.28),
        band.clav(C),
      ],
    };
  }

  private bridge(bridge: MaterialOf<'bridge'>): Parts {
    const { band, C } = this;
    return {
      drums: this.drums(),
      pitched: [
        this.B.gain(0.65),
        band.arp(C),
        band.strings(C),
        band.lead(this.mel(bridge)),
        band.bell(band.line(this.degrees(bridge), this.scale, 12)).gain(0.15),
      ],
    };
  }

  // The first soloist plays over the band; the second over a bossa comp.
  private solo(solo: Solo): Parts {
    const { band, C } = this;
    const bossa = this.sec.type === 'solo2';
    return {
      drums: this.drums(),
      pitched: [
        this.B,
        bossa ? band.keys(C, STYLE.comp.bossa).gain(0.26) : band.keys(C).gain(0.3),
        bossa ? band.strings(C).gain(0.08) : band.clav(C),
        this.soloist(this.sec.opts.soloist!, this.soloLine(solo)).pan(bossa ? 0.42 : 0.55),
      ],
    };
  }

  // A pared-back vamp, soft keys over light drums, while two soloists
  // (the song's, if it had solos) trade two-bar lines.
  private trade(solo: Solo): Parts {
    const { band, C, len, song } = this;
    const count = band.sounds.soloists.length;
    const [first, second = first] = [...new Set([...song.soloists, ...FORM.soloists.map((i) => i % count)])];
    const line = this.soloLine(solo);
    // Two bars each: the first soloist on bars 1-2, 5-6, ...
    const turns = (mine: number) =>
      Mini.perBar(Array.from({ length: len }, (_, b) => (Math.floor(b / 2) % 2 === mine ? '1' : '0')));
    return {
      drums: this.drums().map((p) => p.postgain(0.7)),
      pitched: [
        this.B.gain(0.65),
        band.softKeys(C).gain(0.24),
        this.soloist(first, line.mask(turns(0))).pan(0.4),
        this.soloist(second, line.mask(turns(1))).pan(0.62),
      ],
    };
  }

  // An improvised line, slurs and all.
  private soloLine(solo: Solo): Pattern {
    return this.band.line(Mini.perBar(solo.render()), this.S, 24).penv(Mini.perBar(solo.slides())).pattack(Solo.slide);
  }

  // A line on one of the song's soloists, in the solo room.
  private soloist(index: number, line: Pattern): Pattern {
    const { soloists } = this.band.sounds;
    return this.band
      .voice(soloists[index % soloists.length], line)
      .room(0.3)
      .delay(0.15)
      .delaytime(0.27);
  }

  // The hook over pads, keys coming in halfway.
  private breakdown(breakdown: MaterialOf<'breakdown'>): Parts {
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
        band.lead(this.mel(breakdown)),
      ],
    };
  }

  // This lift's turnaround into its key, played in its style.
  private lift({ lifts }: LiftMaterial): Parts {
    const { band, len } = this;
    const lift = lifts[this.repeat];
    const { C, S, B } = harmonyParts(band, lift.bars, lift.key, lift.bass);
    const drums = this.drums();
    const keys = band.keys(C, 'x*4').clip(0.5).gain(0.32);
    switch (lift.style) {
      case 'stops':
        // The whole band hits together, the drums with it.
        return {
          drums: [stack(...drums).mask(FIGURES.stops)],
          pitched: [B.struct(FIGURES.stops), band.keys(C, FIGURES.stops).clip(0.3), band.stabs(C, FIGURES.stops)],
        };
      case 'drop':
        // The drums drop out under held chords and a riser; the chorus lands on them.
        return {
          drums: [this.riser],
          pitched: [B.gain(0.6), band.pad(C), this.swell(C, 0.16)],
        };
      case 'run':
        // The lead holds a chord tone, then runs up into the chorus.
        return {
          drums,
          pitched: [B, keys, band.lead(band.line(Mini.lastBar(len, FIGURES.liftRun, FIGURES.liftHold), S, 24))],
        };
      case 'drums':
        // The drums alone, then a bass pickup into the new key.
        return {
          drums,
          pitched: [band.bass(Mini.lastBar(len, FIGURES.liftPickup, '~'), `${lift.key.tonicName}2:${lift.key.mode}`)],
        };
      default:
        // A rising horn line over quarter-note keys.
        return { drums, pitched: [B, keys, band.horns(band.line(FIGURES.liftLine, S, 36))] };
    }
  }

  // Drums alone, then a bass pickup into what follows.
  private drumBreak({ pickup: { into, key, shift } }: DrumBreakMaterial): Parts {
    const pickup = this.band.bass(FIGURES.pickup, into.bassScale(key));
    return { drums: this.drums(), pitched: [shift ? pickup.transpose(shift) : pickup] };
  }

  // The last chord, rung out in the finale's style.
  private finale({ bars, ending }: FinaleMaterial): Parts {
    const { band, song } = this;
    const fin = bars[0][0];
    const name = fin.name(song.key);
    const keys = (c: Pattern) => band.chords('keys', c, 0.4).room(0.5);
    const root = band.bass('0', fin.bassScale(song.key));
    // The ride swelling under the held chord, after a kick and crash.
    const ride = band.drum(s('rd*16').gain(0.09).velocity(saw.slow(2).range(0.3, 1)));
    const ring = [band.drum(s('[bd,cr]').slow(2).gain(0.55)), ride];
    switch (ending) {
      case 'hits': {
        // The band hits the chord with the drums, then one last stab rings
        // out over the strings.
        const hits = FIGURES.finaleHits;
        return {
          drums: [band.drum(s('[bd,sd,cr]').struct(hits).gain(0.5))],
          pitched: [
            keys(chord(name).struct(hits)).clip(0.4),
            band.stabs(chord(name), hits),
            root.struct(hits).clip(0.4),
            band.strings(chord(name)).mask('<0 1>'),
          ],
        };
      }
      case 'slide': {
        // The same chord a semitone up, slipping down onto the last one
        // on the and of two.
        const above = new Chord(fin.root + 1, fin.symbol, fin.scale);
        const both = (a: string, b: string) => `[${a}@3 ${b}@13]`;
        const chords = chord(both(above.name(song.key), name)).slow(2);
        const scales = both(above.bassScale(song.key), fin.bassScale(song.key));
        return {
          drums: [band.drum(s('[~@3 [bd,cr]@13]').slow(2).gain(0.55)), ride],
          pitched: [keys(chords), band.strings(chords), band.bass('[0@3 0@13]', scales).slow(2)],
        };
      }
      case 'run':
        // A run up the chord on the keys, landing on it held.
        return {
          drums: ring,
          pitched: [
            band
              .voiced(band.line(FIGURES.finaleRun, fin.bassScale(song.key, 2)).slow(2), band.sounds.keys)
              .gain(0.32)
              .room(0.5),
            keys(chord(`[~ ${name}@3]`)).slow(2),
            band.strings(chord(name)).slow(2),
            root.slow(2),
          ],
        };
    }
    // Cascade: the band holds the chord as the voices stack up it.
    const voices = band.finaleVoices();
    const enters = FIGURES.finaleDegrees.map((d, i) => {
      const [sound, gain] = voices[i % voices.length];
      return band
        .voiced(band.line(`[${'~ '.repeat(i + 1)}${d}@${7 - i}]`, fin.bassScale(song.key, 2)).slow(2), sound)
        .gain(gain * 0.75)
        .room(0.5);
    });
    return {
      drums: ring,
      pitched: [keys(chord(name)).slow(2), band.strings(chord(name)).slow(2), root.slow(2), ...enters],
    };
  }

  // ---- Drums ----------------------------------------------------------

  // The groove, maybe a crash on the first bar, and maybe a fill over the
  // end of the last bar (a different one for each repeat). The fill
  // replaces the kick and snare from where it starts, or everything for
  // a stop.
  // `enter` may hold a part back, by role, with a mask.
  private drums(enter?: (role: DrumRole) => string | undefined): Pattern[] {
    const { mat } = this;
    if (mat.type === 'finale') throw new Error('The finale has no groove');
    const d = mat.drums;
    const { len } = this;
    const fill: DrumFill | null = d.fill ? d.fills[this.repeat % d.fills.length] : null;
    const cut = fill && Mini.lastBar(len, fill.start ? `[1@${fill.start} 0@${16 - fill.start}]` : '0', '1');
    const groove = d.parts.map(({ sound, role, bars }) => {
      const p = s(Mini.perBar(bars.map((b) => Mini.hits(b, sound)))).gain(Mini.perBar(bars.map(Mini.gains)));
      const held = enter?.(role);
      const entered = held ? p.mask(held) : p;
      return cut && (fill.stop || role === 'kick' || role === 'snare' || role === 'ghost')
        ? entered.mask(cut)
        : entered;
    });
    // The fill's hits, one part per sound, in the last bar.
    const fillParts = [...new Set(fill?.hits.map((h) => h.sound))].map((sound) => {
      const bar = at(Object.fromEntries(fill!.hits.filter((h) => h.sound === sound).map((h) => [h.step, h.gain])));
      return s(Mini.lastBar(len, Mini.hits(bar, sound), '~')).gain(Mini.lastBar(len, Mini.gains(bar), '0'));
    });
    const crash = d.crash ? [s(`<cr ${'~ '.repeat(len - 1)}>`).gain(0.2)] : [];
    const parts = [...groove, ...fillParts, ...crash];
    return parts.map((p) => this.band.drum(p));
  }
}
