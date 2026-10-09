// Query a song's pattern bar by bar, so mini-notation, theory and
// sound-name errors show up without audio.
// checkPattern(pattern, bars) -> { bars, haps, problems }

import { noteToMidi, type Hap, type Pattern } from '@strudel/core';
import { GM_SOUNDS } from './gm-sounds.ts';
import { KITS, SOUND_TOPS } from '../src/engine';

const BANKS = new Set(KITS.map(([kit]) => kit).filter(Boolean));
const DRUMS = new Set(['bd', 'sd', 'hh', 'oh', 'rd', 'cr', 'rim', 'cp', 'lt', 'mt', 'ht', 'sh', 'tb', 'cb', 'white']);
// Synths Strudel registers (registerSynthSounds): oscillators and noise.
const SYNTHS = new Set(['sine', 'square', 'triangle', 'sawtooth', 'supersaw', 'pulse', 'white', 'pink', 'brown']);

export function checkPattern(pattern: Pattern, bars: number): { bars: number; haps: number; problems: string[] } {
  const problems = new Set<string>();
  let haps = 0;
  // Strudel logs query errors and warnings instead of throwing them.
  const log = console.log;
  console.log = (...args: unknown[]) => {
    const text = args.join(' ');
    if (/error|warn|unknown/i.test(text)) problems.add(text.replace(/%c/g, '').trim());
    else log(...args);
  };
  try {
    queryAll();
  } finally {
    console.log = log;
  }
  return { bars, haps, problems: [...problems] };

  function queryAll() {
    for (let c = 0; c < bars; c++) {
      for (const hap of pattern.queryArc(c, c + 1) as unknown as Hap[]) {
        haps++;
        const v = hap.value;
        const sound = v.s ?? v.sound;
        if (sound && !DRUMS.has(sound) && !GM_SOUNDS.has(sound) && !SYNTHS.has(sound))
          problems.add(`unknown sound "${sound}"`);
        if (v.bank && !BANKS.has(v.bank)) problems.add(`unknown drum kit "${v.bank}"`);
        if (v.note !== undefined) {
          const midi = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
          if (!Number.isFinite(midi)) problems.add(`bar ${c}: bad note ${v.note}`);
          else if (midi < 23 || midi > 100) problems.add(`bar ${c}: note ${v.note} out of range (${sound})`);
          else if (midi > (SOUND_TOPS[sound] ?? 127)) problems.add(`bar ${c}: note ${v.note} above ${sound}'s top`);
        } else if (v.n !== undefined && sound && !DRUMS.has(sound)) {
          problems.add(`bar ${c}: ${sound} has n but no note`);
        }
      }
    }
  }
}
