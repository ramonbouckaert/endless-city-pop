import { describe, expect, it } from 'vitest';
import {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  HALF,
  Intro,
  Lift,
  Link,
  OWN,
  Outro,
  PreChorus,
  Riff,
  ShortBar,
  SoloSection,
  Song,
  Swell,
  Vamp,
  Verse,
} from '../src/engine';
import { defined } from './helpers';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

describe('form', () => {
  it('varies the form from seed to seed', () => {
    const forms = SEEDS.map((seed) => Song.generate(seed).form.sections);
    expect(new Set(forms.map((f) => f.reduce((n, s) => n + s.bars, 0))).size).toBeGreaterThan(10);
    expect(new Set(forms.map((f) => f.map((s) => s.kind.id).join(' '))).size).toBeGreaterThan(20);
    for (const kind of [Vamp, PreChorus, Riff, Bridge, SoloSection, Breakdown, Lift, Outro, DrumBreak]) {
      expect(forms.some((f) => f.some((s) => s.kind === kind))).toBe(true);
      expect(forms.some((f) => f.every((s) => s.kind !== kind))).toBe(true);
    }
  });

  it('brings a vamp back at most twice, never straight after a verse', () => {
    const forms = Array.from({ length: 300 }, (_, i) => Song.generate(`vamp${i}`).form.sections);
    let returns = 0;
    let twice = 0;
    for (const form of forms) {
      const vamps = form.flatMap((s, i) => (s instanceof Vamp ? [i] : []));
      expect(vamps.length).toBeLessThanOrEqual(3);
      // The first opens the song, after the intros (and perhaps a swell and a pickup).
      if (vamps.length)
        expect(
          form.slice(0, vamps[0]).every((s) => s instanceof Intro || s instanceof Swell || s instanceof ShortBar),
        ).toBe(true);
      if (vamps.length > 1) returns++;
      if (vamps.length > 2) twice++;
      for (const back of vamps.slice(1)) {
        expect(form[back - 1].kind.handsOver).toBe(true);
        expect(form[back - 1].kind).not.toBe(Vamp);
        expect(form[back].bars).toBe(form[vamps[0]].bars);
        expect(form[back]).toMatchObject({ returning: true });
      }
    }
    expect(returns).toBeGreaterThan(20);
    expect(twice).toBeGreaterThan(3);
  });

  it('plans tunes, J-pop forms, links, stops, half choruses and side-stepping riffs', () => {
    const songs = Array.from({ length: 400 }, (_, i) => Song.generate(`shape${i}`));
    const seen = new Set<string>();
    for (const song of songs) {
      const form = song.form.sections;
      const choruses = song.form.ofType(Chorus);
      const whole = choruses.filter((c) => !c.half);
      // Every whole chorus is as long as the others; a half one is the rest of a whole one's second half.
      if (choruses.length) expect(new Set(whole.map((c) => c.bars)).size).toBe(1);
      for (const half of choruses.filter((c) => c.half)) {
        seen.add('half');
        expect(half.bars).toBe(Math.ceil(whole[0].bars / 2));
        expect(half.part).toBe(HALF);
        expect(choruses.indexOf(half)).toBeGreaterThan(0);
        expect(half.material.bars).toEqual(whole[0].material.bars.slice(whole[0].bars - half.bars));
      }
      // A link only ever comes before a verse: after the first round (its chorus, or a song without one, its B), or in some songs before the first verse too.
      form.forEach((sec, i) => {
        if (!(sec instanceof Link)) return;
        seen.add(`${sec.bars}-bar link`);
        expect(form[i + 1]).toBeInstanceOf(Verse);
        if (form.slice(0, i).some((s) => s instanceof Chorus || s instanceof PreChorus)) return;
        // (Before the first verse, only after an intro in time.)
        seen.add('first link');
        expect(form.slice(0, i).some((s) => s instanceof Intro && !s.free)).toBe(true);
      });
      // A stop is never on the last chorus, nor the first.
      for (const [i, c] of choruses.entries()) {
        if (!c.stop) continue;
        seen.add('stop');
        expect(i).toBeGreaterThan(0);
        expect(c).not.toBe(choruses.at(-1));
      }
      // A riff a semitone up follows the same riff (but for a riff ending, after a lift).
      form.forEach((sec, i) => {
        if (!(sec instanceof Riff) || sec.shift !== 1) return;
        if (form.slice(i).every((s) => s instanceof Riff || s instanceof Finale)) return;
        seen.add('side-step');
        expect(form[i - 1]).toBeInstanceOf(Riff);
        expect(form[i - 1].shift).toBe(0);
      });
      // A verse sung twice in a row.
      if (form.some((s, i) => s instanceof Verse && form[i + 1] instanceof Verse)) seen.add('verse twice');
      // Seven-bar verses, every one of them.
      const verses = song.form.ofType(Verse);
      if (verses.some((v) => v.bars === 7)) {
        seen.add('short verse');
        expect(verses.every((v) => v.bars === 7)).toBe(true);
        expect(defined(song.part(Verse), 'a verse').bars).toHaveLength(7);
      }
      // A tune: choruses alone (in pairs, eight bars), a bridge, and a fade.
      if (!verses.length && whole.length >= 6 && whole[0].bars === 8 && song.form.first(Bridge)) seen.add('tune?');
      // A 2/4 break comes before a whole chorus after a verse or pre-chorus; a 1/4 pickup after the intro.
      form.forEach((sec, i) => {
        if (!(sec instanceof ShortBar)) return;
        seen.add(`${sec.beats}/4`);
        if (sec.beats === 2) {
          expect(form[i + 1]).toBeInstanceOf(Chorus);
          expect([Verse, PreChorus]).toContain(form[i - 1].kind);
        } else expect(form.slice(0, i).every((s) => s instanceof Intro || s instanceof Swell)).toBe(true);
        expect(sec.shift).toBe(form[i + 1].shift);
      });
      if (whole.some((c) => c.bars === 20)) seen.add('20');
      if (whole.some((c) => c.bars === 12)) seen.add('12');
    }
    expect(seen).toEqual(
      new Set([
        'half',
        '1-bar link',
        '2-bar link',
        '3-bar link',
        'first link',
        'stop',
        'side-step',
        'verse twice',
        'short verse',
        'tune?',
        '20',
        '12',
        '2/4',
        '1/4',
      ]),
    );
  });

  it('plans songs without a chorus, endings on the verse, choruses twice, long pre-choruses and odd intros', () => {
    const songs = Array.from({ length: 500 }, (_, i) => Song.generate(`more${i}`));
    const seen = new Set<string>();
    for (const song of songs) {
      const form = song.form.sections;
      const last = song.lastPlayed;
      // A song without a chorus (Sparkle's): rounds of verse and B, the B once more, no lift or breakdown.
      if (!song.form.first(Chorus)) {
        seen.add('no chorus');
        expect(song.form.first(Verse)).toBeDefined();
        expect(last).toBeInstanceOf(PreChorus);
        expect(song.form.first(Lift)).toBeUndefined();
        expect(song.form.first(Breakdown)).toBeUndefined();
        if (song.form.first(Outro)?.fade) expect(song.form.first(Outro)?.variant).toBe('coda');
      }
      // A song ending on its verse (ANRI's): its last chorus, with everything (or a last verse and a solo), then a
      // lift up into verses to the end, fading, the first perhaps bare.
      if (last instanceof Verse && song.form.first(Chorus)) {
        seen.add('verse ending');
        const lift = form.findLastIndex((s) => s instanceof Lift);
        expect(lift).toBeGreaterThan(0);
        // (A returning vamp may come between a solo and the lift.)
        const at = form.slice(0, lift).findLastIndex((s) => !(s instanceof Vamp));
        const before = form[at];
        if (before instanceof SoloSection) {
          seen.add('verse ending after a solo');
          expect(form[at - 1]).toBeInstanceOf(Verse);
          expect(song.form.ofType(Chorus).at(-1)?.big).toBe(true);
        } else {
          expect(at).toBe(lift - 1);
          expect(before).toBeInstanceOf(Chorus);
          expect(before instanceof Chorus && before.big).toBe(true);
        }
        const after = form.slice(lift + 1);
        expect(after.length).toBeGreaterThanOrEqual(2);
        for (const v of after) {
          expect(v).toBeInstanceOf(Verse);
          expect(v.shift).toBe(form[lift].shift);
          expect(v.shift).toBeGreaterThan(0);
        }
        expect(after.at(-1)?.fade).toBe(true);
        if (after[0].bare) seen.add('bare');
      }
      // Only the first verse after a verse ending's lift starts bare.
      form.forEach((sec, i) => {
        if (sec.bare) expect(form[i - 1]).toBeInstanceOf(Lift);
      });
      // The last round's chorus twice, perhaps re-entered through a turnaround at the same key. (A tune plays
      // its chorus twice every round.)
      const body = song.rounds;
      if (song.chorusTwice) {
        seen.add('chorus again');
        const last = Math.max(...body.map((s) => s.round ?? 0));
        expect(body.filter((s) => s instanceof Chorus && s.round === last)).toHaveLength(2);
      }
      body.forEach((sec, i) => {
        const next = body[i + 1];
        // Never split by a returning vamp.
        const after = body[i + 2];
        if (sec instanceof Chorus && next instanceof Vamp && (after instanceof Chorus || after instanceof Lift)) {
          expect(after.round).not.toBe(sec.round);
        }
        if (sec instanceof Lift) {
          seen.add('re-entry');
          expect(sec.shift).toBe(0);
          expect(body[i - 1]).toBeInstanceOf(Chorus);
          expect(next).toBeInstanceOf(Chorus);
          expect([body[i - 1].round, next.round]).toEqual([sec.round, sec.round]);
        }
      });
      // A last round with no chorus, into the verse's chords looping under a new hook (Plastic Love's).
      const outro = song.form.first(Outro);
      if (song.form.first(Chorus) && last instanceof PreChorus && outro?.variant === 'loop') {
        seen.add('round outro');
        expect(form.at(-1)).toBe(outro);
        expect(outro.fade).toBe(true);
        const chorus = form.findLastIndex((s) => s instanceof Chorus);
        // (After the middle: its last round, verse and pre-chorus, and no lift.)
        const after = form.slice(chorus + 1, -1).map((s) => s.kind.id);
        expect(after).toContain(Verse.id);
        expect(after).not.toContain(Lift.id);
      }
      if (outro && outro.bars === 24) seen.add('24-bar outro');
      // Rounds singing their verse and pre-chorus twice before the chorus (A A′ A A′). (A song without a chorus
      // plays its rounds of verse and B back to back.)
      if (song.form.first(Chorus))
        for (const [verse] of song.form.runs(Verse, PreChorus, Verse)) {
          seen.add('verse and B twice');
          expect(verse.bars).toBeLessThanOrEqual(8);
          const i = form.indexOf(verse);
          expect(form[i + 3]?.kind.id).toBe(PreChorus.id);
          expect([Chorus.id, ShortBar.id, Outro.id]).toContain(form[i + 4]?.kind.id);
        }
      // A tune's bridge between its rounds, and again before the last choruses, perhaps lifting out of it (Tokai's).
      const bridges = song.form.ofType(Bridge);
      if (bridges.length > 1) {
        seen.add('bridge between rounds');
        const at = form.indexOf(bridges[0]);
        expect(form.slice(0, at).some((s) => s instanceof Chorus)).toBe(true);
        expect(form.slice(at + 1).some((s) => s instanceof Chorus && s.round !== undefined)).toBe(true);
      }
      for (const [bridge, sec] of song.form.runs(Bridge, Lift)) {
        seen.add('lift out of a bridge');
        if (sec.turnaround !== OWN) continue;
        // Its own: the bridge's last bars, a step down, the last chord bent onto the new key's V.
        seen.add('own lift out of a bridge');
        const step = sec.shift - bridge.shift;
        const roots = (bars: readonly (readonly { root: number }[])[]) => bars.map((bar) => bar.map((c) => c.root));
        const down = bridge.material.bars.slice(-2).map((bar) => bar.map((c) => ({ root: (c.root - step + 12) % 12 })));
        expect(roots(sec.material.bars)[0]).toEqual(roots(down)[0]);
        expect(sec.material.bars[1].at(-1)?.root).toBe((song.key.tonic + 7) % 12);
      }
      for (const b of bridges) seen.add(`${b.bars}-bar bridge`);
      if (song.form.ofType(PreChorus).some((p) => p.bars === 16)) seen.add('16-bar pre');
      const intros = song.form.ofType(Intro);
      for (const intro of intros) if (!intro.free) seen.add(`${intro.bars}-bar intro`);
      // A swell opens the song, before the intro in time.
      const swells = song.form.ofType(Swell);
      if (swells.length) {
        seen.add('swell');
        expect(swells).toEqual([form[0]]);
        expect(form[1]).toBeInstanceOf(Intro);
        expect(intros[0].free).toBeFalsy();
      }
    }
    expect(seen).toEqual(
      new Set([
        'no chorus',
        'verse ending',
        'bare',
        'chorus again',
        're-entry',
        '16-bar pre',
        '4-bar intro',
        '5-bar intro',
        '8-bar intro',
        '9-bar intro',
        '6-bar intro',
        '7-bar intro',
        '11-bar intro',
        'swell',
        'verse ending after a solo',
        'round outro',
        '24-bar outro',
        'verse and B twice',
        'bridge between rounds',
        'lift out of a bridge',
        'own lift out of a bridge',
        '8-bar bridge',
        '12-bar bridge',
      ]),
    );
  });

  it('ends songs on the riff three times, and songs without a chorus on a coda before the finale', () => {
    const songs = Array.from({ length: 500 }, (_, i) => Song.generate(`ends${i}`));
    const seen = new Set<string>();
    for (const song of songs) {
      const form = song.form.sections;
      const finale = form.at(-1);
      if (!(finale instanceof Finale)) continue;
      // The riff three times, shifted with the last chorus, into the finale (Flyday Chinatown's).
      const riffs = form.slice(-4, -1);
      if (riffs.every((r) => r instanceof Riff) && !(form.at(-5) instanceof Riff)) {
        seen.add('riff ending');
        const chorus = defined(
          form.findLast((s) => s instanceof Chorus),
          'a last chorus',
        );
        for (const r of riffs) expect(r.shift).toBe(chorus.shift);
        expect(finale.shift).toBe(chorus.shift);
      }
      // A song without a chorus: its B, then a coda, then the finale (Sparkle's).
      const outro = form.at(-2);
      if (!song.form.first(Chorus) && outro instanceof Outro && outro.variant === 'coda') {
        seen.add('coda before the finale');
        expect(form.at(-3)?.kind.id).toBe(PreChorus.id);
      }
    }
    expect(seen).toEqual(new Set(['riff ending', 'coda before the finale']));
  });
});
