// Query a song's pattern bar by bar, so mini-notation, theory and
// sound-name errors show up without audio.
// checkPattern(pattern, bars) -> { bars, haps, problems }

import { noteToMidi, type Hap, type Pattern } from '@strudel/core';
import { GM_SOUNDS } from './gm-sounds.ts';
import { KITS, SOUND_TOPS } from '../src/style';

const BANKS = new Set(KITS.map(([kit]) => kit).filter(Boolean));
const DRUMS = new Set(['bd', 'sd', 'hh', 'oh', 'rd', 'cr', 'rim', 'cp', 'lt', 'mt', 'ht', 'sh', 'tb', 'cb', 'white']);
// Synths Strudel registers (registerSynthSounds): oscillators and noise.
const SYNTHS = new Set(['sine', 'square', 'triangle', 'sawtooth', 'supersaw', 'pulse', 'white', 'pink', 'brown']);

export function checkPattern(pattern: Pattern, bars: number): { bars: number; haps: number; problems: string[] } {
  const { result: haps, logs } = withCapturedLogs(() =>
    Array.from({ length: bars }, (_, c) =>
      (pattern.queryArc(c, c + 1) as unknown as Hap[]).map((hap) => ({ c, hap })),
    ).flat(),
  );
  const problems = [
    ...logs.filter((text) => /error|warn|unknown/i.test(text)).map((text) => text.replaceAll('%c', '').trim()),
    ...haps.flatMap(({ c, hap }) => hapProblems(c, hap.value)),
  ];
  return { bars, haps: haps.length, problems: [...new Set(problems)] };
}

// Strudel logs query errors and warnings instead of throwing them, and
// offers no hook for its logger outside a browser: so console.log is
// swapped out while `run` runs, and what it logged returned.
function withCapturedLogs<T>(run: () => T): { result: T; logs: string[] } {
  const logs: string[] = [];
  const log = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    return { result: run(), logs };
  } finally {
    console.log = log;
  }
}

// What's wrong with a hap's value in bar `c`, if anything.
function hapProblems(c: number, v: Record<string, any>): string[] {
  const sound = v.s ?? v.sound;
  return [
    sound && !DRUMS.has(sound) && !GM_SOUNDS.has(sound) && !SYNTHS.has(sound) && `unknown sound "${sound}"`,
    v.bank && !BANKS.has(v.bank) && `unknown drum kit "${v.bank}"`,
    noteProblem(c, v, sound),
  ].filter((p): p is string => !!p);
}

function noteProblem(c: number, v: Record<string, any>, sound: string | undefined): string | undefined {
  if (v.note === undefined) {
    return v.n !== undefined && sound && !DRUMS.has(sound) ? `bar ${c}: ${sound} has n but no note` : undefined;
  }
  const midi = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
  if (!Number.isFinite(midi)) return `bar ${c}: bad note ${v.note}`;
  if (midi < 23 || midi > 100) return `bar ${c}: note ${v.note} out of range (${sound})`;
  if (midi > (SOUND_TOPS[sound!] ?? 127)) return `bar ${c}: note ${v.note} above ${sound}'s top`;
  return undefined;
}
